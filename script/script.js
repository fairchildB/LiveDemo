var map = L.map('map').setView([43.5, -120], 6.5);

map.addControl(new L.Control.Fullscreen({
    title: {
        'false': 'View Fullscreen',
        'true': 'Exit Fullscreen'
    }
}));

var base = L.tileLayer('https://api.mapbox.com/styles/v1/breezy69/clpheei9l006601ope59decy4/tiles/256/{z}/{x}/{y}?access_token=pk.eyJ1IjoiYnJlZXp5NjkiLCJhIjoiY2xvaXlwMWxpMHB2cjJxcHFyeTMwNzk0NCJ9.R18DLRCA9p_SNX-6dtZZZg', {
    maxZoom: 20,
}).addTo(map);

L.control.attribution({
    prefix: '<a href="https://www.mapbox.com/feedback/" target="_blank">Mapbox</a>'
}).addTo(map);

var bridgeLayer;
var bridgesPromise = fetch('https://cdn.glitch.global/7c0d7a60-99e5-4c3b-a24b-420023a6b8ba/bridges.geojson?v=1701144696721')
    .then(function (response) {
        return response.json();
    })
    .then(function (bridges) {
        bridgeLayer = L.geoJSON(bridges, {
            pointToLayer: function (feature, latlng) {
                var symbolSize = 2;
                return L.circleMarker(latlng, {
                    radius: symbolSize,
                    fillColor: "#FFA500",
                    color: "#FFA500",
                    weight: 1,
                    opacity: 1,
                    fillOpacity: 0.7
                });
            },
        }).bindPopup(function (layer) {
            return layer.feature.properties.BRIDGE_NAM;
        });
        return bridgeLayer;
    });

var pavementLayer;
var pavementPromise = fetch('https://cdn.glitch.global/7c0d7a60-99e5-4c3b-a24b-420023a6b8ba/pavement.geojson?v=1701144700237')
    .then(function (response) {
        return response.json();
    })
    .then(function (paveData) {
        pavementLayer = L.geoJSON(paveData, {
            style: function (feature) {
                var colorToUse,
                    pave = feature.properties.CONDITION;
                if (pave === 'Poor') colorToUse = "#ffff00";
                else if (pave === 'Very Poor') colorToUse = "#ff0000";
                else colorToUse = "#000000";
                return { color: colorToUse, weight: 3, opacity: 1 };
            },
            onEachFeature: function (feature, layer) {
                layer.bindPopup(function () {
                    var length = Math.round(feature.properties.ENDMP - feature.properties.BEGMP);
                    return "Length: " + length + " miles";
                });
            },
        });

        return pavementLayer;
    });

var fedLayer;

var fedPromise = fetch('https://cdn.glitch.global/122d6421-b07c-4698-8b8e-05bd0bf7bf35/FAD.geojson?v=1701222554319')
    .then(function (response) {
        return response.json();
    })
    .then(function (fedData) {
        fedLayer = L.geoJSON(fedData, {
            style: function (feature) {
                var type = feature.properties.TYPE;
                if (type === 'Urban' || type === 'Urbanized') {
                    return {
                        color: '#0000FF',  
                        weight: 2,
                    };
                } else {
                    return {
                        color: '#008000',  
                        weight: 2,
 
                    };
                }
            },
            onEachFeature: function (feature, layer) {
                var bridgesWithinFed = 0;
                var totalPavementLength = 0;

                bridgeLayer.eachLayer(function (bridgeLayer) {
                    var bridgeLatLng = bridgeLayer.getLatLng();
                    if (isPointInPolygon(bridgeLatLng, feature.geometry.coordinates[0])) {
                        bridgesWithinFed += 1;
                    }
                });

                pavementLayer.eachLayer(function (pavementLayer) {
                    var pavementLatLngs = pavementLayer.getLatLngs();

                    if (isAnyPointInPolygon(pavementLatLngs, feature.geometry.coordinates[0])) {
                        totalPavementLength += Math.round(pavementLayer.feature.properties.ENDMP - pavementLayer.feature.properties.BEGMP);
                    }
                });

                var popupContent = "<b>Name:</b> " + feature.properties.DESCRIPT + "<br><b>Bridges within Federal Aid Boundary:</b></br> " + bridgesWithinFed;
                if (totalPavementLength > 0) {
                    popupContent += "<br><b>Total Pavement Length:</b> " + totalPavementLength + " miles";
                }

                layer.bindPopup(popupContent);
            }
        }).addTo(map);

        return fedLayer;
    });

        function isPointInPolygon(point, polygon) {
            return pointInPolygon(point, polygon);
        }
        
        function isAnyPointInPolygon(points, polygon) {
            for (var i = 0; i < points.length; i++) {
                if (pointInPolygon(points[i], polygon)) {
                    return true;
                }
            }
            return false;
        }
        
        function pointInPolygon(point, polygon) {
            var x = point.lng,
                y = point.lat;
        
            var inside = false;
            for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
                var xi = polygon[i][0],
                    yi = polygon[i][1];
                var xj = polygon[j][0],
                    yj = polygon[j][1];
        
                var intersect = ((yi > y) !== (yj > y)) &&
                    (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                if (intersect) inside = !inside;
            }
        
            return inside;
        }
        
        function style(feature) {
            return {
                color: '#000000',
                weight: .4,
            };
        }
   

Promise.all([bridgesPromise, pavementPromise, fedPromise]).then(function (layers) {
    var basemaps = {};

    var overlayMaps = {
        'Bridges': layers[0].addTo(map),
        'Pavement': layers[1].addTo(map),
        'Federal Aid Boundaries': layers[2].addTo(map)
    };

    L.control.layers(basemaps, overlayMaps).addTo(map);
});



Promise.all([bridgesPromise, pavementPromise, fedPromise]).then(function (layers) {
  
    var smallUrbanBridges = 0;
    var urbanBridges = 0;
    var totalUrbanPavementLength = 0;
    var totalSmallUrbanPavementLength = 0;

    bridgeLayer.eachLayer(function (bridgeLayer) {
        var bridgeLatLng = bridgeLayer.getLatLng();

        fedLayer.eachLayer(function (fedLayer) {
            if (isPointInPolygon(bridgeLatLng, fedLayer.feature.geometry.coordinates[0])) {
                if (fedLayer.feature.properties.TYPE === 'Small Urban') {
                    smallUrbanBridges += 1;
                } else if (fedLayer.feature.properties.TYPE === 'Urbanized') {
                    urbanBridges += 1;
                }
            }
        });
    });

    fedLayer.eachLayer(function (fedLayer) {
        pavementLayer.eachLayer(function (pavementLayer) {
            var pavementLatLngs = pavementLayer.getLatLngs();

            if (isAnyPointInPolygon(pavementLatLngs, fedLayer.feature.geometry.coordinates[0])) {
                var pavementLength = Math.round(pavementLayer.feature.properties.ENDMP - pavementLayer.feature.properties.BEGMP);
                pavementLength += pavementLength;

                if (fedLayer.feature.properties.TYPE === 'Urbanized') {
                    totalUrbanPavementLength += pavementLength;
                } else if (fedLayer.feature.properties.TYPE === 'Small Urban') {
                    totalSmallUrbanPavementLength += pavementLength;
                }
            }
        });
    });

    createBarChart(urbanBridges, totalUrbanPavementLength, smallUrbanBridges, totalSmallUrbanPavementLength);
});


var legend = L.control({ position: 'bottomleft' });

legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend'),
        pavementGrades = ['Poor', 'Very Poor'],
        pavementColors = ['#ffff00', '#ff0000'],
        bridgeLabel = 'Structurally Deficient Bridges',
        fedLabel = 'Federal Aid Boundaries (FABs)';

    div.innerHTML += '<h4>Pavement Condition</h4>';
    for (var i = 0; i < pavementGrades.length; i++) {
        div.innerHTML +=
            '<i style="background:' + pavementColors[i] + '"></i> ' +
            pavementGrades[i] + '<br>';
    }

    div.innerHTML += '<h4>' + bridgeLabel + '</h4>';
    div.innerHTML +=
        '<svg height="20" width="20"><circle cx="10" cy="10" r="8" fill="#FFA500"></circle></svg> ';

    div.innerHTML += '<h4>' + fedLabel + '</h4>';

    div.innerHTML +=
        '<svg height="20" width="20"><rect width="18" height="18" fill="#0000FF"></rect></svg> Urban <br>';

    div.innerHTML +=
        '<svg height="20" width="20"><rect width="18" height="18" fill="#008000"></rect></svg> Small Urban';

    return div;
};

legend.addTo(map);

