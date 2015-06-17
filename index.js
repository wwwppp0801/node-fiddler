proxy=require("./httpproxy.js");
proxy.on("data",function(eventData){
    if(eventData.type=='url'){
        console.log(eventData.data);
    }
});
proxy.start();
