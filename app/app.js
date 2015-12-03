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
      restaurantsList: []
    };
  }

  toggleMap() {
    //do stuff to hide the list and display map only
  }

  toggleRestaurantsList(restaurantsList) {
    this.setState({view: 1}); //viewing list of results after clicking "Let's Go!"
    this.setState({restaurantsList});
  }

  goBack() {
    this.setState({view: 0});
  }

  render () {
    var content;
    if(this.state.view == 0) {
      content = <RouteForm {...this.props} toggleRestaurantsList={this.toggleRestaurantsList.bind(this)}/>;
    } else if(this.state.view == 1) {
      content = <RestaurantsList restaurantsList={this.state.restaurantsList}/>;
    }
    return (
      <div id="list-wrapper">
        <ListHeader view={this.state.view} toggleMap={this.toggleMap.bind(this)} goBack={this.goBack.bind(this)}/>
        {content}
      </div>
    );
  }
}

class RestaurantsList extends Component {
  render() {
    var list = [];
    this.props.restaurantsList.forEach((restaurant) => {
      list.push(
        <a className="item item-thumbnail-left" href={restaurant.url} key={restaurant.id}>
          <img src={restaurant.image_url}></img>
          <h2>{restaurant.name}</h2>

        </a>);
    });
    return (
      <div id="restaurant-list-wrapper">
        <ul className="list">
          {list}
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

  async submitRoute(e) {
    e.preventDefault();
    try {
      var yelpReq, finalLocation;
      var route = this.props.directions.routes[0].legs[0];
      var timeLeft = this.refs.time.value * 60;
      var travelTime = 0;
      // console.log(route);
      route.steps.forEach(function(step) {
        travelTime = travelTime + step.duration.value;
      });
      if(travelTime < timeLeft) {
        finalLocation = route.steps[route.steps.length - 1].end_location;
      } else {
        var stepNum = 0;
        while(timeLeft > 0) {
          timeLeft -= route.steps[stepNum].duration.value;
          stepNum += 1;
        }
        finalLocation = route.steps[stepNum].start_location;
      }

      yelpReq = await toYelpReq(`${finalLocation.lat()},${finalLocation.lng()}`, "restaurants");
      yelpReq = await toYQL(yelpReq);
      var response = await fetch(yelpReq);
      var json = await response.json();
      console.log(json);

      this.props.clearMarkers();
      this.props.plotMarker(finalLocation);
      json.query.results.json.businesses.forEach(function(business) {
        this.props.plotMarker(business.location.coordinate);
      }, this);
      this.props.setZoom(12);
      this.props.toggleRestaurantsList(json.query.results.json.businesses);
    } catch (e) {
      console.log(`error fetching directions: ${ e.stack }`)
    }
    // console.log("hey!")
    // console.log(this.refs.from.value);
    // console.log(this.refs.to.value);
    // console.log(this.refs.time.value);
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
      center: {
        lat: 41.8507300,
        lng: -87.6512600
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
      zoom: 7,
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
    var newYork = await this.geocodePoint("35 colby drive");
    var b = `${newYork.pt.lat()},${newYork.pt.lng()}`;
    var boston = await this.geocodePoint("las vegas ");
    var a = `${boston.pt.lat()},${boston.pt.lng()}`;
    var data = await this.getTravelTime(a,b);
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
    this.setState({zoom: newzoom});
  }

  clearMarkers() {
    // delete all this.state.markers
    var {markers, directions} = this.state;
    markers = update(markers, {
      $set: []
    });
    directions = update(directions, {
      $set: null
    });
    this.setState({markers, directions});
  }

  async plotMarker(pt) {
    var point = await this.geocodePoint(pt);
    var {markers, center} = this.state;
    markers = update(markers, {
      $push: [{
        position: {
          lat: point.pt.lat(),
          lng: point.pt.lng()
        },
        defaultAnimation: 2,
        key: Date.now()
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
  }

  // returns travel time by car in seconds
  async getTravelTime(a, b) {
    var url = `http://dev.virtualearth.net/REST/V1/Routes/Driving?wp.0=${a}&wp.1=${b}&key=AsxRw39EkmNBVgqP9Q5W9HKBN9_HzOIMYPWxcFUj4Ys8GluFcJgA6GUPD1YkNtG2`;
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
          defaultZoom={this.state.zoom}
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
  parameterMap.oauth_signature = OAuth.percentEncode(parameterMap.oauth_signature)
  // $.ajax({
  //   'url': message.action,
  //   'data': parameterMap,
  //   'cache': true,
  //   'dataType': 'jsonp',
  //   'jsonpCallback': 'cb',
  //   'success': callback
  // });
  return message.action + "?" + $.param(parameterMap);

}

ReactDOM.render(
  <SimpleMap />,
  document.getElementById('main')
);
