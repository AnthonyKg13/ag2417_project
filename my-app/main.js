import 'ol-layerswitcher/dist/ol-layerswitcher.css';
import './node_modules/ol-popup/src/ol-popup.css'
import OSM from 'ol/source/OSM';
import Map from 'ol/Map.js';
import TileLayer from 'ol/layer/Tile.js';
import View from 'ol/View.js';
import XYZ from 'ol/source/XYZ.js';
import {FullScreen, ScaleLine, defaults as defaultControls} from 'ol/control.js';
import Feature from 'ol/Feature.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import * as olProj from 'ol/proj';
import {Cluster} from 'ol/source.js';
import LayerSwitcher from 'ol-layerswitcher';
//import { BaseLayerOptions, GroupLayerOptions } from 'ol-layerswitcher';
import LayerGroup from 'ol/layer/Group';
import Popup from 'ol-popup'
import Overlay from 'ol/Overlay';
import DragPan from 'ol/interaction/DragPan';
import {Style} from 'ol/style';
import Fill from 'ol/style/Fill';
import Stroke from 'ol/style/Stroke';
import {Text as olText} from 'ol/style';

import { Point } from 'ol/geom';
import { Translate } from 'ol/interaction';
import { Collection } from 'ol';
import {Circle as olStyleCircle} from 'ol/style';

// const map_proj = new olProj.Projection({
//   code: 'EPSG:3857',
//   units: 'm'
// });

function getFourYearsAgoTimestamp() {
  var now = new Date();
  var fourYearsAgo = new Date(now.getFullYear() - 4, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds());
  return fourYearsAgo.getTime();
}
function timeConverter(UNIX_timestamp){
  var a = new Date(UNIX_timestamp);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = a.getMinutes();
  var sec = a.getSeconds();
  var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
  return time;
}

var currentDateTime = timeConverter(getFourYearsAgoTimestamp());

document.getElementById('psdtime').innerHTML = 'Pseudo current time:' + currentDateTime

const view = new View({
  center: olProj.fromLonLat([-118.22797916866318,33.93978860654824]),
  zoom: 9,

});

const key = 'YOUR_KEY';
const attributions =
  '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> ' +
  '<a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>';


var dragPan = new DragPan();

//base map
const osm = new TileLayer({
  title: 'OSM',
  type: 'base',
  visible: true,
  source: new OSM()
  });

const basemap_tile = new TileLayer({
  source: new XYZ({
    attributions: attributions,
    url:
      'https://api.maptiler.com/tiles/satellite/{z}/{x}/{y}.jpg?key=' + key,
    maxZoom: 25,
  }),
  title: 'Maptiler - Satellite',
  type: 'base',
  visible: false
});
//base map group
const basemaps = new LayerGroup({
  title: 'Base maps',
  layers: [osm, basemap_tile]
})
//data layer group
var overlayGroup = new LayerGroup({
  title: 'Data',
  layers: []
});
//define a map

const map = new Map({
  controls: defaultControls().extend([new FullScreen(),new ScaleLine(),]),
  layers: [ 
  basemaps,
  overlayGroup
  ],
  target: 'map',
  view: view,
});
//layer control panel
const layerSwitcher = new LayerSwitcher({
  reverse: true,
  groupSelectStyle: 'group'
});
map.addControl(layerSwitcher);
//layerSwitcher.setStyle.backgroundColor = 'Canvas';

function gsToVSource(data) {
  var geojson_format = new GeoJSON();
  var vector_source = new VectorSource({
    features: geojson_format.readFeatures(data)
  });
  return vector_source
}

//build your own layer builder
//here is an simple example

/**
 * @param {VectorSource} vector_source
 */
const simpleLayerBuilder = (vector_source) => {
  var vector_layer = new VectorLayer({
    source: vector_source
  }); 
  map.addLayer(vector_layer);
}

const simpleLayerBuilder_userincident = (vector_source) => {
  const clusterSource = new Cluster({
  	distance:50,
  	minDistance:50,
  	source: vector_source
  })
  const styleCache = {};
  const clusters = new VectorLayer({
    title: 'Incidents (User reported)',
    style: function (feature) {
      const size = feature.get('features').length;
      let style = styleCache[size];
      if (!style) {
        style = new Style({
          image: new olStyleCircle({
            radius: 10,
            stroke: new Stroke({
              color: '#fff',
            }),
            fill: new Fill({
              color: '#FEBF23',
            }),
          }),
          text: new olText({
            font: '8px sans-serif',
            text: size.toString(),
            fill: new Fill({
              color: '#fff',
            }),
          }),
        });
        styleCache[size] = style;
      }
      return style;
    },
    source: clusterSource
  });
  clusters.setZIndex(2);
  overlayGroup.getLayers().push(clusters); 
  //map.addLayer(clusters);
}

const clusterLayerBuilder = (vector_source) => {
  const clusterSource = new Cluster({
  	distance:50,
  	minDistance:50,
  	source: vector_source
  })
  const styleCache = {};
  const clusters = new VectorLayer({
    title: 'Incidents',
    style: function (feature) {
      const size = feature.get('features').length;
      let style = styleCache[size];
      if (!style) {
        style = new Style({
          image: new olStyleCircle({
            radius: 10,
            stroke: new Stroke({
              color: '#fff',
            }),
            fill: new Fill({
              color: '#3399CC',
            }),
          }),
          text: new olText({
            font: '8px sans-serif',
            text: size.toString(),
            fill: new Fill({
              color: '#fff',
            }),
          }),
        });
        styleCache[size] = style;
      }
      return style;
    },
    source: clusterSource
  });
  clusters.setZIndex(2);
  overlayGroup.getLayers().push(clusters); 
  //map.addLayer(clusters);
}

const hwyLayerBuilder_ls = (vector_source) => {
  var vector_layer = new VectorLayer({
    title: 'hwy_largescale',
    source: vector_source,
    maxZoom: 12
  }); 
  vector_layer.setZIndex(1);
  // map.addLayer(vector_layer);
  overlayGroup.getLayers().push(vector_layer); 
}
const hwyLayerBuilder = (vector_source) => {
  var vector_layer = new VectorLayer({
    title: 'hwy',
    source: vector_source,
    minZoom: 12
  }); 
  vector_layer.setZIndex(1);
  // map.addLayer(vector_layer);
  overlayGroup.getLayers().push(vector_layer); 
}

/**
* read and add .geojson file to a openlayer layer
* @param {String} source http request URL
* @param {function layerBuilder(vector_source)} layerBuilder is a function that adds a layer to the map using data from .geojson as vector source
*/
function addGeoJSONlayer(source, layerBuilder) {
  fetch(source).then(res => {
  if (!res.ok) {
    throw new Error('Network response was not ok');
  }
  return res.json();
}).then(data => {
  // Now 'data' contains the content of the response
  // console.log(data);
  const vsource = gsToVSource(data);
  layerBuilder(vsource);
}).catch(error => console.error('Error:', error));
}

const form = document.getElementById('timeRangeForm');
form.addEventListener('submit', function (e) {
  e.preventDefault(); // prevent the default form submission behavior" 或 "prevent the form from submitting by default. This means preventing the form from performing its default action when the submit button is clicked, which is usually a page refresh or jumping to another page.
  const startTime = document.getElementById('startTime').value;
  const endTime = document.getElementById('endTime').value;
  const tmp_e = new Date(document.getElementById('endTime').value)
  const tmp_s = new Date(document.getElementById('startTime').value)
  //console.log(tmp_e.getTime())
  if (!(startTime && endTime)) {
    alert('Please select a time range before loading data.');
    return null;
  }
  if (Math.abs(
    tmp_e.getTime() - tmp_s.getTime()
    ) / (1000 * 60 * 60 * 24) > 31) {
      alert('no longer than 31 days sorry! :(');
      return null;
  }
  if (tmp_e.getTime() - tmp_s.getTime() < 0) {
      alert('Error: start date is after end date. Please check your input and try again.');
      return null;
  }
  if (tmp_e.getTime() > getFourYearsAgoTimestamp()) {
      alert(`Sorry but we have no latest data! Please make sure the end date is no later than ${currentDateTime}!`);
      return null;
  }
  if (tmp_s.getTime() < 1451606400000 || tmp_e.getTime() < 1451606400000) {
    alert(`Sorry but we only have data from 2016-01-01! Please make sure the start/end date is no earlier than that!`);
      return null;
  }

  console.log(overlayGroup.getLayers().getLength())
  overlayGroup.getLayers().forEach(
    layer=>{
      console.log(layer)
      if (layer === undefined) {
        null;
      } else {
        if(layer.get('title') === 'Incidents'){
          overlayGroup.getLayers().remove(layer)
        }
      }
    }
  )
  const dataURL = `http://localhost:3115/api/incidents?from=${startTime}&to=${endTime}`;
  //console.log(dataURL);
  addGeoJSONlayer(dataURL, clusterLayerBuilder);
});


// //to get data from api: request(method: GET) from http://localhost:3115/api/content(?parameters=value) .
// addGeoJSONlayer('http://localhost:3115/api/cacounties',simpleLayerBuilder) //load ca_counties

addGeoJSONlayer('http://localhost:3115/api/userincident',simpleLayerBuilder_userincident)
addGeoJSONlayer('http://localhost:3115/api/hwy_largescale',hwyLayerBuilder_ls) //load highway network (for large scale)
addGeoJSONlayer('http://localhost:3115/api/hwy',hwyLayerBuilder) //load highway network
addGeoJSONlayer(`http://localhost:3115/api/incidents`,clusterLayerBuilder) //load incidents ?from=2019-10-11T00:00:00


// //Hint: pass the scale parameter on the HTTP GET request above so the api can provide data for different scales

// map.on('singleclick', function (event) {
//   const feature = map.forEachFeatureAtPixel(event.pixel, function (feature) {
//     return feature;
//   });
const popup = new Popup();
map.addOverlay(popup);
map.on('singleclick', function (event) {
  
  const feature = map.forEachFeatureAtPixel(event.pixel, function (feature, layer) {
    if (layer && (layer.get('title') === 'Incidents' || layer.get('title') === 'Incidents (User reported)')) {
      return feature;
    }
  });

  if (feature) {
    var properties = feature.getProperties();
    let content = '<ul>';
    properties = properties['features']
    
    if (Object.keys(properties).length==1) {
      properties = properties[0].getProperties();
      //console.log(properties)
      //console.log(Object.keys(properties))
      for (const key in properties) {
        content += `<li><strong>${key}:</strong> ${properties[key]}</li>`;
      }
      content += '</ul>';
      popup.show(event.coordinate, content);
    };
    
  }
});

var overlayReport = new Overlay({
  element: document.getElementById('popup'),
  autoPan: true,
  autoPanAnimation: {
    duration: 250
  }
});
map.addOverlay(overlayReport);

// report incident
var reportbutton = document.getElementById('reportbutton');
  reportbutton.addEventListener('click', function (event) {
  reportbutton.disabled = true;
  //var Content2 = document.createElement('div');
  var Content2 = document.getElementById('submit');
  Content2.innerHTML = `
    <h3>Report incidents</h3>
    <label for="accidentType">description:</label>
    <select id="accidentType">
        <option value="Type1">1125-Traffic Hazard</option>
        <option value="Type2">1182-Trfc Collision-Noj In</option>
        <option value="Type3">1183-Trfc Collision-Unkn Inj</option>
        <option value="Type4">1179-Trfc Collision-1141 Enrt</option>
        <option value="Type5">20002-Hit and Run No Injuries</option>
        <option value="Type6">FIRE-Report of Fire</option>
        <option value="Type7">1125A-Animal Hazard</option>
        <option value="Type8">CZP-Assist with Construction</option>
        <option value="Type9">CFIRE-Car Fire</option>
        <option value="Type10">1179-Trfc Collision-1141Enrt</option>
        <option value="Type11">BREAK-Traffic Break</option>
        <option value="Type12">ANIMAL-Live or Dead Animal</option>
        <option value="Type13">WW-Wrong Way Driver</option>
        <option value="Type14">CLOSURE of a Road</option>
        <option value="Type15">SIG Alert</option>
        <option value="Type16">MZP-Assist CT with Maintenance</option>
        <option value="Type17">DOT-Request CalTrans Notify</option>
        <option value="Type18">1166-Defective Traffic Signals</option>
        <option value="Type19">23114-Object Flying From Veh</option>
        <option value="Type20">JUMPER</option>
    </select>
    <br>
    <label for="accidentTime">time:</label>
    <input type="datetime-local" id="accidentTime">
    <br>
    <p>Please move the red point to the location of the incident.</p>
    <br>
    <button id="submitReport">upload</button>
  `;

  Content2.style.backgroundColor = '#E9D5D5';
  Content2.style.padding = '20px';
  // Content2.style.border = '1px solid #ccc';
  // Content2.style.borderRadius = '5px';
  // Content2.style.position = 'absolute';
  // Content2.style.left = '22.5%';
  // Content2.style.top = '60%';
  // Content2.style.transform = 'translate(0%, -50%)';
  // Content2.style.width = '220px';

  // var popup = new Overlay({
  //   element: Content2,
  //   positioning: 'bottom-left',
  // });
  
  // // set position
  // popup.setPosition(map.getView().getCenter());

  // var extent = map.getView().calculateExtent(map.getSize());
  // var leftX = extent[0];
  // var centerY = (extent[1] + extent[3]) / 2;
  
  // popup.setPosition([leftX, centerY]);


  // Content2.style.position = 'absolute';
  // Content2.style.left = '500px'; // 水平位置
  // Content2.style.top = '600px'; // 垂直位置
  
  // 在地图之外添加弹出框
  // document.body.appendChild(Content2);
  //map.addOverlay(popup);
  const incidentDict = {
    "Type1":"1125-Traffic Hazard",
    "Type2":"1182-Trfc Collision-Noj In",
    "Type3":"1183-Trfc Collision-Unkn Inj",
    "Type4":"1179-Trfc Collision-1141 Enrt",
    "Type5":"20002-Hit and Run No Injuries",
    "Type6":"FIRE-Report of Fire",
    "Type7":"1125A-Animal Hazard",
    "Type8":"CZP-Assist with Construction",
    "Type9":"CFIRE-Car Fire",
    "Type10":"1179-Trfc Collision-1141Enrt",
    "Type11":"BREAK-Traffic Break",
    "Type12":"ANIMAL-Live or Dead Animal",
    "Type13":"WW-Wrong Way Driver",
    "Type14":"CLOSURE of a Road",
    "Type15":"SIG Alert",
    "Type16":"MZP-Assist CT with Maintenance",
    "Type17":"DOT-Request CalTrans Notify",
    "Type18":"1166-Defective Traffic Signals",
    "Type19":"23114-Object Flying From Veh",
    "Type20":"JUMPER"
  };
  // upload button
  var uploadButton = document.getElementById('submitReport');
  uploadButton.addEventListener('click',function() {
    try {
      let coo = marker.getGeometry().getCoordinates();
      const submitData = {
        time: document.getElementById('accidentTime').value,
        type: incidentDict[document.getElementById('accidentType').value],
        lat: coo[1],
        lng: coo[0]
      };
      fetch('http://localhost:3115/api/sendreport',{
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData)
      }).then(response => response.json())
      .then(data => {
        console.log('Success:', data);
      })
      .catch(error => {
        console.error('Error:', error);
      });
      
    } catch (error) {
      alert('Error! Please try again.');
      return null;
    }
    alert('Thanks for your reporting!')
    report_vs.removeFeature(marker);
    reportbutton.disabled = false;
    Content2.innerHTML = ``;
    Content2.style.backgroundColor = '#FFFFFF';
    Content2.style.padding = '0px';

    overlayGroup.getLayers().forEach(
      layer=>{
        //console.log(layer)
        if(layer.get('title') === 'Incidents (User reported)'){
          overlayGroup.getLayers().remove(layer)
          addGeoJSONlayer('http://localhost:3115/api/userincident',simpleLayerBuilder_userincident)
        }
      }
    )
    //location.reload();
  })
  // Close 
  var closeButton = document.createElement('button');
  closeButton.textContent = 'Close';
  closeButton.addEventListener('click', function () {
    report_vs.removeFeature(marker);
    //map.removeOverlay(popup);
    reportbutton.disabled = false;
    //document.body.removeChild(Content2)
    Content2.innerHTML = ``;
    Content2.style.backgroundColor = '#FFFFFF';
    Content2.style.padding = '0px';

  });
  Content2.appendChild(closeButton);

  //---------(incident marker)----------------
  const userlocation = map.getView().getCenter();
  console.log()
  const report_vs = new VectorSource();
  const report_vl = new VectorLayer({
    source: report_vs,
  });
  report_vl.setZIndex(5);
  map.addLayer(report_vl);

  const marker = new Feature({
    geometry: new Point(userlocation),
  });

  const report_style = new Style({
    image: new olStyleCircle({
        radius: 8,
        fill: new Fill({
            color: '#FF5959',
        }),
        stroke: new Stroke({
            color: '#fff',
            width: 2,
        }),
    }),
  });
  marker.setStyle(report_style);
  
  report_vs.addFeature(marker);



  // Make the marker movable
  const dragInteraction_reportmarker = new Translate({
    features: new Collection([marker]),
  });
  map.addInteraction(dragInteraction_reportmarker);

  marker.on('change', function(event) {
    const incident_coordinates = marker.getGeometry().getCoordinates();
    //console.log('Marker Coordinates:', incident_coordinates);
  });
  //---------(end incident marker)----------------
});




