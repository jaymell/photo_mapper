import React from 'react';
var Link = require('react-router').Link;
var $ = require('jquery');
import { auth } from './app.jsx';
import { withRouter } from 'react-router';

class Login extends React.Component {
  constructor(props) {
    super(props);
    this.state = { user: '', pass: '' };
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleUser = this.handleUser.bind(this);
    this.handlePassword = this.handlePassword.bind(this);
    this.handleLoginFailure = this.handleLoginFailure.bind(this);
    this.handleLoginSuccess = this.handleLoginSuccess.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  componentWillUnmount() {
    $(this.refs.loginModal).removeClass('fade').modal('hide');
  }

  redirect() {
    if (location.state && location.state.nextPathname) {
      this.props.router.replace(location.state.nextPathname);
    } 
    else {
      this.props.router.replace('/');
    }    
  }

  handleLoginSuccess(result) {
    auth.setToken(result.token);
  }

  handleLoginFailure(err) {
    console.log(err);
    var that = this;
    $(this.refs.loginFailed).fadeIn("slow", function() {
      setTimeout(function() { 
        $(this.refs.loginFailed).fadeOut("slow");
      }.bind(that), 3000);
    });
    this.setState({user: '', pass: ''});
  }

  handleSubmit(e) {
    e.preventDefault();
    console.log(this.state.user, this.state.pass);
    $.ajax({
      url: '/api/token',
      user: this.state.user,
      password: this.state.pass
    })
      .done(function(result) { 
        this.handleLoginSuccess(result);
      })
      .fail(function(err) { 
        this.handleLoginFailure(err); 
      });
  }

  handleUser(e) {
    this.setState({user: e.target.value });
  }

  handlePassword(e) {
    this.setState({pass: e.target.value });
  }

  render() {
    return (
      <div ref="loginModal" 
           className="modal" 
           style={{display: "block"}}>
        <div className="modal-dialog">
          <div className="myModalContainer">
            <h1>Login to Your Account</h1><br />
            <h2 ref="loginFailed" className="myModalSubmitFailure">Login Failed</h2><br/>
            <form>
              <input type="text"
                     name="user"
                     className="myModalInputField"
                     value={this.state.user} 
                     placeholder="Username"
                     onChange={this.handleUser}
              />
              <input type="password" 
                     name="password"
                     className="myModalInputField"
                     value={this.state.pass} 
                     placeholder="Password"
                     onChange={this.handlePassword}
              />
              <input type="submit" 
                     name="login" 
                     className="login myModalSubmit" 
                     value="Login" 
                     onClick={this.handleSubmit}
              />
            </form>
            <div className="myModalLinks">
              <a href='/#/register'>Register</a> - <Link to='/reset'>Forgot Password</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default withRouter(Login);