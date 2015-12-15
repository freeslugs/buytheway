import {default as React, Component} from "react";
import {default as ReactDOM} from "react-dom";
import {default as update} from "react-addons-update";

import { GoogleMap, Marker, SearchBox, DirectionsRenderer } from "react-google-maps";

require("babel-polyfill");

const DirectionsService = new google.maps.DirectionsService();
const Geocoder = new google.maps.Geocoder();

class ListHeader extends Component {

  render() {
    var backBtn;
    if(this.props.view != 0) {
      backBtn = <button id="backBtn" className="button icon-left ion-chevron-left button-calm" onClick={this.props.goBack}>Back</button>
    }
    return (
      <div id="header" className="bar bar-header bar-calm">
        {backBtn}
        <h1 className="title">Buy The Way</h1>
        <button id="toggleBtn" className="button icon-right button-calm" onClick={this.props.toggleMap}>Map</button>
      </div>
    );
  }
}

class List extends Component {

  constructor(props) {
    super(props);
    this.state = {
      view: 0,
      hideView: false,
      restaurantsList: []
    };
  }

  toggleMap() {
    //do stuff to hide the list and display map only
    $("#list-wrapper").css("background-color", `rgba(255,255,255,${this.state.hideView ? 0.8 : 0})`); //better way of doing this?
    this.setState({hideView: !this.state.hideView});
  }

  populateRestaurantsList(restaurantsList) {
    this.setState({restaurantsList, view: 1});
  }

  goBack() {
    this.setState({view: 0});
    // todo: state.view -= 1
  }

  render () {
    var content;
    // todo: js switch statement
    if(this.state.view == 0) {
      content = <RouteForm {...this.props} populateRestaurantsList={this.populateRestaurantsList.bind(this)}/>;
    } else if(this.state.view == 1) {
      content = <RestaurantsList restaurantsList={this.state.restaurantsList}/>;
    }
    return (
      <div id="list-wrapper">
        <ListHeader view={this.state.view} toggleMap={this.toggleMap.bind(this)} goBack={this.goBack.bind(this)}/>
        {this.state.hideView ? null : content}
      </div>
    );
  }
}

class RestaurantsItem extends Component {
  render() {
    return (
    <a className="item item-thumbnail-left" href={this.props.restaurant.url} key={this.props.restaurant.id}>
      <img src={this.props.restaurant.image_url}></img>
      <h2>{this.props.restaurant.name}</h2>
      <img src={this.props.restaurant.rating_img_url}></img>
    </a>);
  }
}

class RestaurantsList extends Component {
  render() {
    // todo: Each child in an array or iterator should have a unique "key" prop. Check the render method of `RestaurantsList
    return (
      <div id="restaurant-list-wrapper">
        <ul className="list">
          {this.props.restaurantsList.map((restaurant) => { return (<RestaurantsItem restaurant={restaurant} />) } )}
        </ul>
      </div>
    );
  }

}

class RouteForm extends Component {

  constructor(props) {
    super(props);
    this.state = {
      to: null,
      from: null
    };
  }

  plotDirections() {
    // if only one point exists, plot marker
    // if both points exist, plot directions

    // prevent re-rendering already plotted values
    if(this.state.to === this.refs.to.value && this.state.from === this.refs.from.value) return;
    this.props.clearMarkers();
    var to = this.state.to = this.refs.to.value;
    var from = this.state.from = this.refs.from.value;
    if(to && !from) {
      this.props.plotMarker(to);
    }
    else if(!to && from) {
      this.props.plotMarker(from);
    }
    else if(to && from) {
      this.props.plotDirections(from, to);
    }

  }

  async getWayPoint() {
    try {
      var response = await fetch(toYQL(`http://dev.virtualearth.net/REST/V1/Routes/Driving?wp.0=${encodeURIComponent(this.state.from)}&wp.1=${encodeURIComponent(this.state.to)}&key=AsxRw39EkmNBVgqP9Q5W9HKBN9_HzOIMYPWxcFUj4Ys8GluFcJgA6GUPD1YkNtG2&ra=routepath`));
      var route = await response.json();
      console.log(route);
      var routeLegs = route.query.results.json.resourceSets.resources.routeLegs;
      var timeLeft = this.refs.time.value * 60;
      var waypoint = routeLegs.endLocation.geocodePoints.coordinates; //if timeLeft is more than total travel time
      await routeLegs.itineraryItems.every(function(path, index) {
        if(timeLeft < 0) {
          waypoint = this.getClosestPt(route, index, timeLeft);
          console.log(path.maneuverPoint.coordinates);
          // waypoint = path.maneuverPoint.coordinates;
          return false;
        } else {
          timeLeft = timeLeft - path.travelDuration;
          return true;
        }
      }, this);
      console.log(waypoint);
      return new google.maps.LatLng(waypoint[0], waypoint[1]);
    } catch(e) {
      console.log(`error fetching waypoint: ${ e.stack }`);
    }
  }

  getClosestPt(route, index, timeLeft) {
    //timeLeft is going to be negative, so we backtrack
    console.log(route + " " + timeLeft + " " + index);
    // var meanSpeed = 50; //50 mph
    var routeLegs = route.query.results.json.resourceSets.resources.routeLegs;
    var routePath = route.query.results.json.resourceSets.resources.routePath.line.coordinates;
    var meanSpeed = routeLegs.itineraryItems[index].travelDistance / (routeLegs.itineraryItems[index].travelDuration / 3600) / 1.609; //mph
    var curIdx = routeLegs.itineraryItems[index].details.startPathIndices || routeLegs.itineraryItems[index].details[0].startPathIndices;
    console.log(curIdx);
    while(timeLeft < 0 && curIdx > 0) {
      console.log(timeLeft + " " + curIdx);
      timeLeft = timeLeft + Math.abs(dist(routePath[curIdx].json[0], routePath[curIdx].json[1], routePath[curIdx-1].json[0], routePath[curIdx-1].json[1]))/meanSpeed*3600;
      curIdx = curIdx - 1;
    }
    console.log(routePath[curIdx] + " " + curIdx);
    return routePath[curIdx].json;
  }

  async submitRoute(e) {
    // format url
    // make request
    // parse data
    // render
    e.preventDefault();
    try {
      var yelpReq, fYelpReq, waypoint;
      // get waypoint
      waypoint = await this.getWayPoint();
      // generate yelp api request
      yelpReq = await toYelpReq(`${waypoint.lat()},${waypoint.lng()}`, "restaurants");
      // format yelp ==> yql and make request
      var response = await fetch(toYQL(yelpReq));
      var json = await response.json();
      // parse it
      console.log(json);

      this.props.clearMarkers();
      this.props.plotMarker(waypoint);
      this.props.setZoom(12); //this isn't working?
      json.query.results.json.businesses.forEach(function(business) {
        this.props.plotMarker(business.location.coordinate, "restaurant.png");
        // console.log(dist(waypoint.lat(), waypoint.lng(), business.location.coordinate.latitude, business.location.coordinate.longitude));
        // business.addedTime = this.getAddedTime(business); //calculate added time to route
      }, this);

      this.props.populateRestaurantsList(json.query.results.json.businesses);
    } catch (e) {
      console.log(`error fetching directions: ${ e.stack }`);
    }
  }

  render () {
    return (
      <form>
        <div className="list list-inset">
          <label className="item item-input">
            <input ref="from" type="text" placeholder="From:" onBlur={this.plotDirections.bind(this)}></input>
            <i ref="location" className="icon ion-location placeholder-icon input-icon"></i>
          </label>
          <label className="item item-input">
            <input ref="to" type="text" placeholder="To:" onBlur={this.plotDirections.bind(this)}></input>
          </label>
          <label className="item item-input">
            <i className="icon ion-clock placeholder-icon"></i>
            <input type="number" ref="time" min="1" placeholder="Minutes till you want to eat?"></input>
          </label>
          <button id="go" className="button button-full button-positive" onClick={this.submitRoute.bind(this)}>
            Let&#39;s Go!
          </button>
          <p id="geolocation-message"></p>
        </div>
      </form>
    );
  }
}

class SimpleMap extends Component {

  constructor(props) {
    super(props);
    this.state = {
      // center on US
      center: {
        lat: 39.50,
        lng: -120.35
      },
      origin: {
        lat: 41.8507300,
        lng: -87.6512600
      },
      destination: {
        lat: 41.8507300,
        lng: -87.6512600
      },
      directions: null,
      zoom: 3,
      markers: [{
        position: {
          lat: 41.8507300,
          lng: -87.6512600,
        },
        key: "Default",
        defaultAnimation: 2
      }],
    }
  }

  async componentDidMount () {
    // var newYork = await this.geocodePoint("35 colby drive");
    // var b = `${newYork.pt.lat()},${newYork.pt.lng()}`;
    // var boston = await this.geocodePoint("las vegas ");
    // var a = `${boston.pt.lat()},${boston.pt.lng()}`;
    // var data = await this.getTravelTime(a,b);
    // console.log(data);
  }

  // returns {pt => google pt (obj), address => formatted address (string)}
  async geocodePoint(query) {
    // promisify geocoder fn to use with es7 async and await
    if(query.lat && query.lng) {
      return {pt: {lat: query.lat, lng: query.lng}};
    } else if(query.latitude && query.longitude) {
      return {pt: {
        lat: function() {return parseFloat(query.latitude);},
        lng: function() {return parseFloat(query.longitude);}
      }};
    } else {
      return new Promise(function(resolve,reject) {
        Geocoder.geocode({'address': query}, (results, status) => {
          if(status == google.maps.GeocoderStatus.OK) {
            console.log({results, status});
            resolve({address: results[0].formatted_address, pt: results[0].geometry.location});
          } else {
            reject({results, status});
          }
        });
      });
    }
  }

  setZoom(newzoom) {
    this.setState({zoom:newzoom});
  }

  clearMarkers() {
    // delete all this.state.markers
    var {markers} = this.state;
    markers = update(markers, {
      $set: []
    });
    // directions = update(directions, {
    //   $set: null
    // });
    this.setState({markers});
  }

  async plotMarker(pt, image) {
    var point = await this.geocodePoint(pt);
    var {markers, center} = this.state;
    markers = update(markers, {
      $push: [{
        position: {
          lat: point.pt.lat(),
          lng: point.pt.lng()
        },
        defaultAnimation: 2,
        key: Date.now(),
        icon: image
      }]
    });
    this.setState({markers});
    //set center on marker
    center = update(center, {
      $set: {
        lat: point.pt.lat(),
        lng: point.pt.lng()
      }
    });
    this.setState({center});
    this.setZoom(7);
  }

  // returns travel time by car in seconds
  async getTravelTime(a, b) {
    var url = `http://dev.virtualearth.net/REST/V1/Routes/Driving?wp.0=${encodeURIComponent(a)}&wp.1=${encodeURIComponent(b)}&key=AsxRw39EkmNBVgqP9Q5W9HKBN9_HzOIMYPWxcFUj4Ys8GluFcJgA6GUPD1YkNtG2`;
    try {
      var response = await fetch(toYQL(url));
      var json = await response.json();
      var data = json.query.results.json;
      var travelTime = data.resourceSets.resources.travelDurationTraffic;
      return travelTime;
    } catch (e) {
      console.log(`error fetching directions: ${ e }`)
    }
  }

  plotDirections(origin, destination) {
    DirectionsService.route({
      origin: origin,
      destination: destination,
      travelMode: google.maps.TravelMode.DRIVING
    }, (result, status) => {
      if(status == google.maps.DirectionsStatus.OK) {
        this.setState({
          directions: result
        });
      } else {
        console.error(`error fetching directions ${ JSON.stringify(result) }`);
      }
    });
  }

  render () {
    return (
      <div id="main-wrapper">
        <List plotDirections={this.plotDirections.bind(this)} clearMarkers={this.clearMarkers.bind(this)} plotMarker={this.plotMarker.bind(this)} directions={this.state.directions} setZoom={this.setZoom.bind(this)}/>
        <GoogleMap containerProps={{
            ...this.props,
            style: {
              height: "100%",
              width: "100%"
            }
          }}
          zoom={this.state.zoom}
          defaultCenter={this.state.origin}
          center={this.state.center}>

          {this.state.directions ? <DirectionsRenderer directions={this.state.directions} /> : null}
          {this.state.markers.map((marker, index) => {
            return (
              <Marker {...marker} onClick={this.test} />
            );
          })} />
        </GoogleMap>
      </div>
    );
  }
}

// use yahoo CORS proxy
function toYQL(url) {
  var yqlUrl = 'http://query.yahooapis.com/v1/public/yql?q=';
  var query = `select * from json where url="${url}"`;
  return yqlUrl + encodeURIComponent(query) + '&format=json';
}

function dist(lat1, lon1, lat2, lon2) {
  //https://stackoverflow.com/questions/365826/calculate-distance-between-2-gps-coordinates
  var R = 3958.7558657440545; // km
  var dLat = toRad((lat2-lat1));
  var dLon = toRad((lon2-lon1));
  var lat1 = toRad(lat1);
  var lat2 = toRad(lat2);

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(val) {
  return val * Math.PI / 180;
}

// yelp api call
async function toYelpReq (cord, q) {
  var auth = {
    consumerKey: "qS19AZDF1zfIP-9bGFDQHw",
    consumerSecret: "GX0L6102vHgZmg_wjht7wrhikSc",
    accessToken: "ilTgzJb97aVo1MvmX_KxS4-ztQwzqfw5",
    accessTokenSecret: "XbOMXThCHGmuyxBLuQXupipuYG8",
    serviceProvider: {
      signatureMethod: "HMAC-SHA1"
    }
  };
  var accessor = {
    consumerSecret: auth.consumerSecret,
    tokenSecret: auth.accessTokenSecret
  };
  var parameters = [];
  parameters.push(['term', q]);
  parameters.push(['ll', cord]);
  // parameters.push(['callback', 'cb']);
  parameters.push(['oauth_consumer_key', auth.consumerKey]);
  parameters.push(['oauth_consumer_secret', auth.consumerSecret]);
  parameters.push(['oauth_token', auth.accessToken]);
  parameters.push(['oauth_signature_method', 'HMAC-SHA1']);
  var message = {
    'action': 'http://api.yelp.com/v2/search',
    'method': 'GET',
    'parameters': parameters
  };
  OAuth.setTimestampAndNonce(message);
  OAuth.SignatureMethod.sign(message, accessor);
  var parameterMap = OAuth.getParameterMap(message.parameters);
  parameterMap.oauth_signature = OAuth.percentEncode(parameterMap.oauth_signature);
  return message.action + "?" + $.param(parameterMap);

}

ReactDOM.render(
  <SimpleMap />,
  document.getElementById('main')
);
