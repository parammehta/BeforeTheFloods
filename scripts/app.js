(function () {

'use strict';

  angular.module('d3App', ['ngRoute'])

  .constant('myConstants',{
    'weatherURL':'http://api.openweathermap.org',
    'appid':'dd1e70fef626370ab142309e1ea51374',

  })

  .config(['$routeProvider','$httpProvider',function($routeProvider,$httpProvider) {
      // routes
      $routeProvider
        .when("/", {
          templateUrl: "partials/weather.html",
          controller: "weatherController"
        })
        .when("/pollutionIndex", {
          templateUrl: "partials/pollutionIndex.html",
          controller: "pullutionIndexController"
        })
        .otherwise({
           redirectTo: '/'
        });

      $httpProvider.interceptors.push(function ($q, $rootScope, $location) {
            return {
                'responseError': function(rejection) {
                    console.log(rejection);
                    var status = rejection.status;
                    var config = rejection.config;
                    var method = config.method;
                    var url = config.url;
                    console.log("The Entire thing");
                    console.log(rejection);
                    console.log("navigator.onLine - "+navigator.onLine);
                    console.log("status is - "+status);
                    console.log("Config is - "+config);
                    console.log("Method is - "+method);
                    console.log("Url is  - "+url);
                    if($("#loader").is(":visible")){
                      $("#loader").hide();
                    }
                    if(!navigator.onLine){
                      console.log("offline");
                      // alert("Error! Unable to fetch data. Please check internet connectivity.");
                      rejection.message = "offline";
                    }
                    else if(status == 500) {
                      console.log("internal server error");
                      // alert("Error! Unable to fetch data. There's a server error.");
                      rejection.message = "Internal Server Error";
                    }
                    else if(status == 404){
                      console.log("internal server error");
                      // alert("Error! API not found on server. Incorrect route.");
                      rejection.message = "Not found";
                    } else if(status == 403){
                      // alert("Error! Please check internet connectivity or contact administrator.");
                      console.log("403 error");
                      rejection.message = "403 error";
                    }else if (status == 302) {
                      console.log("Need to redirect to another");
                    } else{
                      rejection.message = "Unknown error";
                    }
                    return $q.reject(rejection);
                }
            };
        });

      //Enable cross domain calls
      $httpProvider.defaults.useXDomain = true;

      //Remove the header used to identify ajax call  that would prevent CORS from working
      delete $httpProvider.defaults.headers.common['X-Requested-With'];

  }])
  .run(['$rootScope', '$location', 'activeData', function ($rootScope, $location) {
    $rootScope.$on('$routeChangeStart', function (event){

    });
  }]);

}());
