$(document).ready(function() {
	$.getJSON('/json', function(json) {
		console.log('got json');
		json.forEach(function(item) {
			var img=$('<img />').attr('src', '/img/' + item.thumbnail)
				.on('load', function() {
					if (!this.complete || typeof this.naturalWidth == "undefined" || this.naturalWidth == 0) {
						console.log('error loading ' + item.thumbnail);
					} else {
						$('#photoList').append(img);
					}				
				});
		});
	});
});
