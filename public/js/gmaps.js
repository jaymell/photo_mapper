var map = (function() {

        var locale = new google.maps.LatLng(30,0);
        var mapOptions = {
                center: locale,
                zoom: 2,
                mapTypeId: google.maps.MapTypeId.SATELLITE // TERRAIN, SATELLITE, HYBRID, ROADMAP
        };
        console.log(mapOptions.mapTypeId);

        var map = new google.maps.Map(document.getElementById('map'), mapOptions);

	return {
		addPins: function(photoList) {
			photoList.forEach(function(photo, index, array) {
				if (photo.latitude && photo.longitude) {
					var marker = new google.maps.Marker({
						position: new google.maps.LatLng(photo.latitude, photo.longitude),
						title: photo.date,
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

}();
