(function() {

        'use strict';
        // Load controller
        angular.module('d3App').controller('pullutionIndexController', ['$rootScope', '$scope', '$location', 'serviceCall', 'activeData', '$timeout', '$log', '$compile', 'myConstants', function($rootScope, $scope, $location, serviceCall, activeData, $timeout, $log, $compile, myConstants) {

                $scope.controllerInit = function() {
                    $('#pollutionIndex').removeClass('hidden');
                };
                $scope.controllerInit();

            }])

            .directive('pollutionIndex', function() {
                    return {
                        restrict: 'E',
                        terminal: true,
                        link: function(scope, element, attrs) {
                            // set the dimensions and margins of the graph
                            console.log("Running");
                            var margin = {
                                    top: 20,
                                    right: 40,
                                    bottom: 30,
                                    left: 50
                                },
                                width = 960 - margin.left - margin.right,
                                height = 500 - margin.top - margin.bottom;

                            var parseTime = d3.timeParse("%Y");
                            // set the ranges
                            var x = d3.scaleTime().range([0, width]);
                            var y = d3.scaleLinear().range([height, 0]);
                            // append the svg obgect to the body of the page
                            // appends a 'group' element to 'svg'
                            // moves the 'group' element to the top left margin
                            var svg = d3.select("#chart").append("svg")
                                .attr("width", width + margin.left + margin.right)
                                .attr("height", height + margin.top + margin.bottom)
                                .append("g")
                                .attr("transform",
                                    "translate(" + margin.left + "," + margin.top + ")");
                            var countryData = [];

                            // Get the data
                            d3.csv("../data/World_Bank_pm2.5_over_time.csv", function(error, data) {
                                if (error) throw error;
                                var country = {};
                                // format the data
                                data.forEach(function(d) {
                                    country = {
                                        "Country": d.Country_Name,
                                        "1990": parseTime(d.A1990),
                                        "1995": parseTime(d.A1995),
                                        "2000": parseTime(d.A2000),
                                        "2005": parseTime(d.A2005),
                                        "2010": parseTime(d.A2010),
                                        "2011": parseTime(d.A2011),
                                        "2013": parseTime(d.A2013)
                                    };
                                    countryData.push(country);
                                });
                            });
                            console.log(countryData);
                            var test = [1990, 1995, 2000, 2005, 2010, 2011, 2013];
                            x.domain(d3.extent(test, function(d) {
                                return parseTime(d);
                            }));

                            // Add the X Axis
                            svg.append("g")
                                .attr("class", "axis axis--x")
                                .attr("transform", "translate(0," + height + ")")
                                .call(d3.axisBottom(x));

                            y.domain(d3.extent(countryData, function(d) {
                                return d.Country;
                            }));

                            svg.append("g")
                                .attr("class", "axis axis--y")
                                .call(d3.axisLeft(y).ticks(10))
                                .append("text")
                                .attr("transform", "rotate(-90)");
                        }
                      };
                    });
            })();
