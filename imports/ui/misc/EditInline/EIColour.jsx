import React from 'react';
import ReactDOM from 'react-dom';
import EIBase from './EIBase.jsx';

import './EditInline.scss';

export default class EIColour extends EIBase {
  constructor(props) {
    super(props);
		this.timeoutId = false;
  }

  handleChangeEvent = () => {
    // According to the spec the "input event is fired at the input element
    // every time the color changes. The change event is fired when the user
    // dismisses the color picker" but Chrome fires both the 'change' event
    // every time the colour changes. This function prevents too many
    // requests being sent to the server.
    window.clearTimeout(this.timeoutId);
    this.timeoutId = window.setTimeout(() => {
      this.finishEditing();
    }, 1000);
  }

  renderEditingComponent = () => {
    const { value, shouldBlockWhileLoading, editProps } = this.props;
    const { loading } = this.state;

    const disabled = (!!this.props.disabled) || ((!!shouldBlockWhileLoading) && (!!loading));

    return (<div className="edit-inline-color-container">
      <input disabled={disabled}
        type="color"
        className={this.makeClassString()}
        defaultValue={value}
        onChange={this.handleChangeEvent}
        ref="input"
        {...editProps} />

       <div style={{backgroundColor: value}} className="edit-inline-color"
           onClick={ e => { if (!disabled) this.refs['input'].click(); } } />
    </div>);
  }

  render = () => {
  	return this.renderEditingComponent();
  }
}
