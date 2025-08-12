const fs = require("fs");
let configWatcher = null;

exports.watch=function(){
    if (configWatcher) {
        configWatcher.close();
    }
    try {
        configWatcher = fs.watch(__dirname+'/config.json', function (eventType, filename) {
            if (eventType === 'change') {
                // Add small delay to ensure file write is complete
                setTimeout(reload_config, 100);
            }
        });
    } catch (err) {
        console.error('Error watching config file:', err);
        // Fallback to watchFile if fs.watch fails
        fs.watchFile(__dirname+'/config.json', function (curr, prev) {
            reload_config();
        });
    }
};
exports.unwatch=function(){
    if (configWatcher) {
        configWatcher.close();
        configWatcher = null;
    } else {
        fs.unwatchFile(__dirname+'/config.json');
    }
};
function reload_config(){
    const config_json = fs.readFileSync(__dirname+"/config.json",{encoding:'utf-8'});
    try{
        // Safely parse JavaScript object literal using safer evaluation
        // Remove comments and wrap in parentheses for safer parsing
        const cleanedJson = config_json
            .replace(/\/\/.*$/gm, '') // Remove single line comments
            .replace(/\/\*[\s\S]*?\*\//gm, '') // Remove multi-line comments
            .trim();
        
        // Use Function constructor instead of eval for better security
        const config = (new Function('return ' + cleanedJson))();
        
        for(const c in config){
            exports[c] = config[c];
        }

        if (config.hosts) {
            config.hosts.forEach(function(host){
                exports.DNSCache[host[0]] = {addresses:[host[1]]};
            });
        }
    }catch(e){
        const log = require("./log").instance;
        log.error('Error parsing config.json:', e);
        return;
    }
}
exports.addDNSCache=function(host,ip){
   exports.DNSCache[hosts]={addresses:[ip]};
};
exports.delDNSCache=function(host){
   delete  exports.DNSCache[hosts];
};
exports.DNSCache={};
reload_config();
