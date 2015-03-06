
angular.module("fiddler",['ngRoute'])
.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider.
            when('/RequestListCtrl', {
                templateUrl: 'template/RequestList',
                controller: 'RequestListCtrl'
            }).
            when('/AutoResponderConfigCtrl', {
                templateUrl: 'template/AutoResponderConfig',
                controller: 'AutoResponderConfigCtrl'
            }).
            when('/OtherConfigCtrl', {
                templateUrl: 'template/OtherConfig',
                controller: 'OtherConfigCtrl'
            }).
            otherwise({
                redirectTo: '/RequestListCtrl'
            });
    }
])
.factory('socket', ["$rootScope",function ($rootScope) {
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
}])
.controller("MainMenu",['$scope','$location',function($scope,$location){
    $scope.init=function(){
        $scope.setTab($location.path().replace(/^[#\/]*/,"").replace(/Ctrl$/,""));
    };
    $scope.setTab=function(tab){
        $scope.curTab=tab;
    }
}])
.controller("OtherConfigCtrl",['$scope','$http',function($scope,$http){
    $scope.loadConfig=function(){
        $http.get('/config').success(function(data, status, headers, config) {
            $scope.delegate_https_hosts=data.delegate_https_hosts;
            $scope.hosts=data.hosts;
        });
    };
    $scope.submitAddHost=function($event){
        $.ajax({
            url:'/config/hosts/add',
            dataType:'json',
            type:"post",
            data:$($event.target).serialize()
        }).done(function(data){
            $scope.$apply(function(){
                $scope.hosts=data.hosts;
            });
        });
    };
    $scope.deleteHost=function(host){
        $.ajax({
            url:'/config/hosts/delete',
            dataType:'json',
            type:"post",
            data:{"host":host}
        }).done(function(data){
            $scope.$apply(function(){
                $scope.hosts=data.hosts;
            });
        });
    };
    $scope.submitAddHttpsHost=function($event){
        $.ajax({
            url:'/config/httpshosts/add',
            dataType:'json',
            type:"post",
            data:$($event.target).serialize()
        }).done(function(data){
            $scope.$apply(function(){
                $scope.delegate_https_hosts=data.delegate_https_hosts;
            });
        });
    };
    $scope.deleteHttpsHost=function(host){
        $.ajax({
            url:'/config/httpshosts/delete',
            dataType:'json',
            type:"post",
            data:{host:host}
        }).done(function(data){
            $scope.$apply(function(){
                $scope.delegate_https_hosts=data.delegate_https_hosts;
            });
        });
    };
}])
.controller("AutoResponderConfigCtrl",['$scope','$http','$location',function($scope,$http,$location){
    $scope.loadUrlParams=function(){
        $scope.form_url=$location.search().url;
    };
    $scope.loadTempFiles=function(){
        $http.get('/tmpfilelist').success(function(data, status, headers, config) {
            $scope.tempFiles=data;
        });
    };
    $scope.deletefile=function(file){
        $http.get('/upload/delete/'+encodeURIComponent(file)).success(function(data, status, headers, config) {
            $scope.loadTempFiles();
        });
    };

    $(".simple_file").find("iframe").each(function(i,e){
        var iframe=$(this);
        iframe.load(function(){
            iframe.contents().find("form").submit(function(e){
                e.stopPropagation();
                e.preventDefault();
                $(this).ajaxSubmit({
                    dataType:"json",
                    success:function(data){
                        $scope.$apply(function(){
                            $scope.loadTempFiles();
                        });
                    }
                });
                return false;
            });
        });
        iframe.attr("src","/simple_json_files_upload.html?"+Math.random());
    });
    $scope.loadConfig=function(){
        $http.get('/config').success(function(data, status, headers, config) {
            $scope.rules=data.auto_responder;
        });
    };
    $scope.deleterule=function(file){
        $http.get('/deleterule/'+encodeURIComponent(file)).success(function(data, status, headers, config) {
            $scope.rules=data.rules;
        });
    };
    $scope.submitAddRule=function($event){
        $.ajax({
            url:"/config/autoResponder/add",
            dataType:"json",
            data:$($event.target).serialize(),
            type:'post'
        }).done(function(data){
            $scope.$apply(function(data){
                //$scope.message="规则添加成功";
                $scope.loadConfig();
            });
        });
    };
}])
.controller("RequestListCtrl",["$scope","socket","$location",function ($scope,socket,$location) {
    //socket.emit('aaa', "data");
    $scope.addAutoResponderRule=function(url){
        $location.url("/AutoResponderConfigCtrl?url="+encodeURIComponent(url));
    }
    $scope.init=function(){
        function onResize(){
            $("#requests").height($(window).height()-$("#requests").offset().top-30);
            $("#activeRequestContainer").height($(window).height()-$("#activeRequestContainer").offset().top-30);
        }
        $(window).bind("resize",onResize);
        $scope.$on("$destroy",function(){
            $(window).unbind("resize",onResize);
        });
    };
    socket.on("data",function(data){
        mergeData(data);
        //$("<li/>").html(data.data).appendTo("#messages");
    });
    $scope.requests=[]; 
    $scope.activeRequest={};
    $scope.clear=function(){
        $scope.requests=[]; 
        $scope.activeRequest={};
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
    $scope.$on("$viewContentLoaded",function(){
      $(window).resize();
    });
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
