var user = window.readCookie("user");
var apiRoute = "/api/users/" + user + "/albums";
var htmlRoute = "/users/" + user + "/albums/";

$.getJSON(apiRoute, function(json) {
	console.log('got json');
	// if no albums:
	if ( json.length == 0 ) {
		var $p=$('<p></p>')
			.text('No albums found')
			.appendTo($('#albumList'));
	}
	else { 
		json.forEach(function(item, index, array) {
			var $a=$('<a></a>')
				.attr('href', htmlRoute + item)
				.text(item)
				.appendTo($('#albumList'));
		});
	}
});
