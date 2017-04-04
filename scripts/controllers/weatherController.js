(function() {

    'use strict';
    // Load controller
    angular.module('d3App').controller('weatherController', ['$rootScope', '$scope', '$location', 'serviceCall', 'activeData', '$timeout', '$log', '$compile', 'myConstants', '$anchorScroll', function($rootScope, $scope, $location, serviceCall, activeData, $timeout, $log, $compile, myConstants,$anchorScroll) {

            $scope.temperature = "C";
            $scope.controllerInit = function() {
                console.log('initialize');

            };

            $scope.getCurrentWeather = function(latitude, longitude) {
                var payloadForService = '{"url":"' + myConstants.weatherURL + '/data/2.5/weather?lat=' + latitude + '&lon=' + longitude + '&appid=' + myConstants.appid + '"}';
                var weatherCall = new serviceCall("weather", "GET");
                weatherCall.call(payloadForService, $scope.currentWeatherSuccessCallback, $scope.errorCallback);
            };

            $scope.getFutureWeather = function(latitude, longitude) {
                var payloadForService = '{"url":"' + myConstants.weatherURL + '/data/2.5/forecast?lat=' + latitude + '&lon=' + longitude + '&appid=' + myConstants.appid + '"}';
                console.log("URL is:" + payloadForService);
                var weatherCall = new serviceCall("weather", "GET");
                weatherCall.call(payloadForService, $scope.futureWeatherSuccessCallback, $scope.errorCallback);
            };
            $scope.futureWeatherSuccessCallback = function(data, status, headers, config) {
                console.log(data);
                $scope.data = data;
            };

            $scope.currentWeatherSuccessCallback = function(data, status, headers, config) {
                console.log(data);
                $scope.dataCurrent = data;
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
                $scope.getFutureWeather($scope.latitude, $scope.longitude);
                $scope.getCurrentWeather($scope.latitude, $scope.longitude);
                $scope.renderShit($scope.temperature);
                $scope.populateDailyWeather($scope.temperature);
                $scope.city = $scope.chosenPlace;
                $scope.saveToActiveData();
            };

            $scope.convertToC = function(temp_k) {
                var temp_c = Math.round((temp_k - 273.15) * 100) / 100;
                return temp_c;
            };

            $scope.convertToF = function(temp_k) {
                var temp_f = Math.round((((Math.round((temp_k - 273.15) * 100) / 100) * (9 / 5)) + 32) * 100) / 100;
                return temp_f;
            };


            $scope.openPollutionIndex = function() {
                $('#pollutionIndex').removeClass('hidden');
            };
            $scope.scrollTo = function(id) {
                $location.hash(id);
                $anchorScroll();
            };
            
            $scope.changePage = function(path) {
                $location.path(path);
            };

            $scope.saveToActiveData = function() {
                activeData.setCityName($scope.city);
                activeData.setCityLatitude($scope.latitude);
                activeData.setCityLongitude($scope.longitude);
            };

            $scope.controllerInit();


        }])

        .directive('weatherVisualization', function() {

            return {
                restrict: 'E',
                terminal: true,
                link: function(scope, element, attrs) {
                    scope.renderVis = function(tempFromUser) {

                        if(scope.data !== undefined)
                          var data = scope.data.list;

                        // Set the dimensions of the canvas / graph
                        // SVG dimensions
                        var margin = {
                                top: 30,
                                right: 30,
                                bottom: 30,
                                left: 30
                            },
                            width = 750 - margin.left - margin.right,
                            height = 250 - margin.top - margin.bottom;

                        var parseDate = d3.timeParse('%Y-%m-%d %H:%M:%S');
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
                        if (tempFromUser === 'C') {
                            data.forEach(function(d) {
                                var temp_k = d.main.temp;
                                day = {
                                    date: parseDate(d.dt_txt),
                                    temp: +scope.convertToC(temp_k),
                                    temp_min: +scope.convertToC(d.main.temp_min),
                                    temp_max: +scope.convertToC(d.main.temp_max)
                                };
                                lineData.push(day);
                            });
                        } else {
                            data.forEach(function(d) {
                                var temp_k = d.main.temp;
                                day = {
                                    date: parseDate(d.dt_txt),
                                    temp: +scope.convertToF(temp_k),
                                    temp_min: +scope.convertToF(d.main.temp_min),
                                    temp_max: +scope.convertToF(d.main.temp_max)
                                };
                                lineData.push(day);
                            });
                        }

                        console.log(lineData);
                        var bisectDate = d3.bisector(function(d) {
                            return d.date;
                        }).left;
                        //set the visualization
                        var xScale = d3.scaleTime()
                            .domain(d3.extent(lineData, (d) => d.date))
                            .range([0, width]);

                        var yScale = d3.scaleLinear()
                            .domain([d3.max(lineData, (d) => d.temp), 0])
                            .range([60, height]);

                        // Bottom scale
                        svg.append("g")
                            .attr("transform", "translate(0," + height + ")")
                            .call(d3.axisBottom(xScale).ticks(5));
                        // Left scale
                        svg.append("g")
                            .call(d3.axisLeft(yScale).ticks(10));

                        // Draw temperature line
                        svg.append("path")
                            .datum(lineData)
                            .style('stroke', '#ffa500')
                            .style('stroke-width', '3')
                            .style('fill', 'none')
                            .attr("d", d3.line()
                                .curve(d3.curveCardinal)
                                .x((d) => xScale(d.date))
                                .y((d) => yScale(d.temp))
                            );

                        var tempPoint = svg.selectAll(".temp-point")
                            .data(lineData)
                            .enter()
                            .filter((d) => {
                                if (d.date) return d.temp
                            });

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
                            .on("mouseover", function() {
                                focus.style("display", null);
                            })
                            .on("mouseout", function() {
                                focus.style("display", "none");
                            })
                            .on("mousemove", mousemove);

                        function mousemove() {
                            var x0 = xScale.invert(d3.mouse(this)[0]),
                                i = bisectDate(lineData, x0, 1),
                                d0 = lineData[i - 1],
                                d1 = lineData[i],
                                d = x0 - d0.date > d1.date - x0 ? d1 : d0;

                            focus.select("circle.y")
                                .attr("transform",
                                    "translate(" + xScale(d.date) + "," +
                                    yScale(d.temp) + ")");

                            focus.select("text.y1")
                                .attr("transform",
                                    "translate(" + xScale(d.date) + "," +
                                    yScale(d.temp) + ")")
                                .text(d.temp);

                            focus.select("text.y2")
                                .attr("transform",
                                    "translate(" + xScale(d.date) + "," +
                                    yScale(d.temp) + ")")
                                .text(d.temp);


                            focus.select(".y-tip")
                                .attr("transform",
                                    "translate(" + xScale(d.date) + "," +
                                    yScale(d.temp) + ")")
                                .attr("y2", height - yScale(d.temp));

                            focus.select(".x-tip")
                                .attr("transform",
                                    "translate(" + width * -1 + "," +
                                    yScale(d.temp) + ")")
                                .attr("x2", width + width);
                        }
                        // tempPoint.append("text")
                        //     .attr('x', (d) => xScale(d.date))
                        //     .attr('y', (d) => height - yScale(d.temp))
                        //     .attr('dy', "-10px")
                        //     .style("text-anchor", "middle")
                        //     .text((d) => d.temp + "°");

                    };
                    scope.renderShit = function(value) {
                        setTimeout(function() {
                            scope.renderVis(value);
                        }, 1000);
                    }
                    scope.$watch('temperature', function(temperature) {
                        scope.renderShit(temperature);
                    });
                }

            }
        })
        .directive('currentWeather', function() {
            return {
                restrict: 'E',
                terminal: true,
                link: function(scope, element, attrs) {
                    scope.renderDailyViz = function(tempFromUser) {
                        var data = scope.dataCurrent;
                        $('#pressure').text(data.main.pressure);
                        $('#humidity').text(data.main.humidity);
                        $('#main').text(data.weather[0].main)
                        $('#desc').text(data.weather[0].description)
                        if (tempFromUser === 'C') {
                            $('#temp').text(scope.convertToC(data.main.temp));
                            $('#temp_min').text(scope.convertToC(data.main.temp_min));
                            $('#temp_max').text(scope.convertToC(data.main.temp_max));

                        } else {
                            $('#temp').text(scope.convertToF(data.main.temp));
                            $('#temp_min').text(scope.convertToF(data.main.temp_min));
                            $('#temp_max').text(scope.convertToF(data.main.temp_max));

                        }
                    };

                    scope.populateDailyWeather = function(value) {
                        setTimeout(function() {
                            scope.renderDailyViz(value);
                        }, 1000);
                    };
                    scope.$watch('temperature', function(temperature) {
                        scope.populateDailyWeather(temperature);
                    });
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
                        console.log(scope.latitude);
                        scope.longitude = geoComponents.geometry.location.lng();
                        // var addressComponents = geoComponents.address_components;
                        console.log(scope.longitude);
                        scope.$apply(function() {
                            model.$setViewValue(element.val());
                        });
                    });

                }
            }
        });


})();
