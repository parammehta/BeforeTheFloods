(function() {

    'use strict';

    //Load controller
    angular.module('d3App').factory('serviceCall', function($http) {

        var url = {};

        // constructor to set up certain defaults

        function serviceCall(serviceName, callMethod) {
            /*jshint validthis: true */

            this.url = {
                domain: localStorage.baseURL,
                method: callMethod,
                name: serviceName
            };
        }

        serviceCall.prototype.call = function(payload, successCallback, errorCallback) {
            var params = JSON.parse(payload);
            var serviceURL;
            serviceURL = params.url;
            if (this.url.method === "POST") {
                serviceURL = mockURL || this.url.domain + "/rest/activities/" + this.url.name + "/" + params.activityInstanceID + "?pin=" + localStorage.surveyAppPin;

                $http({
                    method: this.url.method,
                    url: serviceURL,
                    data: params,
                    headers: {
                        'Content-Type': 'application/json',
                        'version': version,
                        'TimeZone-Offset': n
                    },
                    timeout: 5000,
                }).
                success(function(data, status, headers, config) {
                    console.log(headers());
                    successCallback(data, status, headers, config);
                }).
                error(function(data, status, headers, config) {
                    console.log("Service Call Errors");
                    console.log(data);
                    console.log(status);
                    console.log(headers);
                    console.log(config);
                    errorCallback(data, status, headers, config);
                });
            } else {
                $http({
                    method: this.url.method,
                    url: serviceURL,
                    headers: {
                        'Content-Type': 'text/plain'
                    },
                    timeout: 5000,
                }).
                success(function(data, status, headers, config) {
                    console.log(headers());
                    successCallback(data, status, headers, config);
                }).
                error(function(data, status, headers, config) {
                    console.log("Service Call Errors");
                    console.log(data);
                    console.log(status);
                    console.log(config);
                    errorCallback(data, status, headers, config);
                });
            }

        };

        return serviceCall;
    });

})();
