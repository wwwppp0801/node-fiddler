
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
    $scope.setActive=function(_request){
        $scope.requests.forEach(function(request){
            if(request===_request){
                request.active=true;
                $scope.activeRequest=request;
            }else{
                delete request.active;
            }
        });
    };
    $(window).on("keydown",function(e){
        $scope.$apply(function (){
            var request=$scope.activeRequest;
            var index=$scope.requests.indexOf(request);
            if(index==-1){
                $scope.setActive($scope.requests[0]);
                return;
            }
            if(e.keyCode == 40 && index<$scope.requests.length-1){
                e.preventDefault();
                $scope.setActive($scope.requests[index+1]);
                var elem=$("#"+request.id).get(0);
                if(elem){
                    elem.scrollIntoView();
                }
            }
            if(e.keyCode == 38 && index>0){
                e.preventDefault();
                $scope.setActive($scope.requests[index-1]);
                var elem=$("#"+request.id).get(0);
                if(elem){
                    elem.scrollIntoView();
                }
            }
        });
    });

    $scope.setDetailView=function(detailView){
        $scope.detailView=detailView;
    };

    function mergeData(data){
        var list=$scope.requests,flag;
        flag=list.every(function(request){
            if(request.id==data.id){
                request[data.type]=data.data;
                return false;
            }
            return true;
        });
        if(flag){
            var request={id:data.id};
            request[data.type]=data.data;
            list.push(request);
        }
    }
}]);
