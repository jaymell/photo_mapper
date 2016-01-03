var user = window.readCookie("user");
var api_route = "/api/users/" + user + "/albums";
var html_route = "/users/" + user + "/albums/";

$.getJSON(api_route, function(json) {
	console.log('got json');
    json.forEach(function(item, index, array) {
		var $a=$('<a></a>')
			.attr('href', html_route + item)
			.text(item)
			.appendTo($('#albumList'));
	});
});
