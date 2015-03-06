var config=require("./config");
var log = require("./log").instance;
var fs=require("fs");
exports.dataLogger=(function(){
    var createUUID = (function (uuidRegEx, uuidReplacer) { 
        return function () { 
            return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(uuidRegEx, uuidReplacer).toUpperCase(); 
        }; 
    })(/[xy]/g, function (c) { 
        var r = Math.random() * 16 | 0, 
        v = c == "x" ? r : (r & 3 | 8); 
        return v.toString(16); 
    });
    return {
        data:function(request,type,data){
            if(!request.LogId){
                request.LogId=createUUID();
            }
            sockets.forEach(function(s){
                s.emit("data",{id:request.LogId,type:type,data:data});
            });
        }
    }
})();
var sockets=[];
(function(){
    Object.prototype.Clone = function(){
        var objClone;
        if ( this.constructor == Object ) objClone = new this.constructor(); 
        else objClone = new this.constructor(this.valueOf()); 
        for ( var key in this ){
            if ( objClone[key] != this[key] ){ 
                if ( typeof(this[key]) == 'object' ){ 
                    objClone[key] = this[key].Clone();
                }
                else {
                    objClone[key] = this[key];
                }
            }
        }
        objClone.toString = this.toString;
        objClone.valueOf = this.valueOf;
        return objClone; 
    };



    var express = require('express');
    var app = express();
    
    //not to upload file
    var bodyParser = require('body-parser')
    app.use(bodyParser.json());       // to support JSON-encoded bodies
    app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
        extended: true
    }));

    //connect-multiparty

    app.use(express.static("./static"));
    app.use(express.static("./bower_components"));
    app.engine('jade', require('jade').__express);
    app.locals.pretty=true;
    app.get('/', function(req, res){
        //res.send('hello world');
        res.render('index.jade');
    });
    app.get('/template/:template', function(req, res){
        //res.send('hello world');
        res.render(req.params.template+'.jade');
    });
    app.get('/config',function(req,res){
        res.send(JSON.stringify({"hosts":config.hosts,"delegate_https_hosts":config.delegate_https_hosts,"auto_responder":stringify_regexp(config.auto_responder)}));
    });
    
    if(!fs.existsSync('tmp')){
        fs.mkdirSync("tmp");
    }
    var multipart = require('connect-multiparty');
    app.post('/upload', multipart({uploadDir:'tmp'}), function(req, res) {
        fs.renameSync(req.files.file.path, "tmp/"+req.files.file.originalFilename);
        res.append('Content-Type', 'application/json');
        res.send(JSON.stringify({body:req.body, files:req.files}));
        // don't forget to delete all req.files when done 
    });

    app.get('/upload/delete/:file',function(req,res){
        try{
            var realpath=fs.realpathSync("tmp/"+req.params.file);
            var cwd=process.cwd()+"/tmp/";
            if(realpath.indexOf(cwd)==0){
                fs.unlinkSync(realpath);
            }
        }catch(e){}
        res.append('Content-Type', 'application/json');
        res.send(JSON.stringify({msg:"delete ok",'status':0}));
    });
    function stringify_regexp(rules){
        rules=rules.Clone();
        rules.forEach(function(rule){
            rule.forEach(function(v,i){
                if(v instanceof RegExp){
                    rule[i]="RegExp:"+v.toString();
                }
            });
        });
        return rules;
    }
    app.get("/deleterule/:file",function(req,res){
        config.auto_responder=config.auto_responder.filter(function(rule){
            return rule[0].toString()!=req.params.file;
        });
        res.append('Content-Type', 'application/json');
        res.send(JSON.stringify({rules:stringify_regexp(config.auto_responder),msg:"add autoResponder ok",'status':0}));
    });
    
    app.get('/tmpfilelist',function(req,res){
        var files=fs.readdirSync("tmp").filter(function(file){
            return file!='.' && file!='..';
        });
        res.append('Content-Type', 'application/json');
        res.send(JSON.stringify(files));
    });

    app.post('/config/hosts/add',function(req,res){
        var host=req.body.host;
        var ip=req.body.ip;
        
        config.hosts=config.hosts.filter(function(_host){
            return _host[0]!=host;
        });
        config.hosts.push([host,ip]);

        res.append('Content-Type', 'application/json');
        res.send(JSON.stringify({msg:"add hosts ok",hosts:config.hosts,'status':0}));
    });
    app.post('/config/hosts/delete',function(req,res){
        var host=req.body.host;
        
        config.hosts=config.hosts.filter(function(_host){
            return _host[0]!=host;
        });

        res.append('Content-Type', 'application/json');
        res.send(JSON.stringify({msg:"add hosts ok",hosts:config.hosts,'status':0}));
    });

    app.post('/config/httpshosts/add',function(req,res){
        var host=req.body.host;
        config.delegate_https_hosts=config.delegate_https_hosts.filter(function(_host){
            return _host!=host;
        });
        config.delegate_https_hosts.push(host);
        res.append('Content-Type', 'application/json');
        res.send(JSON.stringify({msg:"add hosts ok",delegate_https_hosts:config.delegate_https_hosts,'status':0}));
    });
    
    app.post('/config/httpshosts/delete',function(req,res){
        var host=req.body.host;
        config.delegate_https_hosts=config.delegate_https_hosts.filter(function(_host){
            return _host!=host;
        });
        res.append('Content-Type', 'application/json');
        res.send(JSON.stringify({msg:"add hosts ok",delegate_https_hosts:config.delegate_https_hosts,'status':0}));
    });
    app.post("/config/autoResponder/add",function(req,res){
        var key=req.body.key;
        var value=req.body.value;
        if(req.body.keyType.toLocaleLowerCase()=='regexp'){
            key=new RegExp(key);
        }
        config.auto_responder=config.auto_responder.filter(function(rule){
            return rule[0].toString()!=key.toString();
        });
        config.auto_responder.push([key,value]);
        res.append('Content-Type', 'application/json');
        res.send(JSON.stringify({msg:"add autoResponder ok",rules:stringify_regexp(config.auto_responder),'status':0}));
    });
    var server = require('http').Server(app);
    var io = require('socket.io')(server);
    
    io.on('connection', function (socket) {
        //socket.emit('news', { hello: 'world' });
        log.info('a user connected');
        sockets.push(socket);
        socket.on('disconnect', function(){
            sockets=sockets.filter(function(s){
                return s!==socket;
            });
            log.info('user disconnected');
        });
    });

    server.listen(config.listen_config_port);
})();
