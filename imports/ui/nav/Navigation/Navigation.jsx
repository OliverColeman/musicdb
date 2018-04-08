import React from 'react';
import PropTypes from 'prop-types';
import { Navbar, Nav, NavItem, NavDropdown, MenuItem } from 'react-bootstrap';
import { withRouter, Link } from 'react-router-dom';
import autoBind from 'react-autobind';

import routes from '../../routes';
import Access from '../../../modules/access';

import './Navigation.scss';


class Navigation extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);
  }


  renderItem(item, depth) {
    if (!item.children) {
      if (depth == 1) return (
        <NavItem eventKey={item.url} href={item.url} key={item.url}>{item.title}</NavItem>
      );
      return (
        <MenuItem eventKey={item.url} key={item.url}>{item.title}</MenuItem>
      );
    }

    return this.renderItems(item.children, depth+1, item.title);
  }


  renderItems(menuItems, depth, title, pullRight) {
    const items = menuItems
      .filter(item => Access.allowed(item.access))
      .map(item => this.renderItem(item, depth+1));

    if (depth == 0) return (
      <Nav className={pullRight ? 'pull-right' : ''}>
        { items }
      </Nav>
    );

    const key = title.replace(" ", "_");

    return (
      <NavDropdown eventKey={key} title={title} key={key} id={key + "-nav-dropdown"}>
        { items }
      </NavDropdown>
    );
  }


  render() {
    const props = this.props;

    const leftItems = routes.filter(item => item.menu == 'left');
    const rightItems = routes.filter(item => item.menu == 'right');

    return (
      <Navbar collapseOnSelect onSelect={key => props.history.push(key)}>
        <Navbar.Header>
          <Navbar.Brand>
            <Link to="/">Home</Link>
          </Navbar.Brand>
          <Navbar.Toggle />
        </Navbar.Header>

        <Navbar.Collapse>
          { this.renderItems(leftItems, 0) }
          { this.renderItems(rightItems, 0, null, true) }
        </Navbar.Collapse>
      </Navbar>
    );
  }
}


Navigation.defaultProps = {
  name: '',
};

Navigation.propTypes = {
  authenticated: PropTypes.bool.isRequired,
  name: PropTypes.string,
  history: PropTypes.object.isRequired,
};

export default withRouter(Navigation);
