var get_content_type=require("./content_type").get;
var fs = require('fs');
var http = require('http');


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
    //log.info(url.href);
    var filename;
    var i;
    var matched;
    for(i=0;i<rules.length;i++){
        var rule=rules[i];
        if(rule[0]===url.href){
            filename=rule[1];
            matched=[filename];
            break;
        }

        if(rule[0] instanceof RegExp && (matched=url.href.match(rule[0]))){
            filename=rule[1];
            break;
        }
    }

    if(filename){
        var file=processFilename(filename,matched);

        return strategy[file.schema](file,socket,request);

        //return true;
    }
}


var strategy={
    "file":function (file,socket,request){
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
        socket.write(['HTTP/1.1 200 OK',
                'Content-Type: '+get_content_type(file.name),
                'Cache-Control: private',
                'Content-Length: '+stat.size].join(CRLF)+CRLF+CRLF);

        fs.readFile(file.name,function(err,data){
            if (err) throw err;
            socket.write(data);
        });
        return true;
    },
    'http':function(file,socket,request){
        //var url=request.getUrl();
        log.info('request http: ' + JSON.stringify(file));
        var url=URL.parse(file.name);       
        var options = {
            headers:{
                'cookie':request.getHeader("Cookie",""),
                'referer':request.getHeader("Referer",""),
                'user-agent': request.getHeader("User-Agent",""),
            },
            hostname: url.host,
            port: url.port?url.port:80,
            path: url.pathname+url.search,
            method: request.getMethod()
        };

        var req = http.request(options, function(res) {
            log.info('STATUS: ' + res.statusCode);
            log.info('HEADERS: ' + JSON.stringify(res.headers));
            res.setEncoding('utf8');
            var bm=new BufferManager();
            res.on('data', function (chunk) {
                //console.log('BODY: ' + chunk);
                bm.add(chunk);
            });
            res.on("end",function(){
                log.info("send to local");
                socket.write(['HTTP/1.1 200 OK',
                        'Content-Type: '+res.headers['content-type'],//get_content_type(file.name),
                        'Cache-Control: private',
                        'Content-Length: '+bm.size()].join(CRLF)+CRLF+CRLF);
                socket.write(bm.slice(0));
            });
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

    log.info("replaced filename: "+filename)


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
