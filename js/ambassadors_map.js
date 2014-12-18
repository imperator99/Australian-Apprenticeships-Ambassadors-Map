/**
 * Ambassadors Map
 *
 * This JS file presents the map for the Australian Apprenticeships Ambassadors.
 */


jQuery(function ($) {
	// Initialise some global variables.
	var map, cluster, oms, url = "/ambassadors_map_search", markers = [], infoWindow, mapCenter;

/**
 * Initialise function.
 */

	var initialize = function() {

		// Create a map options variable.
		var mapOptions = {
			center: new google.maps.LatLng(
				-27.226655302429965, 
				134.63918749999996
			),
			zoom: 4,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			disableDefaultUI: true,
		};

		// Create a cluster options variable.
		var clusterOptions = {
			ignoreHidden: true,
			maxZoom: 12,
		}

		// Initialise the InfoBox object.
		infoWindow = new InfoBox({
			content: '',
			disableAutoPan: false,
			pixelOffset: new google.maps.Size(-110, 10),
			zIndex: 10,
			maxWidth: 150,
			boxStyle: {
				background: "#FFD100",
				width: "200px",
				minHeight: "50px"
			},
			closeBoxMargin: "0 0 0 0",
			closeBoxURL: Drupal.settings.ambassadors_map.basePath + "/img/close-button.png",
			infoBoxClearance: new google.maps.Size(10, 10),
		});

		// Initialise the map with the mapOptions variable. The element ID is passed in by the Drupal settings object.
		map = new google.maps.Map(document.getElementById('map-canvas-ambassadors'), mapOptions);

		// Ensure that the initial map center is filled.
		mapCenter = map.getCenter();

		google.maps.event.addDomListener(window, 'resize', function() {
			map.setCenter(mapCenter);
		});

		// Now that the map exists, create the cluster layer.
		cluster = new MarkerClusterer(map, [], clusterOptions);
		google.maps.event.addListener(cluster, 'clusteringend', function() {
			$('#map-overlay').hide();
		});

		// Create the spiderfier.
		oms = new OverlappingMarkerSpiderfier(
			map, {
				markersWontMove: true,
	        	markersWontHide: true,
	        	keepSpiderfied: true
	        }
        );

		// Load the markers
		loadMarkers(url);

		// Count the markers once the map is idle.
		google.maps.event.addListener(map, 'idle', function() {
			$('#map-overlay').hide();
			countMarkers();
		});

		// Redraw the map when the zoom changes.
		google.maps.event.addListener(map, 'zoom_changed', function() {
			$('#map-overlay').show();
			// If the map zooms in to the point at which clustering stops and spidering begins (maxZoom), the icon changes for markers.
			if (map.getZoom() >= cluster.getMaxZoom()) {
				$.each(markers, function() {
					this.setIcon({
						url: 'http://chart.googleapis.com/chart?chst=d_map_pin_icon&chld=glyphish_group|ffffff',
					});
				});
			} else {
				$.each(markers, function() {
					this.setIcon({
						url: 'http://chart.googleapis.com/chart?chst=d_map_pin_icon&chld=glyphish_user|ffffff'
					});
				});
			}
		});

		// Add some more listeners to the OMS.

		var usualColor = 'eebb22', spiderfiedColor = 'ffee22';
		var iconWithColor = function(color) {
			return 'http://chart.googleapis.com/chart?chst=d_map_pin_icon&chld=glyphish_user|' +
				color;
		};
		var shadow = {
			url: 'https://www.google.com/intl/en_ALL/mapfiles/shadow50.png',
			size: new google.maps.Size(37, 34),
			origin: new google.maps.Point(0, 0),
			anchor: new google.maps.Point(10, 34)
		};

		oms.addListener('spiderfy', function(markers) {
			$.each(markers, function(i, marker) {
				this.setIcon({
					url: iconWithColor(rainbow(markers.length, i))
				});
				this.setShadow(null);
			});
			infoWindow.close();
		});

		oms.addListener('unspiderfy', function(markers) {
			$.each(markers, function() {
				this.setIcon(iconWithColor(usualColor));
				this.setShadow(shadow);
			});
		});

		function rainbow(numOfSteps, step) {
			// This function makes spiderfied icons different colors.

		    // This function generates vibrant, "evenly spaced" colours (i.e. no clustering). This is ideal for creating easily distiguishable vibrant markers in Google Maps and other apps.
		    // HSV to RBG adapted from: http://mjijackson.com/2008/02/rgb-to-hsl-and-rgb-to-hsv-color-model-conversion-algorithms-in-javascript
		    // Adam Cole, 2011-Sept-14
		    var r, g, b, h = step / numOfSteps, i = ~~(h * 6), f = h * 6 - i, q = 1 - f;
		    switch(i % 6){
		        case 0: r = 1, g = f, b = 0; break;
		        case 1: r = q, g = 1, b = 0; break;
		        case 2: r = 0, g = 1, b = f; break;
		        case 3: r = 0, g = q, b = 1; break;
		        case 4: r = f, g = 0, b = 1; break;
		        case 5: r = 1, g = 0, b = q; break;
		    }
		    var c = ("00" + (~ ~(r * 255)).toString(16)).slice(-2) + ("00" + (~ ~(g * 255)).toString(16)).slice(-2) + ("00" + (~ ~(b * 255)).toString(16)).slice(-2);
		    return (c);
		}
	};

/**
 * Load the markers.
 */

 	var loadMarkers = function(url) {

 		// Clear out the markers
	 	clearMarkers();

	 	// Get the data from the JSON-encoded URL.
	 	$.getJSON(url, function(data) {
	 		// This is the 'success' function for the $.getJSON function.
	 		// For each return data item (address), build a marker using the setMarkers function.
	 		$.each(data, function(i, item) {
	 			// Perform some validation checks
	 			if (item.geo !==  undefined) {
	 				if (item.geo.lat.length !== null && item.geo.lon.length !== null) {
	 					// Send each 'data' item off to the setMarkers function.
	 					markers.push(setMarkers(item));
	 				}
	 			}
	 		});
	 		
	 		// Now that all the markers have been added, turn the throbber off.
	 		$('#map-overlay').hide();

	 		// Count the markers.
	 		countMarkers();
	 	});
	};

/**
 * Function to create the marker objects.
 */

	var setMarkers = function(item) {
		var position = new google.maps.LatLng(item.geo.lat, item.geo.lon);
		var marker = new google.maps.Marker({
			position: position,
			map: map,
			title: '',
			alias: item.alias,
			city: item.city,
			state: item.state,
			name: item.title,
			icon: 'http://chart.googleapis.com/chart?chst=d_map_pin_icon&chld=glyphish_user|ffffff',
			image: item.image,
			industry: item.industry,
			occupation: item.occupation,
		});

		//Preload the images
		imagePreload(marker.image);

		// Add click functionality to the markers.
		oms.addListener('click', function(marker, event) {
			wrapper = $('<div class="infoBox"/>');
			wrapper.append(renderTitle(marker.name, marker.alias));
			wrapper.append(renderImage(marker.image, marker.name));
			wrapper.append(renderAddress(marker.city, marker.state, marker.occupation, marker.industry));
			wrapper.append('<span class="triangle"></span>');
			infoWindow.close();
			infoWindow.setContent(wrapper.html());
			infoWindow.open(map, marker);
		});
		// Add the new marker to the cluster layer.
		cluster.addMarker(marker);

		// Add the new marker to the spiderfication layer.
		oms.addMarker(marker);

		// Send the new marker object back to the loadMarkers function.
		return marker;
	};

/**
 * Parse and return title html markup 
 * @params {String} title Center name
 * @params {String} url Link to center detail page
 * @return {object} jQuery HTML Object
 */
	var renderTitle = function(title, url){
		var wrapper = $('<div class="map-title"></div>'),
		heading = $('<h3></h3>'),
		link = $('<a href=""></a>');

		link.attr('href', url);
		link.text(title);

		heading.append(link);
		wrapper.append(heading);

		return wrapper;
	};

/**
 * Parse and return image html markup 
 * @params {String} url Image url
 * @params {String} alt Alternate text
 * @return {object} jQuery HTML Object
 */
	var renderImage = function(url, alt){
		var wrapper = $('<div class="map-image"></div>'),
		img = $('<img src="" alt=""/>');

		img.attr('src', url);
		img.attr('alt', alt)

		wrapper.append(img);

		return wrapper;
	};

/**
 * Parse and return address html markup 
 * @params {object} address Address object
 * @return {object} jQuery HTML Object
 */
	var renderAddress = function (city, state, occupation, industry) {
		var wrapper = $('<div class="map-address"></div>'),
		row = $('<p></p>'),
		address = "",
		job = "";
		if(occupation) {
			job += occupation + ' - ';
		}

		if(industry) {
			job += industry;
		}
		wrapper.append(row.clone().text(job));

		if(city) {
			address += city;
		}

		if(state) {
			address += ', ' + state;
		}

		wrapper.append(row.clone().text(address));

		return wrapper;
	};
/**
 * Function to clear all the markers so they can be reloaded.
 */

	var clearMarkers = function() {
		if (typeof(markers) !== 'undefined') {
			for (i in markers) {
				markers[i].setMap(null);
			}
		}
		markers = [];
		cluster.clearMarkers();
	};

/**
 * This function counts the markers currently visible on the map window.
 */

	var countMarkers = function() {
			var markerCount = 0, pluralString = '', bounds = map.getBounds();
			$.each(markers, function(i, marker) {
				if(bounds.contains(marker.getPosition())) {
					markerCount++;
				}			
			});
			if (markerCount !== 1) {
				pluralString = 's';
			}
			$('#map-feedback').html('<p>Showing <strong>' + markerCount + '</strong> Apprenticeships Ambassador' + pluralString + '</p>').removeClass('hidden').show();
	};

/**
 * This functions places a message in the middle of the map to inform the user of some error.
 */

 	var setMessage = function(message, status) {
 		$('#map-message').show().html('<p>' + message + '</p>').removeClass().addClass(status);
 	}

/**
 * Image preloader.
 */

  var imagePreload = function(img) {
  	(new Image()).src = img;
  };
	// Core function to initialise the map on DOM load and kick everything off.
	google.maps.event.addDomListener(window, 'load', initialize);
});
