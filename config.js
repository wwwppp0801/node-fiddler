var fs=require("fs");
exports.watch=function(){
    fs.watchFile(__dirname+'/config.json', function (curr, prev) {
        reload_config();
    });
};
exports.unwatch=function(){
    fs.unwatchFile(__dirname+'/config.json');
};
function reload_config(){
    var config_json=fs.readFileSync(__dirname+"/config.json",{encoding:'utf-8'});
    try{
        var config=(eval(config_json));
    }catch(e){
        log.error(e);
        return;
    }
    for(var c in config){
        exports[c]=config[c];
    }

    config.hosts.forEach(function(host){
        exports.DNSCache[host[0]]={addresses:[host[1]]};
    });
}
exports.addDNSCache=function(host,ip){
   exports.DNSCache[hosts]={addresses:[ip]};
};
exports.delDNSCache=function(host){
   delete  exports.DNSCache[hosts];
};
exports.DNSCache={};
reload_config();
