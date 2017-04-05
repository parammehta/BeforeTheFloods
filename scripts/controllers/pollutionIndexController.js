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
                            var months,
                                monthKeys,
                                monthParse = d3.timeParse("%Y");

                            var svg = d3.select("svg"),
                                margin = {
                                    top: 20,
                                    right: 30,
                                    bottom: 30,
                                    left: 40
                                },
                                width = svg.attr("width") - margin.left - margin.right,
                                height = svg.attr("height") - margin.top - margin.bottom,
                                g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");
                            var x = d3.scaleTime()
                                .range([0, width]);

                            var y = d3.scaleLinear()
                                .range([height, 0]);
                            var line = d3.line()
                                .x(function(d) {
                                    return x(d.date);
                                })
                                .y(function(d) {
                                    return y(d.value);
                                });

                            var countryData = [];
                            // Get the data
                            d3.csv("../data/World_Bank_pm2.5_over_time.csv", function(error, data) {
                                if (error) throw error;
                                x.domain(d3.extent(months));
                                y.domain([0, d3.max(data, function(c) {
                                    return d3.max(c.values, function(d) {
                                        return d.value;
                                    });
                                })]).nice();

                                g.append("g")
                                    .attr("class", "axis axis--x")
                                    .attr("transform", "translate(0," + height + ")")
                                    .call(d3.axisBottom(x));

                                g.append("g")
                                    .attr("class", "axis axis--y")
                                    .call(d3.axisLeft(y).ticks(10, "%"))
                                    .append("text")
                                    .attr("x", 4)
                                    .attr("y", 0.5)
                                    .attr("dy", "0.32em")
                                    .style("text-anchor", "start")
                                    .style("fill", "#000")
                                    .style("font-weight", "bold")
                                    .text("Pm 2.5 Index");

                                g.append("g")
                                    .attr("class", "cities")
                                    .selectAll("path")
                                    .data(data)
                                    .enter().append("path")
                                    .attr("d", function(d) {
                                        d.line = this;
                                        return line(d.values);
                                    });

                                var focus = g.append("g")
                                    .attr("transform", "translate(-100,-100)")
                                    .attr("class", "focus");

                                focus.append("circle")
                                    .attr("r", 3.5);

                                focus.append("text")
                                    .attr("y", -10);

                                function mouseover(d) {
                                    d3.select(d.data.city.line).classed("city--hover", true);
                                    d.data.city.line.parentNode.appendChild(d.data.city.line);
                                    focus.attr("transform", "translate(" + x(d.data.date) + "," + y(d.data.value) + ")");
                                    focus.select("text").text(d.data.city.name);
                                }

                                function mouseout(d) {
                                    d3.select(d.data.city.line).classed("city--hover", false);
                                    focus.attr("transform", "translate(-100,-100)");
                                }
                            });
                            function type(d, i, columns) {
                                if (!months) monthKeys = columns.slice(1), months = monthKeys.map(monthParse);
                                var c = {
                                    name: d.Country_Name.replace(/ (msa|necta div|met necta|met div)$/i, ""),
                                    values: null
                                };
                                c.values = monthKeys.map(function(k, i) {
                                    return {
                                        city: c,
                                        date: months[i],
                                        value: d[k] / 100
                                    };
                                });
                                return c;
                            }
                        }
                      };
                    });
            })();
