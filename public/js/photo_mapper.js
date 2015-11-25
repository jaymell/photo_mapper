var selectedColor = '#671780',
	basePinColor = 'FE7569',
	changedPinColor = '8169fe';

// taken from:
// http://stackoverflow.com/questions/23580831/how-to-block-google-maps-api-v3-panning-in-the-gray-zone-over-north-pole-or-unde
function checkBounds(map) {

		var latNorth = map.getBounds().getNorthEast().lat();
		var latSouth = map.getBounds().getSouthWest().lat();
		var newLat;

		if(latNorth<85 && latSouth>-85)     /* in both side -> it's ok */
			return;
		else {
			if(latNorth>85 && latSouth<-85)   /* out both side -> it's ok */
				return;
			else {
				if(latNorth>85)   
					newLat =  map.getCenter().lat() - (latNorth-85);   /* too north, centering */
				if(latSouth<-85) 
					newLat =  map.getCenter().lat() - (latSouth+85);   /* too south, centering */
			}   
		}
		if(newLat) {
			var newCenter= new google.maps.LatLng( newLat ,map.getCenter().lng() );
			map.setCenter(newCenter);
			}   
}

// pass it the name of the container div and the
// item div you want to move to top of list:
var scrollToSelected = function(ctDiv, itDiv) {
	$(ctDiv).animate({ 
		scrollTop: - ctDiv.offsetTop + itDiv.offsetTop,

	});
	console.log('ctDiv: ',$(ctDiv));
	console.log('itDiv: ',$(itDiv));
};

var map = (function() {
	/* this closure is getting large and unwieldy... */

    var locale = new google.maps.LatLng(30,0);
    var mapOptions = {
            center: locale,
            zoom: 2,
			minZoom: 2,
            mapTypeId: google.maps.MapTypeId.SATELLITE // TERRAIN, SATELLITE, HYBRID, ROADMAP
    };

    var _map = new google.maps.Map(document.getElementById('mapCanvas'), mapOptions);

    function setPinColor(pinColor) {
		return new google.maps.MarkerImage(
			"http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|"
			+ pinColor,
			new google.maps.Size(21, 34),
			new google.maps.Point(0,0),
			new google.maps.Point(10, 34)
    		);
	};

	var basePin = setPinColor(basePinColor);
	var changedPin = setPinColor(changedPinColor);

	// object for markers so they can be stored and modified;
	// individual markers accessible by md5sum: 
	var markerObj = {};

	// return random amount scaled by zoom level:
	var plusOrMinus = function() { return Math.random() < 0.5 ? -1 : 1 };
	function jitter(zoom) {
		return zoom < 8 ? (Math.random() * plusOrMinus() / (zoom)) : 0;
	};

	google.maps.event.addListener(_map, 'zoom_changed', function() {
		var zoom = _map.getZoom();
		console.log('zoom: '+zoom);
		for (var obj in markerObj) {
			marker = markerObj[obj];
			marker.position = new google.maps.LatLng(
                marker.latitude + jitter(zoom),
                marker.longitude + jitter(zoom)
            );
			marker.setPosition(marker.position);
		}
	});
		
	google.maps.event.addListener(_map, 'center_changed', function() {
    	checkBounds(_map);
	});

	return {
		// for debugging:
		markerObj: markerObj,
		jitter: function() { console.log(jitter(_map.getZoom())); },
		zoom: function() { console.log(_map.getZoom()); },

		// expects to be passed md5sum, which
		// corresponds to id of list items:
		changePin: function(md5sum) {
			if (md5sum in markerObj) {
				markerObj[md5sum].setIcon(changedPin);
			}
		},
		centerPin: function(md5sum) {
			if (md5sum in markerObj) {
				_map.setCenter(markerObj[md5sum].position);
            }
		},
		// take an array, parse it for photos with coordinates,
		// add them to map, and add call to magnific photo:
		addPins: function(photoList) {
			var zoom = _map.getZoom();
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
						map: _map,
						icon: basePin,
						fileName: photo.file_name,
						md5sum: photo.md5sum,
						changePin: function() {
							this.setIcon(changedPin);
						},
					});

					// add to assoc array:
					markerObj[marker.md5sum] = marker;	

					// do stuff when clicked:
					marker.addListener('click', function() {
						// change list item's background color:
						$('#'+marker.md5sum).css('background-color', selectedColor);
						// put clicked item at top of list:
						scrollToSelected($('#mapLeft').get([0]), $('#'+marker.md5sum).get([0]));
						// change pin color
						marker.setIcon(changedPin);
						// initialize magnific Popup, open the appropriate
						// photo, based on array index:
						$('#photoList').magnificPopup('open', index);
					});
				}
			});	
		},
	};		
})();
			
$(document).ready(function() {
	// initialize magnific popup:
	$('#photoList').magnificPopup({
    	delegate: 'a', // child items selector, by clicking on it popup will open
    	type: 'image',
		gallery: {
		  enabled: true,
		  preload: [0,3], 
		  navigateByImgClick: true,
		  // markup of an arrow button
		  arrowMarkup: '<button title="%title%" type="button" class="mfp-arrow mfp-arrow-%dir%"></button>', 
		  tPrev: 'Previous (Left arrow key)', // title for left button
		  tNext: 'Next (Right arrow key)', // title for right button
		  tCounter: '<span class="mfp-counter">%curr% of %total%</span>' // markup of counter
		},
		callbacks: {
			// scoll to individual items in photo list
			// when they are parsed and change background color;
			markupParse: function(template, values, item) {
				scrollToSelected($(item.el).parent().parent().get([0]), $(item.el).get([0]));
				$(item.el).css('background-color', selectedColor);
			},
			// hide the arrows and close button on photo display;
			// this makes it more touch/mobile friendly, since you don't need
			// the buttons, anyway, and are biased into thinking
			// you need to click on them when they're visible:
			open: function() {
				$('.mfp-arrow').css('display', 'none');
				$('.mfp-close').css('display', 'none');
			}
		},
	});

	// parse json, use it to 1) create the links in the item list
	// and 2) add the pins to the map:
	$.getJSON('/json', function(json) {
		console.log('got json');
		json.forEach(function(item) {
			$('#photoList').append(
				'<a class="photo" id="' + item.md5sum + '" href="/img/' + item.file_name + '">' + item.date + '</a>' 
			)
		});
		map.addPins(json);
	});

	// make clicked list items center on marker, if one
	// exists for that list item:
	$('#photoList').on('click', 'a', function() {
		$(this).css('background-color', selectedColor);
		map.changePin($(this).attr('id'));
		map.centerPin($(this).attr('id'));
	});

});
