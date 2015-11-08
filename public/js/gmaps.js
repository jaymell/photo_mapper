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

	// object for markers so they can be stored and modified;
	// individual markers accessible by md5sum: 
	var markerObj = {};

	// return random amount scaled by zoom level:
	var plusOrMinus = function() { return Math.random() < 0.5 ? -1 : 1 };
	function jitter(zoom) {
		return zoom < 8 ? (Math.random() * plusOrMinus() / (zoom)) : 0;
	};

	google.maps.event.addListener(map, 'zoom_changed', function() {
		var zoom = map.getZoom();
		console.log(zoom);
		for (var obj in markerObj) {
			marker = markerObj[obj];
			marker.position = new google.maps.LatLng(
                marker.latitude + jitter(zoom),
                marker.longitude + jitter(zoom)
            );
			marker.setPosition(marker.position);
		}
	});
		
	return {
		// for debugging:
		markerObj: markerObj,
		jitter: function() { console.log(jitter(map.getZoom())); },
		zoom: function() { console.log(map.getZoom()); },

		// expects to be passed md5sum, which
		// corresponds to id of list items:
		changePin: function(md5sum) {
			if (md5sum in markerObj) {
				markerObj[md5sum].setIcon(changedPin);
			}
		},
		centerPin: function(md5sum) {
			if (md5sum in markerObj) {
				console.log(markerObj[md5sum].position);
				map.setCenter(markerObj[md5sum].position);
            }
		},
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
						fileName: photo.file_name,
						md5sum: photo.md5sum,
						changePin: function() {
							this.setIcon(changedPin);
						},
					});

					markerObj[marker.md5sum] = marker;	

					marker.addListener('click', function() {
						marker.setIcon(changedPin);
						// initialize magnific Popup:
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
			
$(document).ready(function() {
	$.getJSON('/json', function(json) {
		console.log('got json');
		json.forEach(function(item) {
			$('#photoList').append(
				'<a class="photo" id="' + item.md5sum + '" href="/img/' + item.file_name + '">' + item.date + '</a>' 
			)
			// set background color of item on click:
			$('#'+item.md5sum).click(function() {
			});
		});
		map.addPins(json);
	});

	// make clicked list items center on marker, if one
	// exists for that list item:
	$('#photoList').on('click', 'a', function() {
		$(this).css('background-color', '#671780');
		map.changePin($(this).attr('id'));
		map.centerPin($(this).attr('id'));
	});

	// magnific popup event handler:
	$('#photoList').magnificPopup({
    	delegate: 'a', // child items selector, by clicking on it popup will open
    	type: 'image',
		gallery: {
		  enabled: true, // set to true to enable gallery

		  preload: [0,2], // read about this option in next Lazy-loading section

		  navigateByImgClick: true,

		  arrowMarkup: '<button title="%title%" type="button" class="mfp-arrow mfp-arrow-%dir%"></button>', // markup of an arrow button

		  tPrev: 'Previous (Left arrow key)', // title for left button
		  tNext: 'Next (Right arrow key)', // title for right button
		  tCounter: '<span class="mfp-counter">%curr% of %total%</span>' // markup of counter
		},
	});
});
