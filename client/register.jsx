import { FormControl, FormGroup, Modal } from 'react-bootstrap';
import React from 'react';
import { withRouter } from 'react-router';
var $ = require('jquery');
import { auth } from './app.jsx';

class Register extends React.Component {
  constructor(props) {
    super(props);
    this.handleNameChange = this.handleNameChange.bind(this);
    this.handleEmailChange = this.handleEmailChange.bind(this);
    this.handlePasswordChange = this.handlePasswordChange.bind(this);
    this.validatePassword = this.validatePassword.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleRegisterFailure = this.handleRegisterFailure.bind(this);
    this.handleRegisterSuccess = this.handleRegisterSuccess.bind(this);
    this.initialState = { name: '', 
                          email: '',
                          password1: '',
                          password2: '',
                          passwordValidation: 'error',
                          emailValidation: 'error',
                          nameValidation: 'error'
                        };
    this.state = this.initialState;
  }

  handleNameChange(e) {
    let re = /^[a-zA-Z]*$/;
    let name = e.target.value;
    this.setState({name: name});
    if (re.test(name)) {
      this.setState({nameValidation: 'success'});
    }
    else {
      this.setState({nameValidation: 'error'});
    }
  }

  validateEmail() {
    let re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (re.test(this.state.email)) {
      this.setState({emailValidation: 'success'});
    }
    else {
      this.setState({emailValidation: 'error'});
    }
  }

  handleEmailChange(e) {
    let email = e.target.value;
    this.setState({email: email});
    setTimeout(function() { this.validateEmail(); }.bind(this), 0);
  }

  validatePassword() {
    if ((this.state.password1.length > 6) && (this.state.password1 == this.state.password2 )) {
      this.setState({ passwordValidation: 'success'});
    }
    else {
      this.setState({ passwordValidation: 'error'});
    }
  }

  handlePasswordChange(num, e) {
    if (num == 1) {
      this.setState({ password1: e.target.value });
    }
    else {
      this.setState({ password2: e.target.value });
    }
    setTimeout(function() { this.validatePassword(); }.bind(this), 0);
  }

  handleRegisterSuccess(result) {
    let userId = result.user_id;
    let userUri = result.uri;
    let userName = result.userName;
    let userRoles = result.userRoles;
    auth.setUserId(userId);
    auth.setUserUri(userUri);
    auth.setUserName(userName);
    auth.setUserRoles(userRoles);
    this.props.router.push('/login');
  }

  handleRegisterFailure(err) {
    console.log(err);
    var that = this;
    $(this.refs.submitFailed).fadeIn("slow", function() {
      setTimeout(function() { 
        $(this.refs.submitFailed).fadeOut("slow");
      }.bind(that), 3000);
    });
    this.setState(this.initialState);
  }

  // FIXME: don't submit unless all fields validated
  handleSubmit(e) {
    let data = { 
                 user_name: this.state.name,
                 email: this.state.email, 
                 password1: this.state.password1, 
                 password2: this.state.password2
               };
    console.log(data);
    e.preventDefault();
    $.ajax({
      url: '/api/users',
      type: "POST",
      data: JSON.stringify(data),
      dataType: "json",
      contentType: "application/json"
    })
      .done(function(result) { 
        this.handleRegisterSucess(result);
      })
      .fail(function(err) { 
        this.handleRegisterFailure(err);
      });
  }

  render() {
    return (
      <div className="modal" style={{display: "block"}}>
        <div className="modal-dialog">
          <div className="myModalContainer">
            <h1>Register</h1><br />
            <h2 ref="submitFailed" className="myModalSubmitFailure">Registration Failed</h2><br/>
            <form>
              <FormGroup validationState={this.state.nameValidation}>
                <FormControl
                  className="myModalInputField"
                  type="text"
                  name="name"
                  value={this.state.name} 
                  placeholder="Name"
                  onChange={this.handleNameChange}
                />
              </FormGroup>
              <FormGroup validationState={this.state.emailValidation} >
                <FormControl
                  className="myModalInputField"
                  type="text"
                  name="email"
                  value={this.state.email} 
                  placeholder="Email Address"
                  onChange={this.handleEmailChange}
                />
              </FormGroup>
              <FormGroup validationState={this.state.passwordValidation} >
                <FormControl
                  className="myModalInputField"
                  type="password"
                  name="password1"
                  value={this.state.password1}
                  placeholder="Password"
                  onChange={function(e) { this.handlePasswordChange(1, e); }.bind(this) }
                />
                <FormControl
                  className="myModalInputField"
                  type="password"
                  name="password2"
                  value={this.state.password2} 
                  placeholder="Repeat Password"
                  onChange={function(e) { this.handlePasswordChange(2, e); }.bind(this) }
                />
              </FormGroup>
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

export default withRouter(Register);