import React from 'react';
import ReactDOM from 'react-dom';

import EIBase from './EIBase.jsx';


export default class EITextField extends EIBase {
  renderEditingComponent = () => {
    return <input
      disabled={this.state.loading || this.props.disabled}
      defaultValue={this.props.value}
      onInput={e => this.valueChanged(e.target.value)}
      ref="input"
      onKeyDown={this.keyDown}
      style={{ width: Math.max(5, Math.min(20, (""+this.props.value).length)) + "em" }}
      {...this.props.editProps}
    />;
  }

  renderNormalComponent = () => {
    return <span {...this.props.defaultProps} >
      {this.state.newValue || this.props.value || this.props.emptyValue || "Set me."}
    </span>;
  };

  componentDidUpdate = (prevProps, prevState) => {
    if (this.state.editing && !prevState.editing) {
      ReactDOM.findDOMNode(this.refs.input).focus();
    }
    // else if (this.state.editing && prevProps.text != this.props.text) {
    //   this.finishEditing();
    // }
  };

  keyDown = (event) => {
    if(event.keyCode === 13) { this.finishEditing() } // Enter
    else if (event.keyCode === 27) { this.cancelEditing() }     // Escape
  };
}
