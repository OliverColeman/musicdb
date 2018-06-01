import React from 'react';
import ReactDOM from 'react-dom';

import EIBase from './EIBase.jsx';


export default class EITextField extends EIBase {
  renderEditingComponent = () => {
    return <input
      disabled={this.state.loading || this.props.disabled}
      className={this.makeClassString()}
      defaultValue={this.props.value}
      onInput={this.textChanged}
      onBlur={this.elementBlur}
      ref="input"
      onKeyDown={this.keyDown}
      style={{ width: Math.max(5, Math.min(20, (""+this.props.value).length)) + "em" }}
      {...this.props.editProps}
    />;
  }

  renderNormalComponent = () => {
    return <span
      className={this.makeClassString()}
      {...this.props.defaultProps}
    >
      {this.state.newValue || this.props.value || this.props.emptyValue || "Set me."}
    </span>;
  };

  elementBlur = (event) => {
    this.finishEditing();
  };
}
