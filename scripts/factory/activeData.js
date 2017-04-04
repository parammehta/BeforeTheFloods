(function () {

'use strict';

	//Load controller
  	angular.module('d3App').service('activeData', function(){

      this.cityName = "";
      this.cityLatitude = "";
      this.cityLongitude = "";

      this.setCityName = function(cityName){
         this.cityName = cityName;
      };

      this.getCityName = function(){
         return this.cityName;
      };

      this.setCityLatitude = function(cityLatitude){
         this.cityLatitude = cityLatitude;
      };

      this.getCityLatitude = function(){
         return this.cityLatitude;
      };

      this.setCityLongitude = function(cityLongitude){
         this.cityLongitude = cityLongitude;
      };

      this.getCityLongitude = function(){
         return this.cityLongitude;
      };
      
  	});

})();
