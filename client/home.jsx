import { withRouter } from 'react-router';
import React from 'react';
import { auth } from './app.jsx';

class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = { isLoggedIn: auth.isLoggedIn() };
  }

  componentDidMount() {
    if (this.state.isLoggedIn) {
      this.props.router.push('/photos');
    }
    else {
      this.props.router.push('/login');
    }
  }

  render() {
    return null;
  }
}

export default withRouter(Home);