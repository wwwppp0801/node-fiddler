var config={
    'listen_host':'127.0.0.1',
    'listen_port':'8083',
    'max_connections':1000,
    'hosts':[
//        ['www.baidu.com','127.0.0.1'],
    ],
    'auto_responder':[
        ['http://www.baidu.com/','file:test.html'],
        //['http://www.baidu.com/','http://127.0.0.1/'],
        //[/^http:\/\/www\.baidu\.com\/s/,'testresult.html'],
        //[/^http:\/\/www\.baidu\.com\/s/,'testresult.html'],
        //替换成和query同名的文件
        //[/^http:\/\/www\.baidu\.com\/s?.*wd=(\w+)/,'file:{1}.html'],
        //替换目录
        //[/^http:\/\/m1-ps-wwwui0-j10\.m1\.baidu\.com:8090\/cache/(.*)/,'file:{pwd}/cache/{1}'],
        //全部替换成wd=qq
        [/^http:\/\/www\.baidu\.com\/s/,'{_}?wd=qq'],
        //高级功能，走回调
        /*
        [/^http:\/\/www\.baidu\.com\/s/,function(url){
            
        }],
        */
    ],
};
for(var c in config){
    exports[c]=config[c];
}
