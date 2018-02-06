import React from 'react';

import './ExpandControl.scss';

const ExpandControl = ({expanded, onToggle}) => {
  return (
    <div
      className={"ExpandControl " + (expanded ? 'expanded' : 'collapsed')}
      onClick={() => { if (onToggle) onToggle(!expanded) }} />
  )
}

export default ExpandControl;
