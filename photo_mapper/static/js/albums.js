
//
// why is this using global variables ????
//

var user = window.readCookie("user");
var apiRoute = "/api/users/" + user + "/albums";
var htmlRoute = "/users/" + user + "/albums/";

function loadData() {
	$.getJSON(apiRoute, function(albumList) {
		console.log('got json');
		// if no albums:
		if ( albumList.length == 0 ) {
			var $p = $('<p></p>')
				.attr('id', 'noAlbumsFoundText')
				.text('No albums found. You should upload some photos.')
				.appendTo($('#albumList'));
		}
		else { 
			// empty div, only matters if called
			// multiple times without page load
			$('#albumList').empty();
			// expects albumList to look like this: [ 'album1', 'album2', 'album3' ]
			albumList.forEach(function(albumJson, index, array) {
				var album = albumJson.name;
				// get photo JSON:
				console.log('album = ', album);
				$.getJSON(apiRoute + '/' + album + '/photos', function(photoList) {
					console.log('photoList: ', photoList);
					var link = getPhotoLink(photoList);
					var $img = $("<img></img>")
						.attr('class', 'thumbnail')
						.attr('src', photoRoute + '/' + link)
						.attr('height', '100px')
						.attr('width', '100px');
					var $a = $('<a></a>')
						.attr('class', 'albumLink')
						.attr('href', htmlRoute + album)
						.append($img);
					var $span = $('<span/>', { class: 'albumCaption' } )
						.text(album);
					var $div = $('<div/>', { class: 'albumItem' })
						.append($a)
						.append($span)
						.appendTo($('#albumList'));
				});
			});
		}
	});
}

function getPhotoLink(albumJson) {
	// get an appropriate image from the json array
	// first, middle, last, most popular, whatever
	// return link -- src attrib for img tag
	return albumJson[0]['sizes']['thumbnail']['name'];
}

loadData();
