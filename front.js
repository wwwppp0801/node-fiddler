var config=require("./config");
var log = require("./log").instance;
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
    var express = require('express');
    var app = express();
    app.use(express.static("./static"));
    app.use(express.static("./bower_components"));
    app.engine('jade', require('jade').__express);
    app.get('/', function(req, res){
        //res.send('hello world');
        res.render('index.jade');
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
