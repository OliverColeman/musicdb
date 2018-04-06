import React from 'react';
import PropTypes from 'prop-types';
import { Navbar, Nav, NavItem } from 'react-bootstrap';
import { withRouter, Link } from 'react-router-dom';

import Access from '../../../modules/access';
import PlayListCollection from '../../../api/PlayList/PlayList';

import './Navigation.scss';


const menuItems = {
  left: [
    { title: "Import", url: "/import", access: {collection: PlayListCollection, op: 'create'} },
    { title: "Library", url: "/library", access: {role: Access.AUTHENTICATED} },
  ],
  right: [
    { title: "Sign up", url: "/signup", access: {role: Access.UNAUTHENTICATED} },
    { title: "Log in", url: "/login", access: {role: Access.UNAUTHENTICATED} },

    { title: "My profile", url: "/profile", access: {role: Access.AUTHENTICATED} },
    { title: "Log out", url: "/logout", access: {role: Access.AUTHENTICATED} },
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
          .filter(item => Access.allowed(item.access))
          .map(item => (
            <NavItem eventKey={item.url} href={item.url} key={item.url}>{item.title}</NavItem>
          ))
        }
      </Nav>
      <Nav activeKey={props.history.location.pathname} pullRight>
        { menuItems.right
          .filter(item => Access.allowed(item.access))
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
