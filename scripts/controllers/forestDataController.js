(function() {

    'use strict';
    // Load controller
    angular.module('d3App')
        .controller('forestDataController', ['$rootScope', '$scope', '$location', 'serviceCall', 'activeData', '$timeout', '$log', '$compile', 'myConstants', '$anchorScroll', function($rootScope, $scope, $location, serviceCall, activeData, $timeout, $log, $compile, myConstants, $anchorScroll) {

            $scope.yearsInCO2 = [1995, 1996, 1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013];
            $scope.controllerInit = function() {
                // $scope.renderVis();
            };

            $scope.openForestChart = function() {
                $scope.changePage('forestData');
            };
            $scope.changePage = function(path) {
                $location.path(path);
            };

            $scope.controllerInit();

        }])

        .directive('forestData', function() {
            return {
                restrict: 'E',
                terminal: true,
                link: function(scope, element, attrs) {

                    var change = function() {
                        if (d3.select("span").text() == "Agricultural area (% of total land area)") {
                            d3.select("span").text("Forest area (% of total land area)");
                            d3.selectAll("rect").transition().attr("fill", function(d) {
                                return colorLegendForest(d)
                            });
                            d3.selectAll("path")
                                .transition()
                                .style("fill", function(d) {
                                    if (d) {
                                        if (d.properties.forest) {
                                            return colorForest(d.properties.forest)
                                        } else {
                                            return "#d9d9d9"
                                        }
                                    }
                                });
                        } else if (d3.select("span").text() == "Forest area (% of total land area)") {
                            d3.select("span").text("Agricultural area (% of total land area)")
                            d3.selectAll("rect").transition().attr("fill", function(d) {
                                return colorLegendAgri(d)
                            })
                            d3.selectAll("path")
                                .transition()
                                .style("fill", function(d) {
                                    if (d) {
                                        if (d.properties.agri) {
                                            return colorAgri(d.properties.agri)
                                        } else {
                                            return "#d9d9d9"
                                        }
                                    }
                                });
                        }
                    }

                    var colorAgri,
                        colorForest,
                        w = 960,
                        h = 480,
                        minAgri,
                        maxAgri,
                        minForest,
                        maxForest;

                    var colorLegendForest = d3.scaleLinear()
                        .domain([0, 5])
                        .range(["#fff", "#008000"]);

                    var colorLegendAgri = d3.scaleLinear()
                        .domain([0, 5])
                        .range(["#fff", "#806000"]);

                    var svg = d3.select("div#jungle")
                        .append("svg")
                        .attr("width", w)
                        .attr("height", h)
                        .on("click", change);

                    var path = d3.geoPath().projection(d3.geoMercator().translate([w / 2, (h + 120) / 2]).scale([130]));

                    d3.csv("data/forest.csv", function(csv) {

                        minAgri = d3.min(csv, function(d) {
                            return d.agri
                        });
                        maxAgri = d3.max(csv, function(d) {
                            return d.agri
                        });
                        minForest = d3.min(csv, function(d) {
                            return d.forest
                        });
                        maxForest = d3.max(csv, function(d) {
                            return d.forest
                        });


                        colorAgri = d3.scaleLinear()
                            .domain([
                                0,
                                d3.max(csv, function(d) {
                                    return d.agri
                                })
                            ])
                            .range(["#fff", "#806000"]);

                        colorForest = d3.scaleLinear()
                            .domain([
                                0,
                                d3.max(csv, function(d) {
                                    return d.forest
                                })
                            ])
                            .range(["#fff", "#008000"]);



                        d3.json("data/countries.json", function(json) {
                            for (var i = 0; i < csv.length; i++) {
                                for (var j = 0; j < json.features.length; j++) {
                                    if (json.features[j].id == csv[i].code) {
                                        json.features[j].properties.agri = parseFloat(csv[i].agri);
                                        json.features[j].properties.forest = parseFloat(csv[i].forest);
                                        break;
                                    }
                                }
                            }
                            svg.selectAll("path")
                                .data(json.features)
                                .enter().append("path")
                                .style("fill", function(d) {
                                    if (d.properties.forest) {
                                        return colorForest(d.properties.forest)
                                    } else {
                                        return "#cccccc"
                                    }
                                })
                                .on("mouseover", function(d) {
                                    var cote = 100,
                                        arc = d3.arc()
                                        .innerRadius(cote / 4)
                                        .outerRadius(cote / 2)
                                        .padAngle(0.1);
                                    var pie = d3.pie()
                                        .sort(null)
                                        .value(function(d) {
                                            return d.value
                                        }),
                                        datapie = pie([{
                                                value: d.properties.forest,
                                                label: "Forest"
                                            },
                                            {
                                                value: d.properties.agri,
                                                label: "Agri"
                                            },
                                            {
                                                value: 100 - d.properties.forest - d.properties.agri,
                                                label: "other"
                                            }
                                        ]);
                                    var y = h - cote / 2 - 10;
                                    var x = cote / 2 + 20;

                                    svg.append("text")
                                        .text(d.properties.name)
                                        .attr("class", "infos")
                                        .attr("x", x - 2 * d.properties.name.length)
                                        .attr("y", y - cote / 2 - 20)
                                        var color = "";
                                    for (i = 0; i < 3; i++) {
                                        if (i == 0) {
                                            color = "#669900"
                                        } else if (i == 1) {
                                            color = "#ffbb33"
                                        } else if (i == 2) {
                                            color = "#bfbfbf"
                                        }
                                        svg.append("path")
                                            .attr("class", "infos")
                                            .attr("transform", "translate(" + x + "," + y + ")")
                                            .attr("d", arc(datapie[i]))
                                            .attr("fill", color)
                                    }

                                })
                                .on("mouseout", function() {
                                    svg.selectAll(".infos").remove()
                                })
                                .attr("d", path)
                                .on("click", change);
                        });
                    });


                    svg.selectAll("rect")
                        .data([0, 1, 2, 3, 4, 5])
                        .enter()
                        .append("rect")
                        .attr("x", function(d) {
                            return w - 20 * (8 - d)
                        })
                        .attr("y", h - 20)
                        .attr("width", 20)
                        .attr("height", 20)
                        .attr("fill", function(d) {
                            return colorLegendForest(d)
                        })

                    svg.append("text")
                        .text("-")
                        .attr("x", w - 20 * 8)
                        .attr("y", h - 25)
                        .style("font-size", "1em")

                    svg.append("text")
                        .text("+")
                        .attr("x", w - 20 * 3)
                        .attr("y", h - 25)
                        .style("font-size", "1em")
                }
            };
        });
})();
