(function () {
  var baseUrl = "http://api.openweathermap.org/";
  var apiid = "dd1e70fef626370ab142309e1ea51374";
  var currentWeatherUrl = "";
  var futureWeatherUrl = "";
  var pastWeatherUrl = "";


  function constructor(){
    d3.request(currentWeatherUrlBuilder("33.38","-111.93")).get(function (response) {
      var res = JSON.parse(response.response);
      console.log("Current weather data");
      console.log(res);
    });

    d3.request(futureWeatherUrlBuilder("33.38","-111.93")).get(function (response) {
      var res = JSON.parse(response.response);
      console.log("Future weather data");

      console.log(res);
    });

  }


  function currentWeatherUrlBuilder(lat, long) {
    currentWeatherUrl = baseUrl +
                        "data/2.5/weather?" +
                        "lat=" + lat + "&" + "lon=" + long + "&" +
                        "appid=" + apiid;

    return currentWeatherUrl;
  }

  function futureWeatherUrlBuilder(lat, long) {
    currentWeatherUrl = baseUrl +
                        "data/2.5/forecast?" +
                        "lat=" + lat + "&" + "lon=" + long + "&" + "cnt=15" + "&" +
                        "appid=" + apiid;

    return currentWeatherUrl;
  }


  constructor();
}());
