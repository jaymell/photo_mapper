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
 
	if (typeof album == 'undefined') {
		album = prompt("Enter the album name");
		// regex testing
	}
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
			success: function(resp) { console.log('success', resp); }, 
			failure: function(resp) { console.log('failure', resp); } 
		}); 
	}
});

