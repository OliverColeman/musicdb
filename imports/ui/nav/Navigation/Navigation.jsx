import React from 'react';
import PropTypes from 'prop-types';
import { Meteor } from 'meteor/meteor';
import { Navbar, Nav, NavItem } from 'react-bootstrap';
import { withRouter, Link } from 'react-router-dom';

import Access from '../../../modules/access';
import PlayListCollection from '../../../api/PlayList/PlayList';

import './Navigation.scss';


const menuItems = {
  left: [
    { title: "Import", url: "/import", access: {collection: PlayListCollection, op: 'create'} },
    { title: "Library", url: "/library", access: {collection: Meteor.users, op: 'update'} },
  ],
  right: [
    { title: "Sign up", url: "/signup", access: {collection: Meteor.users, op: 'signup'} },
    { title: "Log in", url: "/login", access: {collection: Meteor.users, op: 'login'} },

    { title: "My profile", url: "/profile", access: {collection: Meteor.users, op: 'update'} },
    { title: "Log out", url: "/logout", access: {collection: Meteor.users, op: 'logout'} },
  ]
};


const Navigation = props => (
  <Navbar collapseOnSelect onSelect={key => props.history.push(key)}>
    <Navbar.Header>
      <Navbar.Brand>
        <Link to="/">Home</Link>
      </Navbar.Brand>
      <Navbar.Toggle />
    </Navbar.Header>

    <Navbar.Collapse>
      <Nav activeKey={props.history.location.pathname}>
        { menuItems.left
          .filter(item => Access.allowed(item.access.collection, item.access.op))
          .map(item => (
            <NavItem eventKey={item.url} href={item.url} key={item.url}>{item.title}</NavItem>
          ))
        }
      </Nav>
      <Nav activeKey={props.history.location.pathname} pullRight>
        { menuItems.right
          .filter(item => Access.allowed(item.access.collection, item.access.op))
          .map(item => (
            <NavItem eventKey={item.url} href={item.url} key={item.url}>{item.title}</NavItem>
          ))
        }
      </Nav>
    </Navbar.Collapse>
  </Navbar>
);


Navigation.defaultProps = {
  name: '',
};

Navigation.propTypes = {
  authenticated: PropTypes.bool.isRequired,
  name: PropTypes.string,
  history: PropTypes.object.isRequired,
};

export default withRouter(Navigation);
