import React from 'react';

import ExpandControl from './ExpandControl';

import './Expand.scss';

class Expandable extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      expanded: this.props.defaultExpanded || false,
    };
  }

  render() {
    const { children, onToggle, collapsedHeight, collapsedWidth, showEllipsis, disabled } = this.props;
    const { expanded } = this.state;
    return (
      <div className={"Expandable " + (expanded ? 'expanded' : 'collapsed')} style={{height: expanded ? 'auto' : (collapsedHeight || '1.5em')}}>
        { !disabled && <ExpandControl expanded={expanded}
          onToggle={expanded => { this.setState({expanded}); onToggle && onToggle(expanded); }}
        /> }
        <div className="content" style={{width: !expanded && collapsedWidth ? collapsedWidth : "auto"}}>
          { children }
        </div>
        { showEllipsis && <span className="ellipsis">…</span> }
      </div>
    )
  }
}

export default Expandable;
