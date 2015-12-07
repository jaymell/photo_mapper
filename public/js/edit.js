function dragStartHandler(e) {
	e.dataTransfer.setData("text/plain", e.target.id);
	e.dataTransfer.dropEffect = 'move';
	console.log('dragging: ', e.target.id);

}

function dragOverHandler(e) {
	e.preventDefault();
	//e.dataTransfer.dropEffect = 'move';
	console.log('something is hovering over me');
}

function dropHandler(e) {
	e.preventDefault();
	var id = e.dataTransfer.getData('text');
	console.log('received: ', id);	
	$.ajax({
		url: '/json',
		type: 'DELETE',
		data: 'id='+id,
		success: function(data) {
			console.log('success: ', data);
			$('#'+id).remove();
		},
		error: function(err) {
			console.log('delete failedi: ', err);
		},
	});	
}

function dragEndHandler(e) {
	console.log('drag is done');
}

$(document).ready(function() {
    // override magnificPopup.resizeImage:
    $.magnificPopup.instance.resizeImage = betterResizeImage;

    var magnific = $('#photoList').magnificPopup({
        delegate: 'img', // child items selector, by clicking on it popup will open
        type: 'image',
		closeOnContentClick: true,
	});

/*
	magnific.off('click');
	magnific.on('click', function(e) {
		e.preventDefault();
	});
	magnific.on('dblclick', function(blah, blah2) {
		console.log(blah);
		console.log(blah2);
		magnific.magnificPopup('open')
	});
*/

	$.getJSON('/json', function(json) {
		console.log('got json');
		json.forEach(function(item) {
			var img=$('<img/>')
				.attr('id', item.md5sum)
				.attr('src', '/img/' + item.thumbnail)
				.attr('class', 'thumbnail')
				.attr('data-mfp-src', '/img/' + item.file_name)
				.attr('draggable', 'true')
				.attr('ondragstart', 'dragStartHandler(event)')
				.attr('ondragend', 'dragEndHandler(event)')
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
