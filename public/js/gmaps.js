var map = (function() {

        var locale = new google.maps.LatLng(30,0);
        var mapOptions = {
                center: locale,
                zoom: 2,
                mapTypeId: google.maps.MapTypeId.SATELLITE // TERRAIN, SATELLITE, HYBRID, ROADMAP
        };
        var map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
	return {
		addPins: function(photoList) {
			photoList.forEach(function(photo, index, array) {
				if (photo.latitude && photo.longitude) {
					var marker = new google.maps.Marker({
						position: new google.maps.LatLng(photo.latitude, photo.longitude),
						title: photo.date,
					});
					var CONST = 10;
					var html = '<div height="' + (photo.height/CONST) + '"' +
								'width="' + (photo.width/CONST) + '">' +
								'<img height="' + (photo.height/CONST) + '"' +
									'width="' + (photo.width/CONST) +'"' +
									'src="/img/' + 
									photo.file_name + '">' +
								'</img></div>';
                        /*
						*/

					marker.info = new google.maps.InfoWindow({
						content: html,
					});
					marker.addListener('click', function() {
						// map.setZoom(8);
						map.setCenter(marker.getPosition());	
						marker.info.open(map, marker);
					});
					marker.setMap(map);
				}
			});	
		}
	}		
})();
		
window.onload = function() {
	var xhReq = new XMLHttpRequest();
	var url = '/json';
	xhReq.open("GET", url, false);
	xhReq.send(null);
	var json = JSON.parse(xhReq.responseText);
	map.addPins(json);
}();
