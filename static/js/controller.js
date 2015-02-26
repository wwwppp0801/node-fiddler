angular.module("fiddler",[]).factory('socket', function ($rootScope) {
    var socket = io();
    return {
        on: function (eventName, callback) {
            socket.on(eventName, function () {  
                var args = arguments;
                $rootScope.$apply(function () {
                    callback.apply(socket, args);
                });
            });
        },
        emit: function (eventName, data, callback) {
            socket.emit(eventName, data, function () {
                var args = arguments;
                $rootScope.$apply(function () {
                    if (callback) {
                        callback.apply(socket, args);
                    }
                });
            })
        }
    };
}).controller("RequestListCtrl",function ($scope,socket) {
    //socket.emit('aaa', "data");
    socket.on("data",function(data){
        mergeData(data);
        //$("<li/>").html(data.data).appendTo("#messages");
    });
    $scope.requests=[]; 
    $scope.clear=function(){
        $scope.requests=[]; 
    };

    function mergeData(data){
        var list=$scope.requests;
        list.forEach(function(request){
            if(request.id==data.id){
                request[data.type]=data.data;
                data=null;
            }
        });
        if(data){
            var request={id:data.id};
            request[data.type]=data.data;
            list.push(request);
        }
    }
});
