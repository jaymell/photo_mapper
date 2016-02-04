// submit form when files selected: 
// http://abandon.ie/notebook/simple-file-uploads-using-jquery-ajax 

function validInput(input) {
	// this needs to be fixed
	// to allow spaces between words
    return input.match(/^[\w]+$/);
}

// called when all photos
// processed:
function uploadsComplete() {
	loadData();	
}

$('#inFile').on('change', function(e) { 

	// this should always force prompt
	// for album name if photos submitted
	// from album listing page:
	if (typeof album == 'undefined') {
		album = prompt("Enter the album name");
		if ( ! validInput(album) ) {
			alert('Bad album name: Only letters, numbers, and underscores allowed');
			location.reload();
			return;
		}
	}
	// possible if something
	// is wrong with cookie handling:
	if (user === 'undefined') {
		alert('user is undefined!');
		return;
	}

	// if we actually got an album 
	// name from input:
	if (album != null) {
		var files = e.target.files;  
		var num_completed = 0;
		for ( var i=0; i<files.length; i++) {
			data = new FormData(); 
			data.append(files[i].name,files[i]); 
			$.ajax({ 
				url: '/api/users/' + user + '/albums/' + album + '/photos', 
				type: 'POST', 
				data: data, 
				cache: false, 
				processData: false, 
				contentType: false, 
				success: function(resp) { 
					console.log('success', resp);
					num_completed += 1;
					if (num_completed == files.length) uploadsComplete();
				}, 
				failure: function(resp) { 
					console.log('failure', resp);
					num_completed += 1;
					if (num_completed == files.length) uploadsComplete();
				} 
			}); 
		}
	}
});

