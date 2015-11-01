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

	return {
		addPins: function(photoList) {
			photoList.forEach(function(photo, index, array) {
				if (photo.latitude && photo.longitude) {
					var marker = new google.maps.Marker({
						position: new google.maps.LatLng(photo.latitude, photo.longitude),
						title: photo.date,
						map: map,
						icon: basePin,
					});
					marker.addListener('click', function() {
						map.setCenter(marker.getPosition());	
						marker.setIcon(changedPin);	
						//eventFire(document.getElementById(photo.md5sum), 'click');
						$.magnificPopup.open({
							items: {
								src: '/img/' + photo.file_name,
							},
							type: 'image'
						});
					});
				}
			});	
		}
	}		
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
				'<li><a id="' + item.md5sum + '" href="/img/' + item.file_name + '">' + item.date + '</a></li>' 
			);
		});
		map.addPins(json);
	});

	$('#photoList').magnificPopup({
    	delegate: 'a', // child items selector, by clicking on it popup will open
    	type: 'image'
	});
});
