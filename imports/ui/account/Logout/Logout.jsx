import React from 'react';
import { Meteor } from 'meteor/meteor';

import Icon from '../../misc/Icon/Icon';

import './Logout.scss';

class Logout extends React.Component {
  componentDidMount() {
    Meteor.logout();
  }

  render() {
    return (
      <div className="Logout">
        <h1>Bye!</h1>
      </div>
    );
  }
}

Logout.propTypes = {};

export default Logout;
