import { withRouter } from 'react-router';
import React from 'react';
import { auth } from './app.jsx';

class Home extends React.Component {
  constructor(props) {
    super(props);
  }

  componentDidMount() {
    if (auth.isLoggedIn()) {
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