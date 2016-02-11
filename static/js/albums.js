
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
				
				/*
				var $a=$('<a></a>')
					.attr('class', 'albumLink')
					.attr('href', htmlRoute + album)
					.text(album)
					.appendTo($('#albumList'));
				*/
				});
			});
		}
	});
}

function getPhotoLink(albumJson) {
	// get an appropriate image from the json array
	// first, middle, last, most popular, whatever
	// return link -- src attrib for img tag
}

var user = window.readCookie("user");
var apiRoute = "/api/users/" + user + "/albums";
var htmlRoute = "/users/" + user + "/albums/";

loadData(apiRoute, htmlRoute);
