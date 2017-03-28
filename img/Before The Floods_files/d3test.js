(function () {
  var baseUrl = "http://api.openweathermap.org/";
  var apiid = "dd1e70fef626370ab142309e1ea51374";
  var currentWeatherUrl = "";
  var futureWeatherUrl = "";
  var pastWeatherUrl = "";


  function constructor(){
    d3.request(currentWeatherUrlBuilder("33.38","-111.93")).get(function (response) {
      var res = JSON.parse(response.response);

      //displayWeatherGraph(res.main);
    });

    d3.request(futureWeatherUrlBuilder("33.38","-111.93")).get(function (response) {
      var res = JSON.parse(response.response);
      displayWeatherGraph(res.list);
    });

  }


  function currentWeatherUrlBuilder(lat, long) {
    currentWeatherUrl = baseUrl +
                        "data/2.5/weather?" +
                        "lat=" + lat + "&" + "lon=" + long + "&" +
                        "appid=" + apiid + "&" +
                        "&units=metric";

    return currentWeatherUrl;
  }

  function futureWeatherUrlBuilder(lat, long) {
    currentWeatherUrl = baseUrl +
                        "data/2.5/forecast?" +
                        "lat=" + lat + "&" + "lon=" + long + "&" + "cnt=15" + "&" +
                        "appid=" + apiid + "&" +
                        "&units=metric";

    return currentWeatherUrl;
  }

  function displayWeatherGraph(data){
      // Set the dimensions of the canvas / graph
      var margin = {top: 30, right: 20, bottom: 30, left: 20},
          width = 650 - margin.left - margin.right,
          height = 250 - margin.top - margin.bottom;

      // Set the ranges
      // var x = d3.time.scale().range([0, width]);
      // var y = d3.scale.linear().range([height, 0]);

      var svg = d3.select("#weatherDetail").append('svg')
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform",
              "translate(" + margin.left + "," + margin.top + ")");
      var parseTime = d3.timeParse("%d-%b-%y");
      console.log(data);
      var lineData = [],
          day = {};
      var date = "";
      data.forEach(function (d) {
          //console.log(parseTime(date));
          day = {date: parseTime(new Date(d.dt_txt)) , temp : +d.main.temp }
          lineData.push(day);
      });
      console.log(lineData[0].date);
      data = lineData;
      var x = d3.scaleLinear().range([0, width]);
      var y = d3.scaleLinear().range([height, 0]);

      // define the line
      var valueline = d3.line()
          .x(function(d) { return x(d.date); })
          .y(function(d) { return y(d.temp); });

      // Scale the range of the data
      x.domain(d3.extent(data, function(d) { return d.date; }));
      y.domain([0, d3.max(data, function(d) { return d.temp; })]);

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
  }


  constructor();
}());
