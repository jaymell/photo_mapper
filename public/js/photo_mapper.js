var selectedColor = '#671780',
	basePinColor = 'FE7569',
	changedPinColor = '8169fe';

var linkRoute = '/img/';

// hooray for global variable:
var photoArray = [];

var openPhotoSwipe = function(index) {
	/* the 'responsive' code copied directly from photoswipe.com */
	var pswpElement = $('.pswp')[0];
	var options = {
        index: index,
    };
	var gallery = new PhotoSwipe(pswpElement, PhotoSwipeUI_Default, photoArray, options);
	gallery.listen('beforeChange', function() { 
		// set Pin and item in list to change color when 
		// slide is changed:
		itemId = gallery.currItem.id;
		map.changePin(itemId);
		scrollToSelected($('#mapLeft').get(0), $('#'+itemId).get(0));
	});

	// create variable that will store real size of viewport
	var realViewportWidth,
		useLargeImages = false,
		firstResize = true,
		imageSrcWillChange;

	// beforeResize event fires each time size of gallery viewport updates
	gallery.listen('beforeResize', function() {

		// calculate real pixels when size changes
		realViewportWidth = gallery.viewportSize.x * window.devicePixelRatio;

		// Find out if current images need to be changed
		if(useLargeImages && realViewportWidth < 1000) {
		useLargeImages = false;
		imageSrcWillChange = true;
		} else if(!useLargeImages && realViewportWidth >= 1000) {
		useLargeImages = true;
		imageSrcWillChange = true;
		}

		// Invalidate items only when source is changed and when it's not the first update
		if(imageSrcWillChange && !firstResize) {
		// invalidateCurrItems sets a flag on slides that are in DOM,
		// which will force update of content (image) on window.resize.
		gallery.invalidateCurrItems();
		}

		if(firstResize) {
		firstResize = false;
		}

		imageSrcWillChange = false;

	});

	// gettingData event fires each time PhotoSwipe retrieves image source & size
	gallery.listen('gettingData', function(index, item) {

		// Set image source & size based on real viewport width,
		// but only if the scaled images actuallly exist:
		if( useLargeImages || item.sizes.scaled !== null ) {
		item.src = linkRoute + item.sizes.full.name;
		item.w = item.sizes.full.width;
		item.h = item.sizes.full.height;
		} else {
		item.src = linkRoute + item.sizes.scaled.name;
		item.w = item.sizes.scaled.width;
		item.h = item.sizes.scaled.height;
		}
	});
	gallery.init();
};

// you want to append one of the above colors to this url:
var pinLink = "http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|"
// e.g., like this:
var basePin = pinLink + basePinColor;


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
	}, 100);
};

var map = (function() {
	/* this closure is getting large and unwieldy... */

    var locale = new google.maps.LatLng(30,0);
    var mapOptions = {
            center: locale,
            zoom: 4,
			minZoom: 2,
			keyboardShortcuts: false,
			// HYBRID like SATELLITE, but shows labels:
            mapTypeId: google.maps.MapTypeId.ROADMAP, // TERRAIN, SATELLITE, HYBRID, ROADMAP
    };

    var _map = new google.maps.Map(document.getElementById('mapCanvas'), mapOptions);

    function setPinColor(pinColor) {
		return new google.maps.MarkerImage(
			pinLink + pinColor,
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
		var numerator = Math.random() * plusOrMinus();
		var denominator = Math.pow(zoom, 3);
		return zoom < 18 ? numerator/denominator : 0;
	};

	/*
	google.maps.event.addListener(_map, 'zoom_changed', function() {
		var zoom = _map.getZoom();
		console.log('zoom: '+zoom);
		for (var obj in markerObj) {
			marker = markerObj[obj];
			marker.position = new google.maps.LatLng(
				// ... starting to think the jitter
				// just needs to get away.... 
            	//marker.latitude + jitter(zoom),
                //marker.longitude + jitter(zoom)
				marker.latitude,
				marker.longitude
            );
			marker.setPosition(marker.position);
		}
	});
		
	google.maps.event.addListener(_map, 'center_changed', function() {
    	checkBounds(_map);
	});
	*/

	return {
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
				if (photo.geojson.coordinates[0] && photo.geojson.coordinates[1]) {
					var marker = new google.maps.Marker({
						// set actual lat/long for future reference:
						latitude: photo.geojson.coordinates[1],
						longitude: photo.geojson.coordinates[0],
						position: new google.maps.LatLng(
							 //photo.latitude + jitter(zoom),
							 //photo.longitude + jitter(zoom)
							photo.geojson.coordinates[1],
							photo.geojson.coordinates[0]
						),
						title: photo.date,
						map: _map,
						icon: basePin,
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

						// open the appropriate photo, 
						// based on array index:
						openPhotoSwipe(index);
					});
				}
			});	
		},
	};		
})();
			
	// append requisite html for photoSwipe:
	$(document.body).append('<div class="pswp" tabindex="-1" role="dialog" aria-hidden="true">    <div class="pswp__bg"></div>    <div class="pswp__scroll-wrap">        <div class="pswp__container">            <div class="pswp__item"></div>            <div class="pswp__item"></div>            <div class="pswp__item"></div>        </div>        <div class="pswp__ui pswp__ui--hidden">            <div class="pswp__top-bar">                <div class="pswp__counter"></div>                <button class="pswp__button pswp__button--close" title="Close (Esc)"></button>                <button class="pswp__button pswp__button--share" title="Share"></button>                <button class="pswp__button pswp__button--fs" title="Toggle fullscreen"></button>                <button class="pswp__button pswp__button--zoom" title="Zoom in/out"></button>                <div class="pswp__preloader">                    <div class="pswp__preloader__icn">                      <div class="pswp__preloader__cut">                        <div class="pswp__preloader__donut"></div>                      </div>                    </div>                </div>            </div>            <div class="pswp__share-modal pswp__share-modal--hidden pswp__single-tap">                <div class="pswp__share-tooltip"></div>             </div>            <button class="pswp__button pswp__button--arrow--left" title="Previous (arrow left)">            </button>            <button class="pswp__button pswp__button--arrow--right" title="Next (arrow right)">            </button>            <div class="pswp__caption">                <div class="pswp__caption__center"></div>            </div>        </div>    </div></div>');


	$.getJSON('/photos', function(json) {
		console.log('got json');

		json.forEach(function(item, index, array) {
			// add links to list:
			// create img:
			var $img = $("<img></img>")
				.attr('class', 'thumbnail')
				.attr('src', linkRoute + item.md5sum + '-small.jpg')
				.attr('height', '100px')
				.attr('width', '100px')
				.wrap($('#'+ item.md5sum));
			var $a = $("<a></a>")
				.attr('class', 'thumbLink')
				.attr('id', item.md5sum)
				//.attr('href', linkRoute + item.md5sum )
				.append($img)
				.appendTo($('#photoList'));
			// build photoArray for photoSwipe:
			photoArray.push({
				id: item.md5sum,
				sizes: item.sizes,
			});
		});

		// pass entire array to map, let it
		// parse them and add the geo-tagged ones:
		map.addPins(json);
	});

	// add click handlers for items in list -- open
	// photoSwipe, change color of viewed pins and
	// on map and center to them:
	$('#photoList').on('click', 'a', function(event) {
		event.preventDefault();
		openPhotoSwipe($(this).index());
		map.changePin($(this).attr('id'));
		map.centerPin($(this).attr('id'));
	});
