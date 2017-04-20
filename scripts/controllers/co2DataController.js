(function() {

    'use strict';
    // Load controller
    angular.module('d3App')
        .controller('co2DataController', ['$rootScope', '$scope', '$location', 'serviceCall', 'activeData', '$timeout', '$log', '$compile', 'myConstants', '$anchorScroll', function($rootScope, $scope, $location, serviceCall, activeData, $timeout, $log, $compile, myConstants, $anchorScroll) {

            $scope.yearsInCO2 = [1995,1996,1997,1998,1999,2000,2001,2002,2003,2004,2005,2006,2007,2008,2009,2010,2011,2012,2013];
            $scope.selectedYear = '';
            $scope.controllerInit = function() {
                $('#co2Data').removeClass('hidden');
            };
            $scope.scrollTo = function(id) {
                console.log("scroll to " + id);
                $timeout(function() {
                    $location.hash(id);
                    $anchorScroll();
                });
            };

            $scope.optionSelected = function () {
              console.log($scope.selectedYear);
              $scope.renderVis($scope.selectedYear);
            };

            $scope.controllerInit();

        }])

        .directive('bubbleChart', function() {
            return {
                restrict: 'E',
                terminal: true,
                link: function(scope, element, attrs) {
                    scope.renderVis = function (selectedYear) {
                      d2.csv("../data/co2data.csv", function(rawdata) {
                          console.log(rawdata);
                          var allyearObjects = [];

                          var tooltip = d3.select("#bubbleChart")
                              .append("div")
                              .style("position", "absolute")
                              .style("z-index", "10")
                              .style("visibility", "hidden")
                              .style("color", "white")
                              .style("padding", "8px")
                              .style("background-color", "rgba(0, 0, 0, 0.75)")
                              .style("border-radius", "6px")
                              .style("font", "12px sans-serif")
                              .text("tooltip"),
                              color = d2.scale.category20c();
                          var compare = function(a, b) {

                              if (a.value < b.value) {
                                  return 1;
                              } else if (a.value > b.value) {
                                  return -1;
                              } else {
                                  return 0;
                              }
                          }

                          var finalObject = "";
                          rawdata.forEach(function(d) {

                              var children = [];
                              for (var key in d) {
                                  var obj = {};
                                  if (key == "Year") {
                                      continue;
                                  }
                                  d[key] = parseFloat(d[key]) / 1000;
                                  obj["name"] = key;
                                  obj["value"] = d[key];
                                  children.push(obj);
                              }

                              children.sort(compare);
                              var finalChildren = [];
                              for (var count = 0; count < 100; count++) {

                                  finalChildren[count] = children[count];
                              }



                              var childrenObj = {};
                              childrenObj["children"] = finalChildren;
                              childrenObj["name"] = "XYZ";
                              childrenObj["value"] = 60;
                              finalObject = childrenObj;
                              allyearObjects.push(finalObject);
                          });


                          var width = 800,
                              height = 600;
                              d2.selectAll("svg > *").remove();

                          var chart = d2.select("#bubbleChart")
                              .append("svg")
                              .attr("width", width)
                              .attr("height", height)
                              .append("g")
                              .attr("transform", "translate(50,50)");

                          var pack = d2.layout.pack()
                              .size([width, height - 50])
                              .padding(10);

                          var data = allyearObjects[selectedYear - 1995];
                          var nodes = pack.nodes(data);

                          var node = chart.selectAll(".node")
                              .data(nodes).enter()
                              .append("g")
                              .attr("class", "node")
                              .attr("transform", function(d) {
                                  return "translate(" + d.x + "," + d.y + ")";
                              });

                          node.append("circle")
                              .attr("r", function(d) {
                                  return d.r;
                              })
                              .attr("fill", function(d) {
                                  return color(d.name);
                              }) //make nodes with children invisible
                              .attr("opacity",1)

                              .attr("stroke-width", 2)
                              .on("mouseover", function(d) {
                                  tooltip.text(d.name);
                                  tooltip.style("visibility", "visible");
                              })
                              .on("mousemove", function() {
                                  return tooltip.style("top", (d2.event.pageY - 10) + "px").style("left", (d2.event.pageX + 10) + "px");
                              })
                              .on("mouseout", function() {
                                  return tooltip.style("visibility", "hidden");
                              });

                          //


                      });
                    };

                }
            };
        });
})();
