import { FormControl, FormGroup, Modal } from 'react-bootstrap';
import React from 'react';
import ReactDOM from 'react-dom';
import { withRouter } from 'react-router';
var $ = require('jquery');
import { auth } from './app.jsx';

export default class UploadForm extends React.Component {
  constructor(props) {
    super(props);
    this.handleFileButtonClick = this.handleFileButtonClick.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.defaultLabelText = "Choose Files..."
    this.state = { labelText: this.defaultLabelText };
  }

  handleFileButtonClick(e) {
    let numFiles = e.target.files ? e.target.files.length : 0;
    let labelText;
    if (numFiles == 0) {
      labelText = this.defaultLabelText;
    }
    else if (numFiles === 1) {
      labelText = numFiles + ' file selected';
    } 
    else {
      labelText = numFiles + ' files selected';
    }
    this.setState({labelText: labelText});
  }

  handleSubmit() {
    let files = ReactDOM.findDOMNode(this.refs.fileButton).files;  
    let num_completed = 0;
    let data = new FormData(); 
    // FIXME: this needs to run in parallel
    // and handle when all done by at least, toggling off the modal
    for ( var i=0; i<files.length; i++) {
      console.log('appending')
      data.append(files[i].name,files[i]); 
      $.ajax({ 
        url: '/api/users/' + auth.getUserId() + '/photos', 
        type: 'POST', 
        data: data, 
        cache: false, 
        processData: false, 
        contentType: false
      })
        .done(function(resp) { 
          console.log('success', resp);
          num_completed += 1;
          // if (num_completed == files.length) uploadsComplete();
        }) 
        .fail(function(resp) { 
          console.log('failure', resp);
          num_completed += 1;
          // if (num_completed == files.length) uploadsComplete();
        })
    }
  }

  render() {
    return (
      <div className="modal" style={{display: "block"}}>
        <div className="modal-dialog">
          <div className="myModalContainer">
            <h1>Upload Photos</h1><br />
            <h2 ref="submitFile" className="myModalSubmitFailure">Registration Failed</h2><br/>
            <form>
                <label ref="fileButtonLabel"
                       className="btn btn-default btn-file" 
                >
                  {this.state.labelText}
                  <FormControl
                    ref="fileButton"
                    type="file"
                    name="files[]"
                    multiple="true"
                    onChange={this.handleFileButtonClick}
                    style={{display: "none"}}
                  />
                </label>
              <FormControl
                className="login myModalSubmit"
                id="mySubmitButton"
                type="submit"
                name="register"
                value="Submit"
                onClick={this.handleSubmit}
              />
            </form>
          </div>
        </div>
      </div>
	  );	
  }
}