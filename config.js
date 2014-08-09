var config={
    'listen_host':'127.0.0.1',
    'listen_port':'8083',
    'max_connections':1000,
    'hosts':[
//        ['www.baidu.com','127.0.0.1'],
    ],
    'auto_responder':[
        ['http://www.baidu.com/','test.html'],
        [/^http:\/\/www\.baidu\.com\/s/,'testresult.html'],
    ],
};
for(var c in config){
    exports[c]=config[c];
}
