"use strict;"
var get_content_type=require("./content_type").get;
var fs = require('fs');
var http = require('http');
var config=require("./config");
var log = require("./log").instance;
var CRLF = "\r\n";
var URL=require("url");
var dataLogger=require('./front').dataLogger;


function format(string,args){
    if (!args){ 
        return string;
    }   

    var str = string;
    for (var key in args) {
        if (args.hasOwnProperty(key)) {
            var re = new RegExp('\\{' + key + '\\}', 'gm');
            str = str.replace(re, args[key]);
        }   
    }   
    return str;
};

function matchAutoResponder(request,socket){
    var rules=config.auto_responder;   
    var url=request.getUrl();
    var filename;
    var i;
    var matched;
    for(i=0;i<rules.length;i++){
        var rule=rules[i];
        if(rule[0]===url.href){
            filename=rule[1];
            matched=[url.href];
            break;
        }

        if(rule[0] instanceof RegExp && (matched=url.href.match(rule[0]))){
            filename=rule[1];
            break;
        }
    }

    if(filename){
        dataLogger.data(request,"matchAutoResponder",filename);
        var file=processFilename(filename,matched);

        return strategy[file.schema](file,socket,request,rule[2]);

        //return true;
    }
}


var strategy={
    "file":function (file,socket,request,callback){
        var stat;
        try{
            stat=fs.lstatSync(file.name);
        }catch(e){
            log.error("stat error:"+e);
        }
        if(!stat){
            return;
        }
        if(!stat.isFile()){
            log.error("file:'"+file.name+"' is not file");
            return;
        }
        var responseHeader=['HTTP/1.1 200 OK',
                'Content-Type: '+get_content_type(file.name),
                'Cache-Control: private',
                'Content-Length: '+stat.size].join(CRLF)+CRLF+CRLF;
        socket.write(responseHeader);
        dataLogger.data(request,"responseHeader",responseHeader);

        if(typeof callback=='function'){
            var content=fs.readFileSync(filename, {encoding:'utf-8'});
            content=callback(content);
            dataLogger.data(request,"response",content);
            socket.write(content);
        }else{
            fs.readFile(file.name,function(err,data){
                if (err) throw err;
                dataLogger.data(request,"response",data);
                socket.write(data);
            });
        }
        return true;
    },
    'http':function(file,socket,request,callback){
        //var url=request.getUrl();
        log.info('request http: ' + JSON.stringify(file));
        var url=URL.parse(file.name);       
        var headers={};
        if(request.getHeader("Cookie")){
            headers.cookie=request.getHeader("Cookie");
        }
        if(request.getHeader("Referer")){
            headers.referer=request.getHeader("Referer");
        }
        if(request.getHeader("User-Agent")){
            headers['user-agent']=request.getHeader("User-Agent");
        }
        if(request.getHeader("Host")){
            headers['host']=request.getHeader("Host");
        }
        var options = {
            headers:headers,
            hostname: url.host.replace(/:[0-9]+$/,""),
            port: url.port?url.port:80,
            path: url.pathname+(url.search?url.search:""),
            method: request.getMethod()
        };
        log.info('options: ' + JSON.stringify(options));

        var req = http.request(options, function(res) {
            log.info('STATUS: ' + res.statusCode);
            log.info('HEADERS: ' + JSON.stringify(res.headers));
            res.setEncoding('utf8');
            var bm=new BufferManager();
            res.on('data', function (chunk) {
                //console.log('BODY: ' + chunk);
                bm.add(chunk);
            });

            socket.on("end", function() {
                //client aborted
                socket.is_end=true;
            });
            function send_to_local(){
                log.info("send to local");
                var data=bm.slice(0);
                if(typeof callback=='function'){
                    data=new Buffer(callback(data.toString('utf-8')));
                }
                if(!socket.is_end){
                    socket.write(['HTTP/1.1 200 OK',
                            'Content-Type: '+res.headers['content-type'],//get_content_type(file.name),
                            'Cache-Control: private',
                            'Content-Length: '+data.length].join(CRLF)+CRLF+CRLF);
                    socket.write(data);
                }
                ///TODO  should tell dataLogger, if socket.is_end
                dataLogger.data(request,"responseHeader",JSON.stringify(res.headers));
                dataLogger.data(request,"response",data);
            }
            res.on("end",send_to_local);
            res.on("close",function(){
                socket.end();
                socket.destroy();
            });
        });

        req.on('error', function(e) {
            log.error('problem with request: ' + e.message);
        });

        // write data to request body
        req.write(request.getBody());
        req.end();
        return true;
    }
};

function processFilename(filename,matched){
    var args={
        'pwd':process.cwd(),
        '_':matched[0],
    };
    for(var i=1;i<matched.length;i++){
        args[i]=matched[i];
    }
    filename=format(filename,args);

    log.info("replaced filename: "+filename+ "  "+JSON.stringify(args));


    var schema=filename.match(/^([a-z]+):/);
    if(!schema){
        schema="file";
    } else {
        schema=schema[1];
        if(schema=='file'){
            filename=filename.replace(/^([a-z]+):/,"");
        }
    }
    return {
        'schema':schema,
        'name':filename
    };


}
exports.matchAutoResponder=matchAutoResponder;
