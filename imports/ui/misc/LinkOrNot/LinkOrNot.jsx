import React from 'react';
import { Link } from 'react-router-dom';
import _ from 'lodash';

const LinkOrNot = ({link, to, children, ...rest}) => {
  if (link) return React.createElement(Link, {to, ...rest}, children);
  return React.createElement("div", rest, children);
}

export default LinkOrNot;
