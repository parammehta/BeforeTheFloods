(function() {

    'use strict';
    // Load controller
    angular.module('d3App')
        .controller('greenhousegasController', ['$rootScope', '$scope', '$location', 'serviceCall', 'activeData', '$timeout', '$log', '$compile', 'myConstants', '$anchorScroll', function($rootScope, $scope, $location, serviceCall, activeData, $timeout, $log, $compile, myConstants, $anchorScroll) {

            $scope.controllerInit = function() {
                $('#greenhousegas').removeClass('hidden');
            };

            $scope.changePage = function(path) {
                $location.path(path);
            };
            $scope.controllerInit();

        }])

        .directive('greenHouseGas', function() {
            return {
                restrict: 'E',
                terminal: true,
                link: function(scope, element, attrs) {
                    // Constants
                    var SVG_W = 940,
                        SVG_H = 875,
                        VISIBLE_H = SVG_W * 0.60,
                        X_MARGIN = 70,
                        TOP_MARGIN = 50,
                        BUDGET_AREA_H = SVG_H * 0.25,
                        BUBBLE_SCALE = 0.5,
                        BUBBLE_MARGIN = 24,
                        RADIUS_OF_THE_EARTH = 1250,
                        VISIBLE_EARTH_H = RADIUS_OF_THE_EARTH * 0.40,
                        COUNTRY_SPACING_IN_DEGREES = 1.5,
                        NUM_COUNTRIES_VISIBLE = 20,
                        DURATION = 2000,
                        CUMULATIVE_DELAY = DURATION,
                        DATA_START_YEAR = 1860,
                        DATA_FINAL_YEAR = 2200,
                        SLIDER_START_YEAR = DATA_START_YEAR,
                        SLIDER_END_YEAR = 2011,
                        BUDGET_DEFAULT = 2900000,
                        BUDGET_WITH_MINIMISED_NON_CO2 = 2900000, // 3150000, This is the one to use if we

                        ICON_PLAY = "\uf04b",
                        ICON_PAUSE = "\uf04c",
                        ICON_REPEAT = "\uf01e",

                        SCENARIOS = ["RCP8.5", "RCP6", "RCP4.5", "RCP3PD"],

                        CONTINENTS = ["Europe", "Africa", "Asia", "North America", "South America", "Oceania", "Antarctica"],
                        CONTINENTS_COLS = ["#0099CC", "#003F6A", "#E98300", "#007A4D", "#7D0063", "#C51F24", "white", "#bbb"],
                        // Produced by bin/make-continents-json.py
                        COUNTRY_CONTINENT = {
                            DZA: 1,
                            AGO: 1,
                            EGY: 1,
                            BGD: 2,
                            LIE: 0,
                            NAM: 1,
                            BGR: 0,
                            BOL: 4,
                            GHA: 1,
                            CCK: 2,
                            PAK: 2,
                            CPV: 1,
                            JOR: 2,
                            LBR: 1,
                            LBY: 1,
                            MYS: 2,
                            DOM: 3,
                            PRI: 3,
                            MYT: 1,
                            PRK: 2,
                            PSE: 2,
                            TZA: 1,
                            PRT: 0,
                            KHM: 2,
                            TTO: 3,
                            PRY: 4,
                            HKG: 2,
                            SAU: 2,
                            LBN: 2,
                            SVN: 0,
                            BFA: 1,
                            SVK: 0,
                            MRT: 1,
                            HRV: 0,
                            CHL: 4,
                            CHN: 2,
                            FSM: 5,
                            LAO: 2,
                            GIB: 0,
                            DJI: 1,
                            GIN: 1,
                            FIN: 0,
                            URY: 4,
                            THA: 2,
                            SYC: 1,
                            NPL: 2,
                            CXR: 2,
                            MAR: 1,
                            YEM: 2,
                            BVT: 6,
                            ZAF: 1,
                            KIR: 5,
                            PHL: 2,
                            SXM: 3,
                            ROU: 0,
                            VIR: 3,
                            SYR: 2,
                            MAC: 2,
                            NIC: 3,
                            KAZ: 2,
                            COK: 5,
                            TCA: 3,
                            PYF: 5,
                            NIU: 5,
                            CUW: 3,
                            DMA: 3,
                            KSV: 0,
                            BEN: 1,
                            NGA: 1,
                            BEL: 0,
                            MSR: 3,
                            TGO: 1,
                            DEU: 0,
                            GUM: 5,
                            LKA: 2,
                            SSD: 1,
                            FLK: 4,
                            GBR: 0,
                            MWI: 1,
                            MMR: 2,
                            CMR: 1,
                            PCN: 5,
                            MNP: 5,
                            COM: 1,
                            HUN: 0,
                            TKM: 2,
                            UGA: 1,
                            SUR: 4,
                            NLD: 0,
                            BMU: 3,
                            HMD: 6,
                            TCD: 1,
                            GEO: 2,
                            MNE: 0,
                            MNG: 2,
                            MHL: 5,
                            MTQ: 3,
                            BLZ: 3,
                            NFK: 5,
                            AFG: 2,
                            BDI: 1,
                            VGB: 3,
                            BLR: 0,
                            MAF: 3,
                            GRD: 3,
                            ALA: 0,
                            TKL: 5,
                            GRC: 0,
                            LSO: 1,
                            GRL: 3,
                            SHN: 1,
                            AND: 0,
                            MOZ: 1,
                            TJK: 2,
                            BLM: 3,
                            HTI: 3,
                            MEX: 3,
                            ZWE: 1,
                            LCA: 3,
                            IND: 2,
                            LVA: 0,
                            BTN: 2,
                            VCT: 3,
                            VNM: 2,
                            NOR: 0,
                            CZE: 0,
                            ATF: 6,
                            ATG: 3,
                            FJI: 5,
                            IOT: 2,
                            HND: 3,
                            MUS: 1,
                            ATA: 6,
                            LUX: 0,
                            ISR: 2,
                            SMR: 0,
                            PER: 4,
                            REU: 1,
                            IDN: 2,
                            VUT: 5,
                            MKD: 0,
                            COD: 1,
                            COG: 1,
                            ISL: 0,
                            GLP: 3,
                            ETH: 1,
                            NER: 1,
                            COL: 4,
                            GUF: 4,
                            QAT: 2,
                            TWN: 2,
                            BWA: 1,
                            MDA: 0,
                            STP: 1,
                            MDG: 1,
                            ECU: 4,
                            SEN: 1,
                            ESH: 1,
                            MDV: 2,
                            ASM: 5,
                            SPM: 3,
                            SRB: 0,
                            FRA: 0,
                            LTU: 0,
                            RWA: 1,
                            FRO: 0,
                            GMB: 1,
                            WLF: 5,
                            JEY: 0,
                            VAT: 0,
                            GTM: 3,
                            DNK: 0,
                            IMN: 0,
                            AUS: 5,
                            AUT: 0,
                            SJM: 0,
                            VEN: 4,
                            PLW: 5,
                            KEN: 1,
                            WSM: 5,
                            TUR: 2,
                            ALB: 0,
                            OMN: 2,
                            TUV: 5,
                            ITA: 0,
                            BRN: 2,
                            TUN: 1,
                            RUS: 0,
                            BRB: 3,
                            BRA: 4,
                            CIV: 1,
                            TLS: 2,
                            GNQ: 1,
                            USA: 3,
                            IRN: 2,
                            GGY: 0,
                            SWE: 0,
                            AZE: 2,
                            GNB: 1,
                            SWZ: 1,
                            TON: 5,
                            CAN: 3,
                            GUY: 4,
                            UKR: 0,
                            KOR: 2,
                            AIA: 3,
                            ERI: 1,
                            CHE: 0,
                            CRI: 3,
                            BIH: 0,
                            SGP: 2,
                            SGS: 6,
                            SOM: 1,
                            UZB: 2,
                            CAF: 1,
                            ZMB: 1,
                            POL: 0,
                            KWT: 2,
                            GAB: 1,
                            CYM: 3,
                            ARE: 2,
                            EST: 0,
                            ESP: 0,
                            IRQ: 2,
                            SLV: 3,
                            MLI: 1,
                            CYP: 2,
                            IRL: 0,
                            MLT: 0,
                            ABW: 3,
                            SLE: 1,
                            KNA: 3,
                            PAN: 3,
                            SDN: 1,
                            SLB: 5,
                            NZL: 5,
                            MCO: 0,
                            JPN: 2,
                            KGZ: 2,
                            JAM: 3,
                            NCL: 5,
                            NRU: 5,
                            ARG: 4,
                            BHS: 3,
                            BHR: 2,
                            ARM: 2,
                            PNG: 5,
                            CUB: 3
                        };


                    // Abbreviations
                    var $ = d2.select,
                        $$ = d2.selectAll;

                    // Global state
                    var CO2_data,
                        cumulative_data,
                        current_year,
                        ticker = null,
                        scenario_ticker = null,
                        current_step = 1,
                        current_sort_order = "CO2",
                        play_button_in_corner = false,
                        current_scenario = 0,
                        sources_showing = false,
                        budget = BUDGET_DEFAULT;

                    // Query string parameters
                    var parameters = {};
                    (function(query, re, match) {
                        while (match = re.exec(query)) {
                            parameters[decodeURIComponent(match[1])] = decodeURIComponent(match[2]);
                        }
                    })(window.location.search.substring(1).replace(/\+/g, "%20"), /([^&=]+)=?([^&]*)/g);
                    if (parameters.footer == "false") $("#footer").remove();
                    if (parameters.budget == "fixed") BUDGET_WITH_MINIMISED_NON_CO2 = BUDGET_DEFAULT;
                    if (parameters.guardian == "true") {
                        $("audio").remove();
                    }


                    function initViz() {
                        var svg = $("#svg-holder")
                            .append("svg")
                            .attr("viewBox", "0 0 " + SVG_W + " " + VISIBLE_H);

                        var svg_inner = svg.append("g")
                            .attr("id", "svg-contents")
                            .attr("transform", "translate(0," + -(SVG_H - VISIBLE_H) + ")");

                        var bg = svg_inner.append("g")
                            .attr("id", "background");

                        bg.append("rect")
                            .attr("width", SVG_W)
                            .attr("height", SVG_H)
                            .attr("id", "sky");

                        var clouds = [
                            [-60, 190, 1],
                            [SVG_W * 1.65, SVG_H * 0.65, 0.5],
                            [SVG_W * 0.52, 90, 1.1]
                        ];

                        bg.selectAll(".cloud").data(clouds).enter().append("text")
                            .text("")
                            .attr("class", "cloud")
                            .attr("x", function(cloud) {
                                return cloud[0];
                            })
                            .attr("y", function(cloud) {
                                return cloud[1];
                            })
                            .attr("transform", function(cloud) {
                                return "scale(" + cloud[2] * 1.1 + ", " + cloud[2] + ")";
                            });

                        svg_inner.append("clipPath")
                            .attr("id", "bubble-clip")
                            .append("rect")
                            .attr("x", -SVG_W / 2)
                            .attr("width", SVG_W)
                            .attr("y", -(SVG_H - VISIBLE_EARTH_H + RADIUS_OF_THE_EARTH))
                            .attr("height", SVG_H);

                        var emissions_text = svg_inner.append("g")
                            .attr("transform", "translate(" + SVG_W / 2 + ", 90)")
                            .attr("id", "emissions-text");

                        emissions_text.append("text")
                            .attr("id", "emissions-label")
                            .text("Top 20 emitters in");

                        emissions_text.append("text")
                            .attr("id", "emissions-year")
                            .attr("y", 70);

                        emissions_text.append("text")
                            .attr("id", "emissions-label-note")
                            .text("from fossil fuel and cement")
                            .attr("y", 95);

                        emissions_text.append("text")
                            .attr("class", "explainer")
                            .attr("fill", "#189ACA")
                            .text("Use the controls below to explore")
                            .attr("y", 140);

                        var emissions_group = svg_inner.append("g")
                            .attr("id", "emissions")
                            .attr("transform", "translate(" + SVG_W / 2 + "," + (SVG_H - VISIBLE_EARTH_H + RADIUS_OF_THE_EARTH) + ")")
                            .attr("clip-path", "url(#bubble-clip)");

                        emissions_group.append("circle")
                            .attr("id", "earth")
                            .attr("r", RADIUS_OF_THE_EARTH);

                        var budget = svg_inner.append("g")
                            .attr("id", "budget-holder")
                            .attr("opacity", 0.98)
                            .attr("transform", "translate(" + X_MARGIN + ", " + -(BUDGET_AREA_H + TOP_MARGIN) + ")");

                        budget.append("rect")
                            .attr("id", "budget")
                            .attr("rx", 0)
                            .attr("width", SVG_W - X_MARGIN * 2)
                            .attr("height", BUDGET_AREA_H);

                        budget.append("rect")
                            .attr("id", "cumulative")
                            .attr("width", SVG_W - X_MARGIN * 2)
                            .attr("height", 0)
                            .attr("y", BUDGET_AREA_H);

                        budget.append("g")
                            .attr("id", "cumulative-breakdown");

                        var budget_text = budget.append("g")
                            .attr("id", "budget-text")
                            .attr("transform", "translate(" + (SVG_W - X_MARGIN * 2) / 2 + ",0)");

                        budget_text.append("text")
                            .attr("id", "budget-label")
                            .attr("y", 25)
                            .text("The 2°C emissions budget");

                        var progress = budget_text.append("text")
                            .attr("id", "progress-indicator")
                            .attr("y", 70);

                        progress.append("tspan")
                            .attr("id", "year-label")
                            .text(current_year + " ");

                        progress.append("tspan")
                            .attr("id", "percent-label")
                            .text("0% used");

                        var y = d2.scale.linear()
                            .range([BUDGET_AREA_H, 0])
                            .domain([0, 1]);
                        var yAxis = d2.svg.axis()
                            .scale(y)
                            .orient("left")
                            .ticks(3)
                            .tickSize(10, 0)
                            .tickFormat(d2.format("%"));
                        budget.append("g").attr("class", "y axis").call(yAxis);

                        initControls();
                        updateVisualisation(SLIDER_START_YEAR);

                        $("#wrapper").style("display", "block");
                    }

                    function startScenario() {
                        stopScenario();
                        scenario_ticker = setInterval(function() {
                            if (current_year == DATA_FINAL_YEAR ||
                                (current_scenario != 3 && cumulative_data[current_year].World.Cumulative[current_scenario] >= budget)
                            ) {
                                stopScenario();
                                return;
                            }
                            updateVisualisation(current_year + 1);
                        }, 175)
                    }

                    function stopScenario() {
                        if (scenario_ticker == null) return;
                        clearInterval(scenario_ticker);
                        scenario_ticker = null;
                    }

                    function showScenario(scenario) {
                        current_scenario = scenario;
                        d2.selectAll(".scenario-group").classed("selected", function() {
                            return this.getAttribute("data-scenario-index") == scenario;
                        });

                        // Update the budget to reflect massive efforts on
                        // non-CO2 gases in most ambitious emissions scenario
                        if (scenario == 3) budget = BUDGET_WITH_MINIMISED_NON_CO2;
                        else budget = BUDGET_DEFAULT;

                        if (current_year != SLIDER_END_YEAR + 1) {
                            stopScenario();
                            updateVisualisation(SLIDER_END_YEAR + 1);
                            setTimeout(startScenario, 1500);
                        } else startScenario();
                    }

                    function setSortOrder(order) {
                        current_sort_order = order;
                        updateVisualisation(current_year);
                        $$("#sort-buttons .btn").classed("selected", function() {
                            return this.id == "sort-by-" + order;
                        });
                    }

                    function showSources() {
                        if (sources_showing) return;
                        $("#sources").style("display", "block");
                        $$("#topbar, #main, #controls, #footer").transition().duration(1000).style("left", "200px");
                        sources_showing = true;
                    }

                    function hideSources() {
                        if (!sources_showing) return;
                        var n = 0;
                        $$("#topbar, #main, #controls, #footer").transition().duration(1000).style("left", "0px")
                            .each("start", function() {
                                ++n;
                            })
                            .each("end", function() {
                                if (--n == 0) $("#sources").style("display", "none");
                            });
                        sources_showing = false;
                    }

                    var embed_popup_showing = false;

                    function toggleEmbedPopup() {
                        if (embed_popup_showing) hideEmbedPopUp();
                        else showEmbedPopUp();
                    }

                    function showEmbedPopUp() {
                        $$("#embed-popup").style("display", "block");
                        embed_popup_showing = true;
                    }

                    function hideEmbedPopUp() {
                        $$("#embed-popup").style("display", "none");
                        embed_popup_showing = false;
                    }

                    function toggleSources() {
                        (sources_showing ? hideSources : showSources)();
                    }

                    function initControls() {
                        $("#loop").on("click", function() {
                            ticker ? stopTicker() : startTicker();
                        });

                        $$(".step").on("click", function() {
                            var prev_step = current_step;

                            var step = parseInt(this.id.replace("step-", ""));
                            jumpToStep(step);
                        });

                        $$("#sort-by-continents, #sort-by-CO2").on("click", function() {
                            var new_sort_order = this.id.substr("sort-by-".length);
                            var prev_sort_order = current_sort_order;
                            if (prev_sort_order == new_sort_order) return;
                            setSortOrder(new_sort_order);

                        });

                        $$(".scenario-group").on("click", function() {
                            var scenario = this.getAttribute("data-scenario-index");
                            showScenario(scenario);
                        });

                        $("#sources-button").on("click", function() {
                            d2.event.preventDefault();
                            d2.event.stopPropagation();
                            toggleSources();
                        });

                        $$("#main, #sources i").on("click", function() {
                            hideSources();
                            hideEmbedPopUp();
                        });

                        $("#embed-link").on("click", function() {
                            toggleEmbedPopup();
                        }).on("mousedown", function() {
                            d2.event.preventDefault();
                        });

                        $$("#controls, #steps").on("click", function() {
                        });
                    }

                    function moveTextUp() {
                        $("#budget-text")
                            .transition().duration(750)
                            .attr("transform", "translate(" + (SVG_W - X_MARGIN * 2) / 2 + ", 0)")
                            .attr("fill", "black");
                    }

                    function moveTextDown() {
                        $("#budget-text")
                            .transition().duration(DURATION).delay(0)
                            .attr("transform", "translate(" + (SVG_W - X_MARGIN * 2) / 2 + ", 110)")
                            .attr("fill", "white");
                    }

                    function jumpToStep(step) {
                        if (step > 1) movePlayButtonToCorner();
                        else movePlayButtonToCenter(1000, 1000);

                        if (step < 4) {
                            budget = BUDGET_DEFAULT;
                            moveTextUp();
                        } else moveTextDown();

                        BUBBLE_MARGIN = step < 4 ? 24 : 50;

                        current_step = step;
                        if (step < 4 && current_year > SLIDER_END_YEAR) current_year = SLIDER_END_YEAR;
                        stopScenario();
                        $$(".step").classed("selected", function() {
                            return this.id == "step-" + step;
                        });
                    }

                    function showStep1() {
                        slideIntroIn();
                        slideBudgetOut();
                        updateVisualisation(SLIDER_START_YEAR);
                        updateSliderHandle();
                        slideScenariosOut();
                    }

                    function showStep2() {
                        slideIntroOut();
                        slideBudgetOut();
                        updateVisualisation(current_year);
                        updateSliderHandle();
                        slideScenariosOut();
                    }

                    function showStep3() {
                        slideIntroOut();
                        slideBudgetIn();
                        updateVisualisation(current_year);
                        updateSliderHandle();
                        slideScenariosOut();
                    }

                    function showStep4() {
                        updateVisualisation(SLIDER_END_YEAR + 1);
                        spinCountriesTogether();
                        slideIntroOut();
                        slideBudgetIn();
                        slideScenariosIn();
                    }

                    function slideIntroIn() {
                        $("#svg-contents")
                            .transition().duration(1000)
                            .attr("transform", "translate(0," + -(SVG_H - VISIBLE_H) + ")");
                        $("#intro")
                            .transition().duration(750)
                            .style("bottom", "40px");
                        $("#step-1-text")
                            .transition().duration(750).delay(500)
                            .style("top", "-80px");
                    }

                    function slideIntroOut() {
                        $("#svg-contents")
                            .transition().duration(1000).delay(500)
                            .attr("transform", "translate(0," + 0 + ")");
                        $("#intro")
                            .transition().duration(750)
                            .style("bottom", "-200px");
                        $("#step-1-text")
                            .transition().duration(750).delay(500)
                            .style("top", "80px");
                    }

                    function slideBudgetIn() {
                        $("#emissions-text")
                            .transition().duration(1000).delay(1000)
                            .attr("transform", "translate(" + SVG_W / 2 + ", 500)");
                        $("#budget-holder")
                            .transition().duration(1000).delay(1000)
                            .attr("transform", "translate(" + X_MARGIN + ", " + TOP_MARGIN + ")");
                        $("#bubble-clip rect")
                            .transition().duration(1000).delay(1000)
                            .attr("y", -RADIUS_OF_THE_EARTH - (SVG_H - TOP_MARGIN - BUDGET_AREA_H - VISIBLE_EARTH_H))
                            .attr("height", SVG_H - BUDGET_AREA_H - TOP_MARGIN);
                    }

                    function slideBudgetOut() {
                        $("#emissions-text")
                            .transition().duration(1000).delay(1000)
                            .attr("transform", "translate(" + SVG_W / 2 + ", 90)");
                        $("#budget-holder")
                            .transition().duration(1000).delay(1000)
                            .attr("transform", "translate(" + X_MARGIN + ", " + -(BUDGET_AREA_H + TOP_MARGIN) + ")");
                        $("#bubble-clip rect")
                            .transition().duration(1000).delay(1000)
                            .attr("y", -(SVG_H - VISIBLE_EARTH_H + RADIUS_OF_THE_EARTH))
                            .attr("height", SVG_H);

                    }

                    function spinCountriesTogether() {
                        BUBBLE_MARGIN = 45;
                        $$(".country")
                            .transition().duration(1000)
                            .attr("transform", "rotate(0)")
                            .style("opacity", function(d, i) {
                                if (d["Country name"] != "World") return 0;
                                else return 1;
                            });
                    }

                    function slideScenariosIn() {
                        $$("#scenarios")
                            .transition().duration(1000)
                            .style("bottom", "50px");
                        $$(".hideable-controls")
                            .transition().duration(1000)
                            .style("bottom", "-60px");
                    }

                    function slideScenariosOut() {
                        $$("#scenarios")
                            .transition().duration(1000)
                            .style("bottom", "-500px");
                        $$(".hideable-controls")
                            .transition().duration(1000)
                            .style("bottom", "0px");
                    }

                    function getCumulativeData(data) {
                        var by_year = {},
                            cumulative_by_country = {},
                            cumulative_by_continent = {};
                        for (var i = 0; i < data.length; i++) {
                            var year = data[i].Year,
                                country = data[i]["Country name"],
                                continent = CONTINENTS[COUNTRY_CONTINENT[data[i]["Alpha-3"]]] + " (Continent)",
                                CO2_column = parseFloat(data[i]["Emissions excluding land use (Mt CO2)"]),
                                land_use = parseFloat(data[i]["Emissions from land use (Mt CO2)"]),
                                scenarios = [
                                    parseFloat(data[i][SCENARIOS[0]]),
                                    parseFloat(data[i][SCENARIOS[1]]),
                                    parseFloat(data[i][SCENARIOS[2]]),
                                    parseFloat(data[i][SCENARIOS[3]])
                                ];

                            if (!(country in cumulative_by_country)) cumulative_by_country[country] = [0, 0, 0, 0];
                            if (!(continent in cumulative_by_continent)) cumulative_by_continent[continent] = [0, 0, 0, 0];
                            for (var j = 0; j < scenarios.length; j++) {
                                var CO2 = isNaN(scenarios[j]) ? CO2_column : scenarios[j];
                                cumulative_by_country[country][j] += CO2;
                                cumulative_by_continent[continent][j] += CO2;

                                if (!isNaN(land_use)) {
                                    cumulative_by_country[country][j] += land_use;
                                    cumulative_by_continent[continent][j] += land_use;
                                }

                                if (!(year in by_year)) by_year[year] = {};
                                if (!(country in by_year[year])) {
                                    by_year[year][country] = {
                                        "Annual": [0, 0, 0, 0],
                                        "Cumulative": [0, 0, 0, 0]
                                    };
                                }
                                by_year[year][country].Annual[j] = CO2;
                                by_year[year][country].Cumulative[j] = cumulative_by_country[country][j];

                                if (!(continent in by_year[year])) by_year[year][continent] = {
                                    "Annual": [0, 0, 0, 0],
                                    "Cumulative": [0, 0, 0, 0]
                                }
                                by_year[year][continent].Annual[j] += CO2;
                                by_year[year][continent].Cumulative[j] = cumulative_by_continent[continent][j];
                            }
                        }
                        return by_year;
                    }

                    function loadCO2Data(callback) {
                        d2.csv("../data/greenhousegas.csv", function(data) {
                            CO2_data = data;
                            cumulative_data = getCumulativeData(data);
                            if (callback) callback();
                        });
                    }

                    var slider_core = document.getElementById("slider-core"),
                        slider_handle = $(".slider-handle");

                    function updateSliderHandle() {
                        var slider_width = slider_core.clientWidth;
                        slider_handle.transition().duration(200)
                            .style("left", ((current_year - SLIDER_START_YEAR) / (SLIDER_END_YEAR - SLIDER_START_YEAR) * slider_width) + "px");
                    }

                    function startTicker() {
                        if (ticker != null) return;
                        ticker = setInterval(function() {
                            updateVisualisation(current_year + 1);
                            updateSliderHandle();
                            if (current_year == SLIDER_END_YEAR) stopTicker();
                        }, DURATION);
                        $("#loop-icon").attr("class", "fa fa-pause");
                    }

                    function stopTicker() {
                        if (ticker == null) return;
                        clearInterval(ticker);
                        ticker = null;
                        $("#loop-icon").attr("class", "fa fa-repeat");
                    }

                    function sliderMovedTo(p) {
                        var target_year = Math.round(SLIDER_START_YEAR + (SLIDER_END_YEAR - SLIDER_START_YEAR) * p);
                        updateVisualisation(target_year);
                    }

                    var revert_to_year = null;

                    function undoYearChange(prev_year) {
                        if (revert_to_year != null) return;

                        revert_to_year = prev_year;

                    }

                    function initSlider() {
                        var slider = $("#slider-core"),
                            width = slider.node().clientWidth,
                            handle = $(".slider-handle");

                        $("#slider-start-year").text(SLIDER_START_YEAR);
                        $("#slider-end-year").text(SLIDER_END_YEAR);

                        slider.on("click", function() {
                            d2.event.preventDefault();
                            var prev_year = current_year;
                            var x = d2.mouse(this)[0];
                            handle.transition().duration(250).style("left", x + "px");
                            sliderMovedTo(x / width);
                            if (current_step == 1) jumpToStep(2);
                            undoYearChange(prev_year);
                        });
                        handle.call(d2.behavior.drag().on("drag", function() {
                            var prev_year = current_year;
                            var x = Math.max(0, Math.min(width, d2.event.x));
                            handle.style("left", x + "px");
                            sliderMovedTo(x / width);
                            undoYearChange(prev_year);
                        }));
                    }

                    function getRadius(d) {
                        // Float balloons is in fact sinking balloons when global emissions go negative
                        return Math.max(1, Math.sqrt(Math.abs(d["Emissions excluding land use (Mt CO2)"] || d[SCENARIOS[current_scenario]])) * BUBBLE_SCALE);
                    }

                    function getYearData(year) {
                        if (year <= 2011) {
                            var ret = CO2_data
                                .filter(function(d) {
                                    return d.Year == year && d["Country name"] != "World";
                                })
                                .sort(function compareCO2(a, b) {
                                    return b["Emissions excluding land use (Mt CO2)"] - a["Emissions excluding land use (Mt CO2)"];
                                })
                                .slice(0, NUM_COUNTRIES_VISIBLE);

                            for (var i = 0; i < NUM_COUNTRIES_VISIBLE; i++) {
                                ret[i].rank = i + 1;
                            }

                            if (current_sort_order == "continents") {
                                ret.sort(function compareRegions(a, b) {
                                    if (COUNTRY_CONTINENT[b["Alpha-3"]] > COUNTRY_CONTINENT[a["Alpha-3"]]) return 1;
                                    if (COUNTRY_CONTINENT[b["Alpha-3"]] < COUNTRY_CONTINENT[a["Alpha-3"]]) return -1;
                                    if (COUNTRY_CONTINENT[b["Alpha-3"]] == COUNTRY_CONTINENT[a["Alpha-3"]]) {
                                        return b["Emissions excluding land use (Mt CO2)"] - a["Emissions excluding land use (Mt CO2)"];
                                    }
                                });
                            }

                            return ret.reverse();
                        } else {
                            return CO2_data.filter(function(d) {
                                return d.Year == year && d["Country name"] == "World";
                            });
                        }
                    }

                    function floatBalloon(country, d, year, delay) {
                        if (scenario_ticker != null) {
                            $(country).append("circle").attr("class", "balloon balloon-" + year)
                                .attr("cx", 0)
                                .attr("opacity", 0.8)
                                .attr("cy", -(RADIUS_OF_THE_EARTH + BUBBLE_MARGIN))
                                .attr("r", 0)
                                .transition()
                                .duration(DURATION / 2)
                                .attr("cy", -(RADIUS_OF_THE_EARTH + BUBBLE_MARGIN) - getRadius(d))
                                .attr("r", getRadius(d))
                                .attr("cy", -RADIUS_OF_THE_EARTH - SVG_H + VISIBLE_EARTH_H)
                                .transition()
                                .duration(DURATION)
                                .attr("opacity", 0)
                                .remove();
                        } else {
                            $(country).append("circle").attr("class", "balloon balloon-" + year)
                                .attr("cx", 0)
                                .attr("opacity", 0.8)
                                .attr("cy", -(RADIUS_OF_THE_EARTH + BUBBLE_MARGIN))
                                .attr("r", 0)
                                .transition()
                                .duration(DURATION / 2)
                                .delay(delay)
                                .attr("cy", -(RADIUS_OF_THE_EARTH + BUBBLE_MARGIN) - getRadius(d))
                                .attr("r", getRadius(d))
                                .transition()
                                .duration(DURATION)
                                .attr("opacity", 0)
                                .attr("cy", -RADIUS_OF_THE_EARTH - SVG_H + VISIBLE_EARTH_H)
                                .remove();
                        }
                    }

                    function floatBalloons(year, year_data, delay) {
                        for (var i = 0; i < year_data.length; i++) {
                            var country = countries[0][i],
                                d = year_data[i];
                            if (d["Country name"] == "World" && d[SCENARIOS[current_scenario]] < 0) {
                                sinkBalloon(country, d, year);
                            } else floatBalloon(country, d, year, delay);
                        }
                    }

                    function sinkBalloon(country, d, year) {
                        $(country).append("circle").attr("class", "balloon balloon-" + year)
                            .attr("cx", 0)
                            .attr("opacity", 0)
                            .attr("cy", -RADIUS_OF_THE_EARTH - SVG_H + VISIBLE_EARTH_H)
                            .attr("r", getRadius(d))
                            .transition()
                            .duration(DURATION)
                            .attr("cy", -(RADIUS_OF_THE_EARTH + BUBBLE_MARGIN))
                            .attr("opacity", 0.3)
                            .attr("r", 0)
                            .remove();
                    }

                    function sinkBalloons(year, year_data) {
                        var year_data = getYearData(year);
                        for (var i = 0; i < year_data.length; i++) {
                            var country = countries[0][i],
                                d = year_data[i];
                            sinkBalloon(country, d, year);
                        }
                    }

                    function showInfo(d, i) {
                        var p = d2.mouse(document.getElementById("main")),
                            x = p[0] + 5,
                            y = p[1] + 5,
                            $this = $(this);

                        if ($this.classed("country")) {
                            $("#infobox-country").text(d["Country name"])
                            $("#infobox-stat").text(Math.round(10 * d["Emissions excluding land use (Mt CO2)"]) / 10 + " Mt CO₂ in " + current_year);
                            $("#infobox-rank").text("Rank: " + d.rank);
                        } else if ($this.classed("continent")) {
                            $("#infobox-country").text(CONTINENTS[i] || "Global deforestion & land use change")
                            $("#infobox-stat").text(Math.round(10 * d * 100) / 10 + "% of emissions up to " + current_year);
                            $("#infobox-rank").text("");
                        }

                        var w = document.getElementById("infobox").clientWidth;
                        if (x > window.innerWidth - w) x -= w;

                        $("#infobox")
                            .style("left", x + "px")
                            .style("top", y + "px")
                            .style("opacity", 1);
                    }

                    function hideInfo() {
                        $("#infobox").style("opacity", 0);
                    }

                    function updateVisualisation(target_year) {

                        var prev_year = current_year;
                        current_year = target_year;
                        var rewinding = prev_year != null && (target_year <= prev_year);

                        var current_year_data = getYearData(current_year);
                        window.countries = $("#emissions").selectAll("g")
                            .data(current_year_data, function(d) {
                                return d["Country name"];
                            });

                        var enter = countries.enter().append("g")
                            .classed("country", true)
                            .style("fill", function(d) {
                                return CONTINENTS_COLS[COUNTRY_CONTINENT[d["Alpha-3"]]];
                            })
                            .attr("transform", current_year_data.length > 1 ? "rotate(-90)" : "rotate(0)")
                            .on("mouseenter", showInfo)
                            .on("mouseleave", hideInfo);

                        if (current_year_data.length > 1) {
                            enter.append("circle").attr("class", "shadow")
                                .attr("cx", 0)
                                .attr("cy", -(RADIUS_OF_THE_EARTH + BUBBLE_MARGIN));
                        }

                        enter.append("text").classed("country-label", true)
                            .attr("transform", "rotate(90) translate(" + -(RADIUS_OF_THE_EARTH - 5) + "," + 5 + ")")
                            .attr("font-size", function(d, i) {
                                if (d["Country name"] == "World") return 25;
                                else return 22;
                            })
                            .text(function(d, i) {
                                var country_name = d["Country name"];
                                if (d["Country name"] == "United States of America") country_name = "USA";
                                if (d["Country name"] == "Russian Federation") country_name = "Russia";
                                if (d["Country name"] == "United Kingdom") country_name = "UK";
                                if (d["Country name"] == "Czech Republic") country_name = "Czech Rep";
                                return country_name;
                            });

                        enter.append("polygon")
                            .attr("points", "11.661,10.258 10.683,1.409 8.428,1.409 7.391,10.258 6.846,10.258 5.5,-1.909 3.245,-1.909 1.819,10.258 -1,10.258 -1,18 14.484,18 14.484,10.258")
                            .attr("transform", function(d, i) {
                                if (d["Country name"] == "World") return "translate(-11," + -(RADIUS_OF_THE_EARTH + 36) + ") scale(2)";
                                else return "translate(-5," + -(RADIUS_OF_THE_EARTH + 18) + ")";
                            });

                        countries
                            .transition()
                            .duration(DURATION)
                            .style("opacity", 1)
                            .attr("transform", function(d, i) {
                                var r = COUNTRY_SPACING_IN_DEGREES * (i - NUM_COUNTRIES_VISIBLE / 2);
                                return current_year_data.length > 1 ? "rotate(" + r + ")" : "rotate(0)";
                            });

                        countries.exit()
                            .transition()
                            .duration(DURATION / 2)
                            .style("opacity", 0)
                            .remove();

                        for (var year = prev_year; year > target_year; year--) {
                            sinkBalloons(year, getYearData(year));
                        }

                        for (var year = prev_year + 1; year <= target_year; year++) {
                            var data = getYearData(year);
                            floatBalloons(year, data, DURATION / 2 / (target_year - year + 2));
                        }

                        countries.select("circle.shadow")
                            .interrupt()
                            .transition().duration(0)
                            .attr("cy", function(d) {
                                return -(RADIUS_OF_THE_EARTH + BUBBLE_MARGIN) - getRadius(d);
                            })
                            .attr("r", 0)
                            .style("opacity", 0)
                            .transition().duration(100).delay(DURATION)
                            .attr("r", getRadius)
                            .style("opacity", 0.5);

                        var cumulative = cumulative_data[current_year].World.Cumulative[current_scenario],
                            proportion_of_budget = cumulative / budget,
                            cumulative_H = BUDGET_AREA_H * proportion_of_budget;

                        $("#cumulative")
                            .transition()
                            .duration(scenario_ticker != null ? DURATION / 10 : DURATION / 3)
                            .delay(rewinding || scenario_ticker != null || current_step == 4 ? 100 : CUMULATIVE_DELAY)
                            .attr("height", Math.max(1, cumulative_H))
                            .attr("y", BUDGET_AREA_H - cumulative_H)
                            .style("fill", function() {
                                var red_begins = 0.8,
                                    s = Math.max(0, 100 * (proportion_of_budget - red_begins) / (1 - red_begins)),
                                    l = Math.max(0, Math.min(50, 47 * (proportion_of_budget - red_begins) / (1 - red_begins)));
                                return "hsl(0," + s + "%, " + l + "%)";
                            });

                        var continent_cumulative_proportions = [];
                        for (var i = 0; i < CONTINENTS.length; i++) {
                            var c = CONTINENTS[i] + " (Continent)",
                            c_cumulative = cumulative_data[current_year][c],
                                c_proportion = (c_cumulative && c_cumulative.Cumulative) ? c_cumulative.Cumulative[current_scenario] / cumulative : 0;

                            // Note we are setting negative proportions to 0 here for simplicity
                            // for now, but needs more thought
                            continent_cumulative_proportions.push(Math.max(0, c_proportion));
                        }
                        var cumulative_total = d2.sum(continent_cumulative_proportions);
                        if (cumulative_total > 0) {
                            continent_cumulative_proportions.push(1.0 - cumulative_total);
                        } else {
                            continent_cumulative_proportions.push(0);
                        }

                        var breakdown = $("#cumulative-breakdown")
                            .selectAll("g")
                            .data(continent_cumulative_proportions)
                            .on("mouseenter", showInfo)
                            .on("mouseleave", hideInfo);

                        var x_offset_running_total = 0;
                        var enter = breakdown.enter().append("g")
                            .attr("class", "continent")
                            .attr("id", function(d, i) {
                                return CONTINENTS[i]
                            })
                            .attr("fill", function(d, i) {
                                return CONTINENTS_COLS[i]
                            })
                            .attr("transform", function(d, i) {
                                var x_offset = x_offset_running_total;
                                x_offset_running_total += d * (SVG_W - X_MARGIN * 2);
                                return "translate(" + x_offset + "," + (BUDGET_AREA_H - cumulative_H) + ")";
                            });

                        enter.append("rect")
                            .attr("width", function() {
                                return this.parentNode.__data__ * (SVG_W - X_MARGIN * 2);
                            });
                        enter.append("text")
                            .text(function(d, i) {
                                return CONTINENTS[i] || "Deforestation & land use";
                            })
                            .attr("opacity", 0);

                        x_offset_running_total = 0;
                        breakdown.transition()
                            .duration(DURATION / 3)
                            .delay(rewinding || current_step == 4 ? 0 : CUMULATIVE_DELAY)
                            .attr("transform", function(d, i) {
                                var x_offset = x_offset_running_total;
                                x_offset_running_total += d * (SVG_W - X_MARGIN * 2);
                                return "translate(" + x_offset + "," + (BUDGET_AREA_H - cumulative_H) + ")";
                            });

                        breakdown.exit().remove();

                        $("#cumulative-breakdown")
                            .selectAll("rect")
                            .transition()
                            .duration(DURATION / 3)
                            .delay(rewinding || current_step == 4 ? 0 : CUMULATIVE_DELAY)
                            .attr("height", Math.max(1, cumulative_H))
                            .attr("width", function() {
                                return this.parentNode.__data__ * (SVG_W - X_MARGIN * 2);
                            });

                        $("#cumulative-breakdown")
                            .selectAll("text")
                            .transition()
                            .duration(DURATION / 3)
                            .delay(rewinding || current_step == 4 ? 0 : CUMULATIVE_DELAY)
                            .attr("transform", "translate(3," + (cumulative_H - 7) + ")")
                            .attr("opacity", function() {
                                var block_width = this.parentNode.__data__ * (SVG_W - X_MARGIN * 2);
                                return block_width > 3 + this.getComputedTextLength() + 3 &&
                                    cumulative_H > 16 ?
                                    1 : 0;
                            });

                        var percent_of_budget = Math.round(10 * proportion_of_budget * 100) / 10;
                        $$("#year-label, #emissions-year")
                            .text(current_year + " ");
                        $("#percent-label")
                            .transition()
                            .duration(0)
                            .text(percent_of_budget + "% used");
                    }


                    // Timeline functions
                    function changeStep(to) {
                        return function() {
                            var from = current_step;
                            jumpToStep(to);
                            this.setUndo(function() {
                                jumpToStep(from);
                            });
                        };
                    }

                    function changeYear(to) {
                        return function() {
                            updateVisualisation(to);
                            updateSliderHandle();

                            this.setUndo(function() {
                                // Since the year states persist for only a few seconds,
                                // we need not undo them. Skipping this undo improves
                                // performance when restarting from the beginning.
                            });
                        };
                    }

                    function changeSortOrder(to) {
                        return function() {
                            var from = current_sort_order;
                            setSortOrder(to);
                            this.setUndo(function() {
                                setSortOrder(from);
                            });
                        };
                    }

                    function playScenario(current_scenario) {
                        return function() {
                            showScenario(current_scenario);
                            this.setUndo(function() {
                                // Intentionally left blank
                            });
                        }
                    }


                    function tweenPercentage(from, to) {
                        return function() {
                            return d2.interpolateString(from + "%", to + "%");
                        };
                    }

                    function movePlayButtonToCorner(duration, delay) {
                        if (typeof duration == "undefined") duration = 750;
                        if (typeof delay == "undefined") delay = 250;
                        if (play_button_in_corner) return;
                        $("#play-button")
                            .transition().delay(delay).duration(duration)
                            .style("width", "50px")
                            .style("height", "50px")
                            .styleTween("right", tweenPercentage(50, 100))
                            .styleTween("bottom", tweenPercentage(50, 0))
                            .style("margin-right", "-60px")
                            .style("margin-bottom", "10px");
                        play_button_in_corner = true;
                    }

                    function movePlayButtonToCenter(duration, delay) {
                        if (typeof duration == "undefined") duration = 750;
                        if (typeof delay == "undefined") delay = 0;
                        if (!play_button_in_corner) return;
                        var play_button = $("#play-button"),
                            play_button_placeholder = $("#play-button-placeholder");
                        play_button
                            .transition().delay(delay).duration(duration)
                            .styleTween("right", tweenPercentage(100, 50))
                            .styleTween("bottom", tweenPercentage(0, 50))
                            .style("width", play_button_placeholder.style("width"))
                            .style("height", play_button_placeholder.style("height"))
                            .style("margin-right", play_button_placeholder.style("margin-right"))
                            .style("margin-bottom", play_button_placeholder.style("margin-bottom"))
                            .each("end", function() {
                                play_button
                                    .style("width", null)
                                    .style("height", null)
                                    .style("margin-right", null)
                                    .style("margin-bottom", null);
                            });
                        play_button_in_corner = false;
                    }

                    function createPlayButton(container_selector, timeline, track) {
                        var container = $(container_selector);
                        container.append("div").attr("id", "play-button-placeholder");
                        var button = container.append("svg")
                            .attr("id", "play-button")
                            .attr("viewBox", "0 0 100 100");
                        button.append("circle")
                            .attr("cx", "50")
                            .attr("cy", "50")
                            .attr("r", "50")
                            .attr("fill", "rgba(0,0,0,0.5)");
                        button.append("path")
                            .attr("transform", "translate(50,50) rotate(180)")
                            .attr("fill", "white");
                        button.append("circle")
                            .attr("cx", "50")
                            .attr("cy", "50")
                            .attr("r", "37")
                            .attr("fill", "rgba(40,40,40,1)");
                        button.append("polygon")
                            .attr("id", "play-icon")
                            .attr("class", "play-pause")
                            .attr("pointer-events", "none")
                            .attr("transform", "translate(4,6)")
                            .attr("points", "67.304,45.832 34.619,67.329 32.47,65.498 32.47,22.258 35.23,20.67 67.304,43.878");
                        button.append("path")
                            .attr("id", "pause-icon")
                            .attr("pointer-events", "none")
                            .attr("class", "play-pause")
                            .attr("transform", "translate(4,6)")
                            .attr("d", "M36.499,63.559H29.98L26.72,60.3V27.701l3.26-3.26h6.519l3.157,3.26V60.3L36.499,63.559z M62.475,63.559h-6.519L52.695,60.3V27.701l3.261-3.26h6.519l3.157,3.26V60.3L62.475,63.559z");

                        track.addEventListener("timeupdate", function() {
                            $("#talkie-player-segment")
                                .attr("d", function() {
                                    var dot_radius = 50;
                                    var p = track.currentTime / track.duration;
                                    var s = "M 0 0 v [r]";
                                    if (p > 0.5) s += " A [r] [r] 0 0 1 0 -[r]";
                                    s += " A [r] [r] 0 0 1 [x] [y] z";

                                    s = s.replace(/\[r\]/g, dot_radius);
                                    s = s.replace(/\[x\]/g, -dot_radius * Math.sin(2 * Math.PI * p));
                                    s = s.replace(/\[y\]/g, dot_radius * Math.cos(2 * Math.PI * p));

                                    return s
                                });
                        });




                        var pt = button.node().createSVGPoint(),
                            scrubbing = false;

                        function scrub() {
                            if (!scrubbing) return;
                            var bbox = this.getBBox();
                            pt.x = d2.event.clientX;
                            pt.y = d2.event.clientY;
                            pt = pt.matrixTransform(this.getScreenCTM().inverse());
                            var x = pt.x - bbox.width / 2,
                                y = pt.y - bbox.height / 2;
                            theta = Math.PI / 2 + Math.atan2(y, x);
                            while (theta < 0) theta += Math.PI * 2;
                            var t = track.duration * theta / (Math.PI * 2);
                            track.currentTime = t;
                        }

                        $("#play-button #talkie-player-outer")
                            .on("mousedown", function() {
                                d2.event.preventDefault();
                                scrubbing = true;
                                scrub.call(this);
                            })
                            .on("mousemove", scrub);
                        $(document).on("mouseup", function() {
                            scrubbing = false;
                        })
                    }

                    function init() {
                        loadCO2Data(function() {
                            initViz();
                            initSlider();

                        });
                    }
                    init();
                }
            };
        });
})();
