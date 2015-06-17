"use strict";
var net = require("net");
var util=require("util");
var URL=require("url");
var DNS=require("dns");
var tls = require('tls');
var fs = require('fs');
var log = require("./log").instance;
var optparser = require("./optparser");
var BufferManager=require('./buffermanager').BufferManager;
var local_request=require('./request').local_request;
var remote_response=require('./response').remote_response;
var dataLogger=require('./front').dataLogger;
var config=require("./config");
var matchAutoResponder=require("./auto_responder").matchAutoResponder;

var SERVER_CMD_START=[0x00,0x01];
var SERVER_CMD_END=[0xfe,0xff];
var DNSCache=config.DNSCache;
//DNSCache['www.baidu.com']={addresses:['127.0.0.1']};

var httpsOptions = {
  key: fs.readFileSync('server-key.pem'),
  cert: fs.readFileSync('server-cert.pem'),

  // This is necessary only if using the client certificate authentication.
  //requestCert: false,

  // This is necessary only if the client uses the self-signed certificate.
  //ca: [ fs.readFileSync('server-cert.pem') ]
};

function connectTo(socket,hostname,port){
    if(net.isIP(hostname)){
        socket.connect(port,hostname);
    }else{
        if(typeof DNSCache[hostname]!='undefined'){
            hostname=DNSCache[hostname].addresses[0];
            socket.connect(port,hostname);
        }else{
            DNS.resolve4(hostname,function(err,addresses){
                if (err) {
                    //throw new Error(hostname+" can't be resolved to ip");
                    //close remote socket
                    //clean_remote_socket(socket);
                    return;
                }
                DNSCache[hostname]={addresses:addresses};
                socket.connect(port,addresses[0]);
            });
        }
    }
}
var remote_connection_pool={};
function get_cached_remote_connection(url){
    var key=url.hostname+":"+(url.port?url.port:80);
    if(!remote_connection_pool[key]){
        return false;
    }else{
        log.debug("re use keepalive connection: "+key);
        return remote_connection_pool[key].pop();
    }
}
function release_connection(remote_socket){
    var url=remote_socket.url;
    var key=url.hostname+":"+(url.port?url.port:80);
    if(typeof(remote_connection_pool[key])=='undefined'){
        remote_connection_pool[key]=[];
    }
    log.debug("release keepalive connection: "+key);
    remote_connection_pool[key].push(remote_socket);
}
function delete_from_connection_pool(remote_socket){
    var k,i,tmp;
    for(k in remote_connection_pool){
        tmp=[];
        for(i=0;i<remote_connection_pool[k].length;i++){
            if(remote_connection_pool[k][i]!==remote_socket){
                tmp.push(remote_connection_pool[k][i]);
            }else{
                log.debug("delete remote connection from pool");
            }
        }
        remote_connection_pool[k]=tmp;
    }
}

function create_remote_connecton(request,socket,netType) {
    var url=request.getUrl();
    var port;
    if(!url.port){
        if(url.protocol=='https:'){
            port=443;
        }else{
            port=80;
        }
    }else{
        port=url.port;
    }
    var hostname= url.hostname;
    if(request.getMethod()=='CONNECT'&&port=='443'&&config.delegate_https_hosts.indexOf(hostname)!=-1){
        log.debug("delegate https request to 127.0.0.1");
        hostname=config.listen_host;
        port=config.listen_https_port;
    }
    //console.log(url);
    var remote_socket;
    //socket = net.createConnection(port, hostname);
    if(remote_socket=get_cached_remote_connection(url)){
        remote_socket.socket=socket;
        remote_socket.request=request;
        log.debug("restore remote connection from pool");
        remote_socket_on_connect.apply(remote_socket);
        log.debug("write to cached connection:"+remote_socket.request.getUrl().href);
        return remote_socket;
    }
    remote_socket = new net.Socket();

    if(netType===tls){
        var options={
            isServer:false,
            key: httpsOptions.key,
            cert: httpsOptions.cert
        }
        remote_socket=new tls.TLSSocket(remote_socket, options);
        remote_socket.isTLS=true;
    }
    remote_socket.request=request;
    remote_socket.socket=socket;

    try{
        connectTo(remote_socket,hostname,port);
    }catch(e){
        log.error("remote connection fail:"+e);
    }
    remote_socket.url=url;
    if(netType===tls){
        remote_socket.on("secureConnection", function() {
            log.debug("secure connect successful: " + hostname + ":" + port);
        });
        remote_socket.on("clientError", function(e) {
            log.error("secure connection error: " + hostname + ":" + port+"  "+e);
            clean_remote_socket(this);
            clean_client_socket(this.socket);
        });
    }else{
        remote_socket.on("connect", function() {
            log.debug("connect successful: " + hostname + ":" + port);
        });
    }

    remote_socket.on("error", function(e) {
        log.error("connection error: " + hostname + ":" + port+"  "+e);
        clean_remote_socket(this);
        clean_client_socket(this.socket);
    });
    var response;
    remote_socket.on('data',function(buf){
        log.debug("recv remote data length:"+buf.length+":"+this.request.getUrl().href);
        if(!this.bm){
            this.bm=new BufferManager();
        }
        var bm=this.bm;
        try{
            this.socket.write(buf);
        }catch(e){
            this.destroy();
            this.socket.destroy();
        }
        bm.add(buf);
        if(!response){
            response=remote_response(bm);
        }
        if(response){
            dataLogger.data(this.request,"responseCode",response.getResponseCode());
        }
        if(response 
            && response.getResponseCode()<200//100－199都是报状态的，响应还没结束
            && response.getResponseCode()>=100
            ){
            log.debug("recv 1xx response:"+response.getResponseCode());
            response=false;
            return;
        }

        if(response 
            && response.responseIsEnd(bm) 
            ){
            dataLogger.data(this.request,"responseHeader",response.getRawHeader());
            //dataLogger.data(this.request,"response",response.getBody().toString());
            dataLogger.data(this.request,"responseType",response.getContentType());
            /*
            if(response.isText()){
                dataLogger.data(this.request,"response",response.getBody().toString());
            }else{
                var filename=dataLogger.newfile(this.request,response);
                dataLogger.data(this.request,"response",filename);
            }*/
            dataLogger.data(this.request,"response",response.getBody().toString());
            log.debug("response end:"+response.getResponseCode()+":"+this.request.getUrl().href);

            if(response.isKeepAlive()){
                release_connection(this);
            }
            response=false;
            bm.clear();
            delete this.bm;
        }
    });
    remote_socket.on("close",function(had_error){
        log.debug("remote connection has been closed");
        if (had_error) {
            this.destroy();
        }
        clean_remote_socket(this);
        clean_client_socket(this.socket);
    });
    remote_socket.once("connect",remote_socket_on_connect);
    function remote_socket_on_connect(){
        try{
            log.debug("remote connection established");
            log.debug("send:\n"+this.request.getSendHeader());
            this.write(this.request.getSendHeader());
            this.write(this.request.getBody());
        }catch(e){
            clean_remote_socket(remote_socket);
            log.error("can't write to cached connection");
            log.error(e);
            //throw e;
        }
    }
    return remote_socket;
}

function clean_remote_socket(remote_socket) {
    delete_from_connection_pool(remote_socket);
    if(!remote_socket){
        return;
    }
    remote_socket.removeAllListeners("data");
    remote_socket.removeAllListeners("error");
    remote_socket.removeAllListeners("close");
    remote_socket.removeAllListeners("connect");
    delete remote_socket.bm;
    if(remote_socket.socket){
        delete remote_socket.socket.remote_socket;
        clean_client_socket(remote_socket.socket);
        delete remote_socket.socket;
    }
    remote_socket.end();
    remote_socket.destroy();
}

function clean_client_socket(socket) {
    if(!socket){
        return;
    }
    socket.removeAllListeners("data");
    socket.removeAllListeners("error");
    socket.removeAllListeners("close");
    socket.removeAllListeners("connect");
    delete socket.bm;
    if(socket.remote_socket){
        delete socket.remote_socket.socket;
        clean_remote_socket(socket.remote_socket);
        delete socket.remote_socket;
    }
    socket.end();
    socket.destroy();
}





function createServerCallbackFunc(netType){//netType is tls or net
    return function(socket) {
        //socket.on("connect", function() {
        if(netType===tls){
            socket.isTLS=true;
        }


        log.debug("local connection established: " + socket.remoteAddress);
        //});
        socket.on("end", function() {
            log.debug("local connection closed: " + this.remoteAddress);
            clean_client_socket(this);
            //log.debug("client end " + this.remoteAddress);
        });
        socket.on("data", function(buf) {
            log.debug("recievied local length: "+buf.length);
            if(!this.bm){
                var bm=this.bm=new BufferManager();
            }else{
                var bm=this.bm;
            }
            bm.add(buf);

            var request=local_request(bm,netType);


            if(request===null){
                log.debug("not full request");
                return;
            }

            if(request){
                log.debug("recieve:"+request.getUrl().href);
                if(request.getMethod()!="CONNECT"){
                    //透传的请求就不用往下走了
                    dataLogger.data(request,"url",request.getUrl().href);
                    dataLogger.data(request,"requestHeader",request.getSendHeader());
                    dataLogger.data(request,"curl",request.getCurlCmd());
                }
                if(matchAutoResponder(request,socket)===true){
                    return;
                }
            }

            var remote_socket=this.remote_socket=create_remote_connecton(request,socket,netType);
            
            if(request&&request.getMethod()=='CONNECT'){
                remote_socket.removeAllListeners("connect");
                remote_socket.removeAllListeners("data");
                log.debug("http connect, create http channel");
                remote_socket.on("connect",function(){
                    socket.removeAllListeners("data");
                    socket.write('HTTP/1.1 200 Connection Established\r\n' +
                            'Proxy-agent: Node-Proxy\r\n' +
                            '\r\n');
                    remote_socket.write(bm.toBuffer());
                    remote_socket.pipe(socket);
                    socket.pipe(remote_socket);
                });
                remote_socket.on("error", function() {
                    clean_client_socket(this);
                    log.error("connect http channel error");
                });
            }
            
        });
        
        socket.on("close", function() {
            clean_client_socket(this);
            log.debug("local connection closed: " + this.remoteAddress);
        });
        socket.on("error", function() {
            clean_client_socket(this);
            log.error("client error");
        });
    }
}

exports.start=function(){
    var httpServer=net.createServer(
        createServerCallbackFunc(net)
    );
    httpServer.maxConnections=config.max_connections;
    httpServer.listen(config.listen_port,config.listen_host);



    var httpsServer=tls.createServer(httpsOptions,
        createServerCallbackFunc(tls)
    );
    httpsServer.maxConnections=config.max_connections;
    httpsServer.listen(config.listen_https_port,config.listen_host);

    console.log("config:     "+__dirname+"/config.json");
    console.log("proxy:      "+config.listen_host+":"+config.listen_port);
    console.log("frontend:   http://"+config.listen_host+":"+config.listen_config_port);
}
exports.on=function(ev,listener){
    if(ev=='data'){
        dataLogger.on("data",listener);
    }
};
///////////http config server/////////////////////
