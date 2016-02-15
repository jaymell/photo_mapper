
//
// why is this using global variables ????
//
function loadData(apiRoute, htmlRoute) {
	$.getJSON(apiRoute, function(albumList) {
		console.log('got json');
		// if no albums:
		if ( albumList.length == 0 ) {
			var $p = $('<p></p>')
				.text('No albums found')
				.appendTo($('#albumList'));
		}
		else { 
			// empty div, only matters if called
			// multiple times without page load
			$('#albumList').empty();
			albumList.forEach(function(album, index, array) {
				// get photo JSON:
				$.getJSON(apiRoute + '/' + album + '/photos', function(photoList) {
					var link = getPhotoLink(photoList);
				});
				var $img = $("<img></img>")
					.attr('class', 'thumbnail')
					.attr('src', photoRoute + link)
					.attr('height', '100px')
					.attr('width', '100px');
				var $a = $('<a></a>')
					.attr('class', 'albumLink')
					.attr('href', htmlRoute + album)
					.text(album)
					.append($img);
				var $p = $('</p></p>')
					.text('ALBUM NAME');
				var $div = $('<div/>', { class: albumItem })
					.append($a)
					.append($p)
					.appendTo($('#albumList'));
			});
		}
	});
}

function getPhotoLink(albumJson) {
	// get an appropriate image from the json array
	// first, middle, last, most popular, whatever
	// return link -- src attrib for img tag
	return albumJson[0]['sizes']['thumbnail']['name'];
/*
[{"album": "testing", "sizes": {"scaled": {"width": 1200, "name": "2fc4bce30b0468bd9629ee13f0d2e5e5-scaled.jpg", "height": 900}, "small": {"width": 100, "name": "2fc4bce30b0468bd9629ee13f0d2e5e5-small.jpg", "height": 100}, "full": {"width": 2560, "name": "2fc4bce30b0468bd9629ee13f0d2e5e5.jpg", "height": 1920}, "thumbnail": {"width": 256, "name": "2fc4bce30b0468bd9629ee13f0d2e5e5-thumbnail.jpg", "height": 192}}, "md5sum": "2fc4bce30b0468bd9629ee13f0d2e5e5", "geojson": {"type": "Point", "coordinates": [8.809077277777778, 47.31462408333333]}, "user": "james", "date": "1969-12-31 19:04:16"}]
*/

}

var user = window.readCookie("user");
var apiRoute = "/api/users/" + user + "/albums";
var htmlRoute = "/users/" + user + "/albums/";

loadData(apiRoute, htmlRoute);
