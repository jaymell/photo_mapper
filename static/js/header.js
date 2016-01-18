// submit form when files selected: 
// http://abandon.ie/notebook/simple-file-uploads-using-jquery-ajax 

function validInput(input) {
	// allow \w and spaces between \w
    return input.match(/^[\w]+$/);

}

$('#inFile').on('change', function(e) { 
    files = e.target.files;  
    console.log('files: ', files); 
    data = new FormData(); 
    $.each(files, function(key, value) { 
        data.append(key,value); 
    }); 
    console.log('data: ', data); 
 
	if (typeof album == 'undefined') {
		album = prompt("Enter the album name");
		if ( ! validInput(album) ) {
			alert('Bad album name: Only letters, numbers, and underscores allowed');
			location.reload();
			return;
		}
	}
	console.log('album: ',album);
	if (user === 'undefined') {
		alert('user is undefined!');
		return;
	}
	if (album != null) {
		$.ajax({ 
			url: '/api/users/' + user + '/albums/' + album + '/photos', 
			type: 'POST', 
			data: data, 
			cache: false, 
			processData: false, 
			contentType: false, 
			success: function(resp) { console.log('success', resp);	}, 
			failure: function(resp) { console.log('failure', resp); } 
		}); 
	}
});

