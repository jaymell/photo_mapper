
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
				var thumbnail = getThumbnail(albumJson.photos);
				var $img = $("<img></img>")
					.attr('class', 'thumbnail')
					.attr('src', thumbnail.name)
					.attr('height', thumbnail.height)
					.attr('width', thumbnail.width);
				var $a = $('<a></a>')
					.attr('class', 'albumLink')
					.attr('href', htmlRoute + albumJson.album_id)
					.append($img);
				var $span = $('<span/>', { class: 'albumCaption' } )
					.text(albumJson.album_name);
				var $div = $('<div/>', { class: 'albumItem' })
					.append($a)
					.append($span)
					.appendTo($('#albumList'));
			});
		}
	});
}


function getThumbnail(photoList) {
	// get an appropriate image from the json array
	// first, middle, last, most popular, whatever... 
	// return link -- src attrib for img tag
	if (photoList.length > 0)
		return photoList[0].small;
    else
      return {
        'height': 100,
        'width': 100,
        'size': 'thumbnail',
        'name': 'http://s3.amazonaws.com/jaymell-pm-static/no_photo.png'
      }
}


loadData();
