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
      backBtn = <a id="backBtn" className="button icon-left ion-chevron-left button-calm">Back</a>
    }
    return (
      <div id="header" className="bar bar-header bar-calm">
        {backBtn}
        <h1 className="title">Buy The Way</h1>
        <a id="toggleBtn" className="button icon-right button-calm" onclick="toggleMapList()">Map</a>
      </div>  
    );
  }
}

class List extends Component {
  
  constructor(props) {
    super(props);
    this.state = {view: 0};
  }
  
  render () {
    var content;
    if(this.state.view == 0) {
      content = <RouteForm {...this.props} />;
    }
    return (
      <div id="list-wrapper">
        <ListHeader view={this.state.view} />
        {content}
      </div>
    );
  }
}

class RouteForm extends Component {
  
  constructor(props) {
    super(props);
    this.state = {};
  }
  
  plotDirections() {  
    // if only one point exists, plot marker
    // if both points exist, plot directions 
    var to = this.refs.to.value;
    var from = this.refs.from.value;
    if(!to && !from) {
      this.props.clearMarkers()
    }
    else if(to && !from) {
      this.props.plotMarker(to);
    }
    else if(!to && from) {
      this.props.plotMarker(from);
    }
    else {
      this.props.plotDirections(from, to);
    }
  }
  
  submitRoute(e) {
    e.preventDefault();
    console.log("hey!")
    console.log(this.refs.from.value);
    console.log(this.refs.to.value);
    console.log(this.refs.time.value);
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
      origin: new google.maps.LatLng(41.8507300, -87.6512600),
      destination: new google.maps.LatLng(41.8525800, -87.6514100),
      directions: null,

      markers: [{
        position: {
          lat: 41.8507300,
          lng: -87.6512600,
        },
        key: "Taiwan",
        defaultAnimation: 2
      }],
    }
  }
    
  async componentDidMount () {
    // var data = await this.geocodePoint("35 colby drive dix hills new york");
    // console.log(data.pt.lat())
    // console.log(data.pt.lng())
    // console.log(data.address)
  }
  
  // returns {pt => google pt (obj), address => formatted address (string)}
  async geocodePoint(query) {
    // promisify geocoder fn to use with es7 async and await
    return new Promise(function(resolve,reject) { 
      Geocoder.geocode({'address': query}, (results, status) => {
        if(status == google.maps.GeocoderStatus.OK) {
          resolve({address: results[0].formatted_address, pt: results[0].geometry.location});
        } else {
          reject(results)
        }
      });
    });
  }

  clearMarkers() {
    // delete all state.markers
    console.log("clearMarkers")
  }

  plotMarker() {
    console.log("plotMarker")
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
        })
      } else {
        console.error(`error fetching directions ${ JSON.stringify(result) }`);
      }
    });
  }

  test() { 
    console.log('hello')
    var a = "41.8507300,-87.6512600";
    var b = "41.8525800,-87.6514100";

    // avoid cors error
    // use yahoo's server as a proxy 
    function toYQL(url) {
      var yqlUrl = 'http://query.yahooapis.com/v1/public/yql?q=',
           query = 'select * from json where url="{url}"'.replace('{url}', url);

      return yqlUrl + encodeURIComponent(query) + '&format=json';
    }

    var url = 'http://dev.virtualearth.net/REST/V1/Routes/Driving?wp.0=' + a + '&wp.1='+ b + '&key=AsxRw39EkmNBVgqP9Q5W9HKBN9_HzOIMYPWxcFUj4Ys8GluFcJgA6GUPD1YkNtG2';

    async function hello () {
      try {
        var response = await fetch(toYQL(url)); // async fn
        var json = await response.json(); // async fn
        var data = json.query.results.json;
        return data;
      } catch (e) {
        console.log(`error fetching directions ${ JSON.stringify(e) }`)
      }
    }

    async function hellotwo () {
      var data = await hello();
      console.log(data);
    }
  }

  render () {
    return (
      <div id="main-wrapper">
        <List plotDirections={this.plotDirections.bind(this)} clearMarkers={this.clearMarkers} plotMarker={this.plotMarker} />
        <GoogleMap containerProps={{
            ...this.props,
            style: {
              height: "100%",
              width: "100%"
            }
          }}
          defaultZoom={7}
          defaultCenter={this.state.origin}>
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

ReactDOM.render(
  <SimpleMap />,
  document.getElementById('main')
);