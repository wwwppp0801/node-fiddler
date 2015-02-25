# node-fiddler

- 这是node写的http代理
- 基于socket，纯手工编写，支持keep-alive, chunked等功能
- 可以实现fiddler的auto\_responder功能(就是将某个请求用本地文件返回)
- 可以实现类似改hosts文件的功能
- 可以实现https的反向代理和内容劫持，但用的是不合法证书（可以用自己的合法证书替换）
- 实现了http的connect方法

# config.json介绍
- 可以在proxy启动的状态下，改变config.json文件的内容，会自动生效
```javascript
({
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
        
        ["http://s1.bdstatic.com/r/www/cache/static/global/js/all_async_popstate_40a67976.js","{_}",function(code){
            code+=";alert('testtest');";
            return code;
        }],
        
    ],
})

```

# 使用方法

```bash
node httpproxy.js
```


# 尚未解决的已知问题

- <del>没有实现multipart/form-data，上传文件可能会有问题</del>
- <del>没有实现https协议的代理</del>
