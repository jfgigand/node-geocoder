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
  // console.log("this.httpAdapter", this.httpAdapter);
  // request({url: url, method: "POST", body: body, headers: headers},
  // this.httpAdapter({url: url, method: "POST", body: body, headers: headers},

  this.httpAdapter.post(url, params, body, headers, function(err, result) {
    if (err) {
      return callback(err);
    } else {

      if (result.error) {
        return callback(new Error(result.error));
      }

      parseXml(result, function(xmlErr, xml) {
        if (xmlErr) {
          err(xmlErr);
        }
        console.log("xml", xml);
        var results =
              xml.XLS.Response[0].GeocodeResponse[0].GeocodeResponseList[0].GeocodedAddress
              .map(this._formatResult, this);

        // if (result.features) {
        //   for (var i = 0; i < result.features.length; i++) {
        //     results.push(_this._formatResult(result.features[i]));
        //   }
        // }

        results.raw = result;
        callback(false, results);
      }.bind(this));
    }

  }.bind(this));

};

FrenchMappingAgencyGeocoder.matchTypes = {
  "Street number": "house",
};

FrenchMappingAgencyGeocoder.prototype._formatResult = function(result) {
  // https://github.com/IGNF/geoportal-access-lib/blob/master/src/Services/Geocode/Formats/DirectGeocodeResponseReader.js

  var point = result["gml:Point"][0]["gml:pos"][0].trim().split(/ +/);

  var formattedResult = {
    type: FrenchMappingAgencyGeocoder.matchTypes[result.GeocodeMatchCode[0].$.matchType] || "other",
    accuracy: parseFloat(result.GeocodeMatchCode[0].$.accuracy),
    country: "France",
    countryCode: "FR",
    latitude: parseFloat(point[0]),
    longitude: parseFloat(point[1]),
    zipcode: result.Address[0].PostalCode[0]
  };
  var streetAddress = result.Address[0].StreetAddress[0];
  if (streetAddress.Building) {
    formattedResult.streetNumber = streetAddress.Building[0].$.number;
  }
  if (streetAddress.Street[0]) {
    formattedResult.streetName = streetAddress.Street[0];
  }

  result.Address[0].Place.forEach(function(place) {
    var placeType = place.$.type;
    var placeName = place._;

    if (0) {
    // } else if ( placeType === "Municipality" ) {
    //   formattedResult.municipality = placeName;

    // } else if ( placeType === "Bbox" ) {
    //   var values = placeName.split(";");
    //   if ( values.length === 4 ) {
    //     formattedResult.bbox = {
    //       left : parseFloat(values[0]),
    //       right : parseFloat(values[2]),
    //       top : parseFloat(values[1]),
    //       bottom : parseFloat(values[3])
    //     };
    //   }

    } else if ( placeType === "Commune" ) {
      formattedResult.city = placeName;

    // } else if ( placeType === "Departement" ) {
    //   formattedResult.department = placeName;

    // } else if ( placeType === "INSEE" ) {
    //   formattedResult.insee = placeName;

    // } else if ( placeType === "Qualite" ) {
    //   formattedResult.quality = placeName;

    // } else if ( placeType === "Territoire" ) {
    //   formattedResult.territory = placeName;

    // } else if ( placeType === "ID" ) {
    //   formattedResult.id = placeName;

    // } else if ( placeType === "ID_TR" ) {
    //   formattedResult.IDTR = placeName;

    // } else if ( placeType === "Importance" ) {
    //   formattedResult.importance = parseInt(placeName, 10);

    // } else if ( placeType === "Nature" ) {
    //   formattedResult.nature = placeName;

    // } else if ( placeType === "Numero" ) {
    //   formattedResult.number = placeName;

    // } else if ( placeType === "Feuille" ) {
    //   formattedResult.sheet = placeName;

    // } else if ( placeType === "Section" ) {
    //   formattedResult.section = placeName;

    // } else if ( placeType === "CommuneAbsorbee" ) {
    //   formattedResult.absorbedCity = placeName;

    // } else if ( placeType === "Arrondissement" ) {
    //   if ( placeName ) {
    //     formattedResult.arrondissement = placeName;
    //   }

    // } else if ( placeType === "Type" ) {
    //   formattedResult.origin = placeName;

    // } else if ( placeType === "Prefecture" ) {
    //   formattedResult.prefecture = placeName;

    // } else if ( placeType === "InseeRegion" ) {
    //   formattedResult.inseeRegion = placeName;

    // } else if ( placeType === "InseeDepartment" ) {
    //   formattedResult.inseeDepartment = placeName;

    }
  });

  return formattedResult;
};

// /**
//  * Reverse geocoding
//  * @param {lat:<number>,lon:<number>, ...}  lat: Latitude, lon: Longitude, ... see https://wiki.openstreetmap.org/wiki/Nominatim#Parameters_2
//  * @param <function> callback Callback method
//  */
// FrenchMappingAgencyGeocoder.prototype._reverse = function(query, callback) {

//   var _this = this;

//   var params = this._getCommonParams();
//   for (var k in query) {
//     var v = query[k];
//     params[k] = v;
//   }
//   this._forceParams(params);

//   this.httpAdapter.get(this._endpoint_reverse , params, function(err, result) {
//     if (err) {
//       return callback(err);
//     } else {

//       if(result.error) {
//         return callback(new Error(result.error));
//       }

//       var results = [];

//       if (result.features) {
//         for (var i = 0; i < result.features.length; i++) {
//           results.push(_this._formatResult(result.features[i]));
//         }
//       }

//       results.raw = result;
//       callback(false, results);
//     }
//   });
// };

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
