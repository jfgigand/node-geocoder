var util             = require('util'),
    AbstractGeocoder = require('./abstractgeocoder'),
    parseXml         = require('xml2js').parseString;

// var request = require("request");

/**
 * Constructor
 */
var FrenchMappingAgencyGeocoder = function FrenchMappingAgencyGeocoder(httpAdapter, options) {
    this.options = ['apiKey'];

    FrenchMappingAgencyGeocoder.super_.call(this, httpAdapter, options);
};

util.inherits(FrenchMappingAgencyGeocoder, AbstractGeocoder);

function escapeXml(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

/**
* Geocode
* @param <string|object>   value    Value to geocode (Address or parameters, as specified at https://opendatafrance/api/)
* @param <function> callback Callback method
*/
FrenchMappingAgencyGeocoder.prototype._geocode = function(value, callback) {
    var _this = this;

    // var params = this._getCommonParams();
    var params = {};

    if (typeof value == 'string') {
      // params.q = value;

      var body =
            '<?xml version="1.0" encoding="UTF-8"?>'+
            '<XLS'+
            '  xmlns:xls="http://www.opengis.net/xls"'+
            '  xmlns:gml="http://www.opengis.net/gml"'+
            '  xmlns="http://www.opengis.net/xls"'+
            '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"'+
            '  version="1.2"'+
            '  xsi:schemaLocation="http://www.opengis.net/xls http://schemas.opengis.net/ols/1.2/olsAll.xsd">'+
            '    <RequestHeader/>'+
            '    <Request requestID="1" version="1.2" methodName="LocationUtilityService">'+
            '       <GeocodeRequest returnFreeForm="false">'+
            '         <Address countryCode="StreetAddress,PositionOfInterest">'+
            '                <freeFormAddress>'+escapeXml(value)+'</freeFormAddress>'+
            '         </Address>'+
            '       </GeocodeRequest>'+
            '    </Request>'+
            '</XLS>';
      var headers = {
        "Content-Type": "text/xml",
        // "Content-Length": ""+body.length
      };

    } else {
      throw new Error("structured geocoding request is not managed by this class yet");
    }
    this._forceParams(params);

  var url = "http://wxs.ign.fr/"+this.options.apiKey+"/geoportail/ols";

  // console.log("params", params);
  console.log("this.httpAdapter", this.httpAdapter);
  // request({url: url, method: "POST", body: body, headers: headers},
  // this.httpAdapter({url: url, method: "POST", body: body, headers: headers},
  this.httpAdapter.post(url, params, body, headers,
                                         function(err, result) {
        if (err) {
            return callback(err);
        } else {

            if (result.error) {
              return callback(new Error(result.error));
            }

          parseXml(result, function(err, xml) {
            var results = [];

            console.log("xml", xml);
            // if (result.features) {
            //   for (var i = 0; i < result.features.length; i++) {
            //     results.push(_this._formatResult(result.features[i]));
            //   }
            // }

            results.raw = result;
            callback(false, results);
            });
        }

    });

};

FrenchMappingAgencyGeocoder.prototype._formatResult = function(result) {

    var latitude = result.geometry.coordinates[1];
    if (latitude) {
      latitude = parseFloat(latitude);
    }

    var longitude = result.geometry.coordinates[0];
    if (longitude) {
      longitude = parseFloat(longitude);
    }

    var properties = result.properties;

    var formatedResult = {
        latitude : latitude,
        longitude : longitude,
        state : properties.context,
        city : properties.city,
        zipcode : properties.postcode,
        citycode : properties.citycode,
        countryCode : 'FR',
        country : 'France',
        type: properties.type,
        id: properties.id
    };

    if (properties.type === 'housenumber') {
      formatedResult.streetName = properties.street;
      formatedResult.streetNumber = properties.housenumber;
    } else if (properties.type === 'street') {
      formatedResult.streetName = properties.name;
    } else if (properties.type === 'city') {
      formatedResult.population = properties.population;
      formatedResult.adm_weight = properties.adm_weight;
    } else if (properties.type === 'village') {
      formatedResult.population = properties.population;
    } else if (properties.type === 'locality') {
      formatedResult.streetName = properties.name;
    }

    return formatedResult;
};

/**
* Reverse geocoding
* @param {lat:<number>,lon:<number>, ...}  lat: Latitude, lon: Longitude, ... see https://wiki.openstreetmap.org/wiki/Nominatim#Parameters_2
* @param <function> callback Callback method
*/
FrenchMappingAgencyGeocoder.prototype._reverse = function(query, callback) {

    var _this = this;

    var params = this._getCommonParams();
    for (var k in query) {
      var v = query[k];
      params[k] = v;
    }
    this._forceParams(params);

    this.httpAdapter.get(this._endpoint_reverse , params, function(err, result) {
        if (err) {
            return callback(err);
        } else {

          if(result.error) {
            return callback(new Error(result.error));
          }

          var results = [];

          if (result.features) {
            for (var i = 0; i < result.features.length; i++) {
              results.push(_this._formatResult(result.features[i]));
            }
          }

          results.raw = result;
          callback(false, results);
        }
    });
};

/**
* Prepare common params
*
* @return <Object> common params
*/
FrenchMappingAgencyGeocoder.prototype._getCommonParams = function(){
    var params = {};

    for (var k in this.options) {
      var v = this.options[k];
      if (!v) {
        continue;
      }
      if (k === 'language') {
        k = 'accept-language';
      }
      params[k] = v;
    }

    return params;
};

FrenchMappingAgencyGeocoder.prototype._forceParams = function(params){
  params.limit = 20;
};

module.exports = FrenchMappingAgencyGeocoder;
