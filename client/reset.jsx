import React from 'react';
import { withRouter } from 'react-router';

export class Reset extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return <h1>Reset</h1>
  }
}

export default withRouter(Reset);