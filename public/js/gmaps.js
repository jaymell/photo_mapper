var map = (function() {

    var locale = new google.maps.LatLng(30,0);
    var mapOptions = {
            center: locale,
            zoom: 2,
            mapTypeId: google.maps.MapTypeId.SATELLITE // TERRAIN, SATELLITE, HYBRID, ROADMAP
    };
    var map = new google.maps.Map(document.getElementById('mapCanvas'), mapOptions);

    function setPinColor(pinColor) {
		return new google.maps.MarkerImage(
			"http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|"
			+ pinColor,
			new google.maps.Size(21, 34),
			new google.maps.Point(0,0),
			new google.maps.Point(10, 34)
    		);
	};
	var basePin = setPinColor('FE7569');
	var changedPin = setPinColor('8169fe');

	// array for markers so they can be stored and modified:
	var markerObj = {};

	// return random amount scaled by zoom level:
	var plusOrMinus = function() { return Math.random() < 0.5 ? -1 : 1 };
	function jitter(zoom) {
		return zoom < 12 ? (Math.random() * plusOrMinus() / (zoom*10)) : 0;
	};

	google.maps.event.addListener(map, 'zoom_changed', function() {
		var zoom = map.getZoom();
		console.log(zoom);
		for (var marker in markerObj) {
			marker.setPosition(new google.maps.LatLng(
				marker.latitude + jitter(zoom),
				marker.longitude + jitter(zoom)
			));
		}
	});
		
	return {
		// for debugging:
		jitter: function() { console.log(jitter(map.getZoom())); },
		zoom: function() { console.log(map.getZoom()); },

		addPins: function(photoList) {
			var zoom = map.getZoom();
			photoList.forEach(function(photo, index, array) {
				// only if photo actually has coordinates:
				if (photo.latitude && photo.longitude) {
					var marker = new google.maps.Marker({
						// set actual lat/long for future reference:
						latitude: photo.latitude,
						longitude: photo.longitude,
						position: new google.maps.LatLng(
							 photo.latitude + jitter(zoom),
							 photo.longitude + jitter(zoom)
						),
						title: photo.date,
						map: map,
						icon: basePin,
						fileName: photo.file_name
					});

					markerObj[marker.fileName] = marker;	

					marker.addListener('click', function() {
						marker.setIcon(changedPin);	
						// initiliaze magnific Popup:
						var that = this;
						$.magnificPopup.open({
							items: {
								src: '/img/' + that.fileName,
							},
							type: 'image'
						});
					});
				}
			});	
		},
	};		
})();
		
$('#photoList').magnificPopup({
	delegate: 'a', // child items selector, by clicking on it popup will open
	type: 'image'
});

$(document).ready(function() {
	$.getJSON('/json', function(json) {
		console.log('got json');
		json.forEach(function(item) {
			$('#photoList').append(
				'<li class="photo"><a id="' + item.md5sum + '" href="/img/' + item.file_name + '">' + item.date + '</a></li>' 
			);
		});
		map.addPins(json);
	});

	$('#photoList').magnificPopup({
    	delegate: 'a', // child items selector, by clicking on it popup will open
    	type: 'image'
	});
});
