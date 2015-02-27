
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
})
.controller("MainMenu",['$scope',function($scope){
    $scope.setTab=function(view){
        $scope.view=view;
    }
}])
.controller("RequestListCtrl",["$scope","socket",function ($scope,socket) {
    //socket.emit('aaa', "data");
    socket.on("data",function(data){
        mergeData(data);
        //$("<li/>").html(data.data).appendTo("#messages");
    });
    $scope.requests=[]; 
    $scope.clear=function(){
        $scope.requests=[]; 
    };
    $scope.setActive=function(id){
        $scope.requests.forEach(function(request){
            if(request.id==id){
                request.active=true;
                $scope.activeRequest=request;
            }else{
                delete request.active;
            }
        });
    };

    $scope.setDetailView=function(detailView){
        $scope.detailView=detailView;
    };

    function mergeData(data){
        var list=$scope.requests,flag=false;
        list.forEach(function(request){
            if(request.id==data.id){
                request[data.type]=data.data;
                flag=true;
            }
        });
        if(!flag){
            var request={id:data.id};
            request[data.type]=data.data;
            list.push(request);
        }
    }
}]);
