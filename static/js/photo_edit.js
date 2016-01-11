var linkRoute = '/static/img/';
var files;
var data;

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
		url: '/photos',
		type: 'DELETE',
		data: 'id='+id,
		success: function(data) {
			console.log('success: ', data);
			$('#'+id).remove();
		},
		error: function(err) {
			console.log('delete failed: ', err);
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
	
	$('#trashCanDesc').on('dragover', function(e) { dragOverHandler(e); });
/* 
	var magnificLinks = magnific.find('img');
	magnific.off('click');
	magnificLinks.on('click', function(e) {
		e.preventDefault();
	});
	magnificLinks.on('dblclick', function() {
		magnific.magnificPopup('open', magnificLinks.index(this))
	});
*/

	var user = window.readCookie("user");
	var album = window.readCookie("album");
	var photo_route = "/api/users/" + user + "/albums/" + album + "/photos";

	$.getJSON(photo_route, function(json) {
		console.log('got json');
		json.forEach(function(item) {
			var img=$('<img/>')
				.attr('id', item.md5sum)
				.attr('src', linkRoute + item.sizes.thumbnail.name)
				.attr('class', 'thumbnail')
				.attr('data-mfp-src', linkRoute + item.sizes.full.name)
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

	// submit form when files selected:
	// http://abandon.ie/notebook/simple-file-uploads-using-jquery-ajax
	$('#inFile').on('change', function(e) {
		files = e.target.files;	
		console.log('files: ', files);
		data = new FormData();
		$.each(files, function(key, value) {
			data.append(key,value);
		});
		console.log('data: ', data);

		var user = window.readCookie("user");
		var album = window.readCookie("album");

		$.ajax({
			url: '/api/users/' + user + '/albums/' + album + '/photos',
			type: 'POST',
			data: data,
            cache: false,
			processData: false,
			contentType: false,
			success: function(resp) { console.log('success', resp); },
			failure: function(resp) { console.log('failure', resp); }
		});
	});
});
