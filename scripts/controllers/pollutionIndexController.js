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
                    function lineChart() {

                        var margin = {
                                top: 30,
                                right: 300,
                                bottom: 30,
                                left: 30
                            },
                            width = 1024,
                            height = 480,
                            xValue = function(d) {
                                return d[0];
                            },
                            yValue = function(d) {
                                return d[1];
                            },
                            labels = function(d) {
                                return d[2];
                            },
                            tag = function(d, i) {
                                return "tag_" + i;
                            },
                            xScale = d2.time.scale(),
                            yScale = d2.scale.linear(),
                            line = d2.svg.line().x(X).y(Y),
                            xAxis = d2.svg.axis().scale(xScale).orient("bottom").tickSize(6, 0),
                            yAxis = d2.svg.axis().scale(yScale).orient("left").tickSize(6, 0);

                        function chart(selection) {
                            selection.each(function(data) {

                                // Convert data to standard representation greedily;
                                // this is needed for non-deterministic accessors.
                                data = data.map(function(d, i) {
                                    var x = xValue.call(data, d, i);
                                    var y = yValue.call(data, d, i);
                                    return {
                                        label: labels.call(data, d, i),
                                        data: x.map(function(d, i) {
                                            return [x[i], y[i]];
                                        })
                                    };
                                });

                                // Concatenate x and y values (for scale definition).
                                var x = data.reduce(function(prev, cur, i, d) {
                                    return prev.concat(cur.data.map(function(d) {
                                        return d[0];
                                    }))
                                }, []);
                                var y = data.reduce(function(prev, cur, i, d) {
                                    return prev.concat(cur.data.map(function(d) {
                                        return d[1];
                                    }))
                                }, []);

                                // Update the x-scale.
                                xScale
                                    .domain(d2.extent(x))
                                    .range([0, width - margin.left - margin.right]);

                                // Update the y-scale.
                                yScale
                                    .domain([0, d2.max(y)])
                                    .range([height - margin.top - margin.bottom, 0]);

                                // Select the svg element, if it exists.
                                var svg = d2.select(this).selectAll("svg").data([1]);

                                // Otherwise, create the skeletal chart.
                                var gEnter = svg.enter().append("svg").append("g");
                                gEnter.append("g").attr("class", "x axis");
                                gEnter.append("g").attr("class", "y axis");

                                // Update the outer dimensions.
                                svg.attr("width", width)
                                    .attr("height", height);

                                // Update the inner dimensions.
                                var g = svg.select("g")
                                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                                // Plot lines (base).
                                g.selectAll("path.results")
                                    .data(data.map(function(d) {

                                        return d.data;
                                    }))
                                    .enter()
                                    .append("svg:path")
                                    .attr("d", line);
                                var isActive = {};
                                // Replot lines (highlighted; in front of base).
                                g.selectAll("path.results")
                                    .data(data.map(function(d) {

                                        return d.data;
                                    }))
                                    .enter()
                                    .append("svg:path")
                                    .attr("class", "highlight")
                                    .attr("id", tag)
                                    .attr("d", line)
                                    .style("opacity", 0.0)
                                    .on("mouseover", function(d, i) {

                                        d2.selectAll("#" + tag(d, i)).style("opacity", 1.0);
                                    })
                                    .on("mouseout", function(d, i) {
                                        if(isActive[tag(d, i)]){

                                        }else{
                                          d2.selectAll("#" + tag(d, i)).style("opacity", 0.0);
                                        }

                                    })
                                    .on("click", function(d, i){
                                        console.log("clicked= #"+tag(d,i));
                                        if(isActive[tag(d, i)]){
                                          isActive[tag(d, i)] = false;
                                        }else{
                                          d2.selectAll('#' + tag(d, i)).style("opacity", 1.0);
                                          isActive[tag(d, i)] = true;
                                        }
                                    });

                                // Plot labels.
                                g.selectAll("text.label.yaxis")
                                    .data(data)
                                    .enter()
                                    .append("svg:text")
                                    .attr("class", "label yaxis")
                                    .attr("id", tag)
                                    .attr("text-anchor", "start")
                                    .style("opacity", 0.0)
                                    .attr("dx", "1.0em")
                                    .attr("dy", "0.3em")
                                    .attr("x", xScale.range()[1])
                                    .attr("y", function(d) {

                                        var last = d.data.length - 1;
                                        return last < 0 ? yScale.range[0] : Y(d.data[last]);
                                    })
                                    .text(function(d) {

                                        return d.label;
                                    });

                                // Update the x-axis.
                                g.select(".x.axis")
                                    .attr("transform", "translate(0," + yScale.range()[0] + ")")
                                    .call(xAxis)
                                    .attr("stroke-width", "3.5px")
                                    ;

                                // Update the y-axis.
                                g.select(".y.axis")
                                    .attr("transform", "translate(" + xScale.range()[0] + ",0)")
                                    .call(yAxis)
                                    .attr("stroke-width", "3.5px");
                            });
                        }

                        // The x-accessor for the path generator; xScale ∘ xValue.
                        function X(d) {
                            return xScale(d[0]);
                        }

                        // The x-accessor for the path generator; yScale ∘ yValue.
                        function Y(d) {
                            return yScale(d[1]);
                        }

                        chart.margin = function(_) {
                            if (!arguments.length) return margin;
                            margin = _;
                            return chart;
                        };

                        chart.width = function(_) {
                            if (!arguments.length) return width;
                            width = _;
                            return chart;
                        };

                        chart.height = function(_) {
                            if (!arguments.length) return height;
                            height = _;
                            return chart;
                        };

                        chart.x = function(_) {
                            if (!arguments.length) return xValue;
                            xValue = _;
                            return chart;
                        };

                        chart.y = function(_) {
                            if (!arguments.length) return yValue;
                            yValue = _;
                            return chart;
                        };

                        chart.labels = function(_) {
                            if (!arguments.length) return labels;
                            labels = _;
                            return chart;
                        };

                        return chart;
                    }

                    // Transform the raw data.
                    //
                    function transformData(data) {

                        // Year format.
                        var format = d2.time.format("%Y");

                        // Parse raw data -> x[].
                        var x = [];
                        data.forEach(function(d) {

                            // Process Country_Name record.
                            var usage = [];
                            var years = [];
                            var keys = Object.keys(d);
                            keys.forEach(function(k) {
                                if (k != 'Country') {
                                    // Parse usage.
                                    var use = +d[k];
                                    if (use) {
                                        years.push(format.parse(k));
                                        usage.push(use);
                                    }
                                }
                            });

                            x.push({
                                'Country': d.Country_Name,
                                'Years': years,
                                'Usage': usage
                            });
                        });

                        return x;
                    }

                    // Call-back after reading data.
                    //
                    function display(error, data) {
                        if (error) {
                            console.log(error);
                            return;
                        }

                        //console.log(transformData(data));

                        var chart = lineChart()
                            .labels(function(d) {
                                return d.Country;
                            })
                            .x(function(d) {
                                return d.Years
                            })
                            .y(function(d) {
                                return d.Usage
                            });
                        d2.select("#chart").datum(transformData(data)).call(chart);
                    }

                    // Read the data file.
                    queue()
                        .defer(d2.csv, "../data/World_Bank_pm2.5_over_time (copy).csv")
                        .await(display);
                }
            };
        });
})();
