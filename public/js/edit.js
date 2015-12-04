$(document).ready(function() {

    $('#photoList').magnificPopup({
        delegate: 'img', // child items selector, by clicking on it popup will open
        type: 'image',
		closeOnContentClick: true,
	});

	$.getJSON('/json', function(json) {
		console.log('got json');
		json.forEach(function(item) {
			var img=$('<img/>')
				.attr('src', '/img/' + item.thumbnail)
				.attr('class', 'thumnail')
				.attr('data-mfp-src', '/img/' + item.file_name)
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
