


// Initialize the map
var map1 = L.map('map1').setView([43.5, -120], 5.5);



map1.addControl(new L.Control.Fullscreen({
    title: {
        'false': 'View Fullscreen',
        'true': 'Exit Fullscreen'
    }
}));



var bridgeLayer;
var pavementLayer;
var countyLayer;

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

var info = L.control();

info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info');
    this._div.style.color = 'black';
    this.update();
    return this._div;
};

info.update = function (props, bridgesWithinCounty, totalPavementLength, peoplePerBridge) {
    this._div.innerHTML = '<h6>County Population &divide; Number of Bridges </h6>' +
        '<b>' + (props ? props.NAME + ' County' : 'Hover over a county for additional information') + '</b><br />' +
        (props ? 'Population: ' + props.TAPERSONS + '<br />' +
            'Bridges Within County: ' + bridgesWithinCounty + '<br />' +
            'People Per Bridge: ' + Math.round(peoplePerBridge) : '');

    if (totalPavementLength > 0) {
        this._div.innerHTML += "<br>Total Pavement Length: " + totalPavementLength + " miles";
    }
};

function style(feature) {
    var tapesons = feature.properties.TAPERSONS;

    return {
        fillColor: tapesons > 0 ? getColor(tapesons) : 'gray', // Set a default color for gray features
        weight: 2,
        opacity: 1,
        color: 'black',
        fillOpacity: 0.7
    };
}

function getColor(value) {
    // You can customize the color scale based on your preference
    return value > 50000 ? '#FEB24C' :
        value > 25000 ? '#800026' :
        value > 10000 ? '#BD0026' :
        value > 5000 ? '#E31A1C' :
        value > 2500 ? '#FC4E2A' :
        value > 500 ? '#FD8D3C' :
            '#808080';
}

function updateChoropleth() {
    countyLayer.eachLayer(function (countyLayer) {
        var county = countyLayer.feature;
        var bridgesWithinCounty = calculateBridgesWithinCounty(county);

        // Check if bridgesWithinCounty is greater than 0 to avoid division by 0
        if (bridgesWithinCounty > 0) {
            var peoplePerBridge = county.properties.TAPERSONS / bridgesWithinCounty;

            countyLayer.setStyle({
                fillColor: getColor(peoplePerBridge),
                weight: 2,
                opacity: 1,
                color: 'black',
                fillOpacity: 0.7
            });
        } else {
            // Set a default color or handle the case where bridgesWithinCounty is 0
            countyLayer.setStyle({
                fillColor: '#808080', // Set a default color
                weight: 2,
                opacity: 1,
                color: 'black',
                fillOpacity: 0.7
            });
        }
    });
}

function highlightFeature(e, feature) {
    var layer = e.target;

    layer.setStyle({
        weight: 5,
        color: '#FFFFFF',
        dashArray: '',
        fillOpacity: 0.7
    });

    layer.bringToFront();

    var bridgesWithinCounty = calculateBridgesWithinCounty(feature);
    var peoplePerBridge = bridgesWithinCounty > 0 ? feature.properties.TAPERSONS / bridgesWithinCounty : 0;

    info.update(feature.properties, bridgesWithinCounty, calculateTotalPavementLength(feature), peoplePerBridge);
}

function resetHighlight(e) {
    var layer = e.target;

    layer.setStyle({
        weight: 2,
        color: 'black',
        fillOpacity: 0.7
    });

    info.update();
}

function zoomToFeature(e) {
    map1.fitBounds(e.target.getBounds());
}

function onEachFeature(feature, layer) {
    layer.on({
        mouseover: function (e) {
            highlightFeature(e, feature);
        },
        mouseout: function (e) {
            resetHighlight(e);
        },
        click: function (e) {
            zoomToFeature(e);
        }
    });
}

function calculateBridgesWithinCounty(feature) {
    var bridgesWithinCounty = 0;

    bridgeLayer.eachLayer(function (bridgeLayer) {
        var bridgeLatLng = bridgeLayer.getLatLng();
        if (isPointInPolygon(bridgeLatLng, feature.geometry.coordinates[0])) {
            bridgesWithinCounty += 1;
        }
    });

    return bridgesWithinCounty;
}

function calculateTotalPavementLength(layer) {
    var totalPavementLength = 0;

    pavementLayer.eachLayer(function (pavementLayer) {
        var pavementLatLngs = pavementLayer.getLatLngs();

        if (isAnyPointInPolygon(pavementLatLngs, layer.geometry.coordinates[0])) {
            totalPavementLength += Math.round(pavementLayer.feature.properties.ENDMP - pavementLayer.feature.properties.BEGMP);
        }
    });

    return totalPavementLength;
}

info.addTo(map1);

var legend = L.control({ position: 'bottomleft' });

legend.onAdd = function (map) {
    var div2 = L.DomUtil.create('div', 'info legend'),
        grades = [0, 500, 2500, 5000, 10000, 25000],
        labels = [0, 500, 2500, 5000, 10000, 25000];

    div2.innerHTML += '<h6>People per Bridge</h6>';
  

    for (var i = 0; i < grades.length; i++) {
        div2.innerHTML +=
            '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
            (i === grades.length - 1 ? labels[i] + '+' : labels[i]) + '<br>';
    }

    return div2;
};

legend.addTo(map1);

// Fetch and load data
Promise.all([
    fetch('https://cdn.glitch.global/7c0d7a60-99e5-4c3b-a24b-420023a6b8ba/bridges.geojson?v=1701144696721'),
    fetch('https://cdn.glitch.global/7c0d7a60-99e5-4c3b-a24b-420023a6b8ba/pavement.geojson?v=1701144700237'),
    fetch('https://cdn.glitch.global/c4a30576-34c3-46b2-9d07-3d88e9b08d51/CNP.geojson?v=1701227835086')
])
    .then(function (responses) {
        return Promise.all(responses.map(function (response) {
            return response.json();
        }));
    })
    .then(function (data) {
        bridgeLayer = L.geoJSON(data[0]);
        pavementLayer = L.geoJSON(data[1]);
        countyLayer = L.geoJSON(data[2], {
            style: style,
            onEachFeature: onEachFeature
        }).addTo(map1);

        // Update the choropleth once the layers are loaded
        updateChoropleth();
    });
