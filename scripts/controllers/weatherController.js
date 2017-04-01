(function() {

    'use strict';
    // Load controller
    angular.module('d3App').controller('weatherController', ['$rootScope', '$scope', '$location', 'serviceCall', 'activeData', '$timeout', '$log', '$compile', 'myConstants', function($rootScope, $scope, $location, serviceCall, activeData, $timeout, $log, $compile, myConstants) {

            $scope.city = "tempe";
            $scope.controllerInit = function() {
                console.log('initialize');

            };

            $scope.getCurrentWeather = function(latitude, longitude) {
                var payloadForService = '{"url":"' + myConstants.weatherURL + '/data/2.5/weather?q=' + $scope.city + '&appid=' + myConstants.appid + '"}';
                var weatherCall = new serviceCall("weather", "GET");
                weatherCall.call(payloadForService, $scope.successCallback, $scope.errorCallback);
            }

            $scope.getFutureWeather = function(latitude, longitude) {
                var payloadForService = '{"url":"' + myConstants.weatherURL + '/data/2.5/forecast?lat=' + latitude + '&lon='+longitude+'&appid=' + myConstants.appid + '"}';
                var weatherCall = new serviceCall("weather", "GET");
                weatherCall.call(payloadForService, $scope.successCallback, $scope.errorCallback);
            }
            $scope.successCallback = function(data, status, headers, config) {
                console.log(data);
                // $log.info(status);
                // $log.info(headers);
                // $log.info(config);
                $scope.data = data;
            };
            $scope.errorCallback = function(data, status, headers, config) {
                $log.error("Data from error" + data);
                $log.error(status);
                $log.error(headers);
                $log.error(config);

            };

            $scope.populateCityDetails = function() {
                console.log($scope.latitude);
                console.log($scope.longitude);

                $('#weather').removeClass('hidden');

                $scope.getFutureWeather($scope.latitude,$scope.longitude);
                $scope.renderShit();
            }


            $scope.controllerInit();
        }])

        .directive('weatherVisualization', function() {

            return {
                restrict: 'E',
                terminal: true,
                link: function(scope, element, attrs) {
                     scope.renderVis = function() {
                       console.log(data);
                        var data = scope.data.list;
                        // Set the dimensions of the canvas / graph
                        var margin = {
                                top: 30,
                                right: 20,
                                bottom: 30,
                                left: 20
                            },
                            width = 650 - margin.left - margin.right,
                            height = 250 - margin.top - margin.bottom;

                        // Set the ranges
                        // var x = d3.time.scale().range([0, width]);
                        // var y = d3.scale.linear().range([height, 0]);
                        d3.select("svg").remove();
                        var svg = d3.select("#weatherDetail").append('svg')
                            .attr("width", width + margin.left + margin.right)
                            .attr("height", height + margin.top + margin.bottom)
                            .append("g")
                            .attr("transform",
                                "translate(" + margin.left + "," + margin.top + ")");

                        var parseTime = d3.timeParse("%d-%b-%y");
                        var lineData = [],
                            day = {};
                        var date = "";
                        data.forEach(function(d) {
                            //console.log(parseTime(date));
                            day = {
                                date: parseTime(new Date(d.dt_txt)),
                                temp: +d.main.temp
                            }
                            lineData.push(day);
                        });
                        console.log(lineData[0].date);
                        data = lineData;
                        var x = d3.scaleLinear().range([0, width]);
                        var y = d3.scaleLinear().range([height, 0]);

                        // define the line
                        var valueline = d3.line()
                            .x(function(d) {
                                return x(d.date);
                            })
                            .y(function(d) {
                                return y(d.temp);
                            });

                        // Scale the range of the data
                        x.domain(d3.extent(data, function(d) {
                            return d.date;
                        }));
                        y.domain([0, d3.max(data, function(d) {
                            return d.temp;
                        })]);

                        // Add the value-line path.
                        svg.append("path")
                            .data([data])
                            .attr("class", "line")
                            .attr("d", valueline);

                        // Add the X Axis
                        svg.append("g")
                            .attr("transform", "translate(0," + height + ")")
                            .call(d3.axisBottom(x));

                        // Add the Y Axis
                        svg.append("g")
                            .call(d3.axisLeft(y));
                    };
                      scope.renderShit = function(){
                      setTimeout(function () {
                        scope.renderVis();
                      }, 1000);
                    }

                }

            }
        })

        .directive('cities', function() {
            return {
                require: 'ngModel',
                link: function(scope, element, attrs, model) {
                    var options = {
                        types: ['geocode']
                    };
                    scope.gPlace = new google.maps.places.Autocomplete(element[0], options);

                    google.maps.event.addListener(scope.gPlace, 'place_changed', function() {
                        var geoComponents = scope.gPlace.getPlace();
                        scope.latitude = geoComponents.geometry.location.lat();
                        scope.longitude = geoComponents.geometry.location.lng();
                        // var addressComponents = geoComponents.address_components;

                        scope.$apply(function() {
                            model.$setViewValue(element.val());
                        });
                    });

                }
            }
        });

})();
