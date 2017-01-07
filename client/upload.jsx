import { FormControl, FormGroup, Modal, ProgressBar } from 'react-bootstrap';
import React from 'react';
import ReactDOM from 'react-dom';
import { withRouter } from 'react-router';
var $ = require('jquery');
import { auth } from './app.jsx';
var Promise = require('bluebird');

export default class UploadForm extends React.Component {
  constructor(props) {
    super(props);
    this.handleFileButtonClick = this.handleFileButtonClick.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.defaultLabelText = "Choose Files..."
    this.state = { labelText: this.defaultLabelText, totalDone: 0, total: 1, progressBarVisibility: "hidden" };
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

  handleSubmit(e) {
    var that = this;
    e.preventDefault();
    let files = ReactDOM.findDOMNode(this.refs.fileButton).files;  
    let userId = auth.getUserId();
    let tasks = [];
    this.setState({ total: files.length });
    for ( var i=0; i<files.length; i++) {
      let data = new FormData(); 
      data.append(files[i].name, files[i]);
      tasks.push(function() {
        return new Promise(function(resolve) {
          $.ajax({ 
            url: '/api/users/' + userId + '/photos', 
            type: 'POST', 
            data: data, 
            cache: false, 
            processData: false, 
            contentType: false
          })
            .done(function(resp) {
              console.log('upload sucess: ', resp);
              resolve();
            }.bind(that)) 
            .fail(function(resp) { 
              console.log('upload failure: ', resp);
              resolve();
            }.bind(that))
            .always(function() {
              this.setState({ totalDone: this.state.totalDone+1, progressBarVisibility: "visible" });
            }.bind(that));      
        });
      }());
    }
    Promise.all(tasks)
      .then(this.props.toggleUploadForm);
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
        <div style={{width: "80%", margin: "auto", visibility: this.state.progressBarVisibility }}>
          <ProgressBar active now={Math.floor((this.state.totalDone/this.state.total)*100)} /></div>
      </div>
	  );	
  }
}