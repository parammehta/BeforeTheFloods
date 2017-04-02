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
                console.log("URL is:"+payloadForService);
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

            $scope.convertToC = function (temp_k) {
                var temp_c = Math.round((temp_k - 273.15)*100)/100;
                return temp_c;
            }

            $scope.convertToF = function (temp_k) {
                var temp_f = ((Math.round((temp_k - 273.15)*100)/100) * (9/5)) + 32;
                return temp_f;
            }

            $scope.getRadioValue = function () {
                $("input:radio[name=temperature]").click(function () {
                    var val = $(this).val();
                    return val;
                })
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
                        var focus = svg.append("g")
                             .style("display", "none");
                        var lineData = [],
                            day = {};
                        var date = "";
                        var identifier = scope.getRadioValue();
                        console.log("Identifier:"+identifier);
                        // if (identifier==="F"){
                        //     data.forEach(function(d) {
                        //         //console.log(parseTime(date));
                        //         var temp_k = d.main.temp;
                        //         var dateVal = d.dt;
                        //         var date = new Date(parseFloat(dateVal*1000));
                        //         day = {
                        //             date: +date.getDate()+1,
                        //             month: +date.getMonth()+1,
                        //             year: +date.getFullYear(),
                        //             hours: +date.getHours(),
                        //             temp: +scope.convertToC(temp_k),
                        //             temp_min: +scope.convertToF(d.main.temp_min),
                        //             temp_max: +scope.convertToF(d.main.temp_max)
                        //         }
                        //         lineData.push(day);
                        //     });
                        // }

                        // else if (identifier==="C"){
                         data.forEach(function(d) {
                             //console.log(parseTime(date));
                             var temp_k = d.main.temp;
                             var dateVal = d.dt;
                             var date = new Date(parseFloat(dateVal*1000));
                             day = {
                                 date: +date.getDate()+1,
                                 month: +date.getMonth()+1,
                                 year: +date.getFullYear(),
                                 hours: +date.getHours(),
                                 temp: +scope.convertToC(temp_k),
                                 temp_min: +scope.convertToC(d.main.temp_min),
                                 temp_max: +scope.convertToC(d.main.temp_max)
                             }
                             lineData.push(day);
                         });
                         // }
                        data = lineData;
                        var bisectDate = d3.bisector(function(d) {
                            return d.date;
                        }).left;
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
                            .call(d3.axisBottom(x).ticks(6));

                        // Add the Y Axis
                        svg.append("g")
                            .call(d3.axisLeft(y).ticks(6));

                         focus.append("line")
                             .attr("class", "y-tip")
                             .attr("y1", 0)
                             .attr("y2", height);

                         // append the x tooltip
                         focus.append("line")
                             .attr("class", "x-tip")
                             .attr("x1", width)
                             .attr("x2", width);

                         // append the circle at the intersection
                         focus.append("circle")
                             .attr("class", "y")
                             .style("fill", "none")
                             .style("stroke", "blue")
                             .attr("r", 4);

                         // place the value at the intersection
                         focus.append("text")
                             .attr("class", "y1")
                             .style("stroke", "white")
                             .style("stroke-width", "3.5px")
                             .style("opacity", 0.8)
                             .attr("dx", 8)
                             .attr("dy", "-.3em");
                         focus.append("text")
                             .attr("class", "y2")
                             .attr("dx", 8)
                             .attr("dy", "-.3em");

                         // place the date at the intersection
                         focus.append("text")
                             .attr("class", "y3")
                             .style("stroke", "white")
                             .style("stroke-width", "3.5px")
                             .style("opacity", 0.8)
                             .attr("dx", 8)
                             .attr("dy", "1em");
                         focus.append("text")
                             .attr("class", "y4")
                             .attr("dx", 8)
                             .attr("dy", "1em");

                         // append the rectangle to capture mouse
                         svg.append("rect")
                             .attr("width", width)
                             .attr("height", height)
                             .style("fill", "none")
                             .style("pointer-events", "all")
                             .on("mouseover", function() { focus.style("display", null); })
                             .on("mouseout", function() { focus.style("display", "none"); })
                             .on("mousemove", mousemove);

                     function mousemove() {
                         var x0 = x.invert(d3.mouse(this)[0]),
                             i = bisectDate(lineData, x0, 1),
                             d0 = lineData[i - 1],
                             d1 = lineData[i],
                             d = x0 - d0.date > d1.date - x0 ? d1 : d0;

                         focus.select("circle.y")
                             .attr("transform",
                                 "translate(" + x(d.date) + "," +
                                 y(d.temp) + ")");

                         focus.select("text.y1")
                             .attr("transform",
                                 "translate(" + x(d.date) + "," +
                                 y(d.temp) + ")")
                             .text(d.temp);

                         focus.select("text.y2")
                             .attr("transform",
                                 "translate(" + x(d.date) + "," +
                                 y(d.temp) + ")")
                             .text(d.temp);


                         focus.select(".y-tip")
                             .attr("transform",
                                 "translate(" + x(d.date) + "," +
                                 y(d.temp) + ")")
                             .attr("y2", height - y(d.temp));

                         focus.select(".x-tip")
                             .attr("transform",
                                 "translate(" + width * -1 + "," +
                                 y(d.temp) + ")")
                             .attr("x2", width + width);
                     }
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
