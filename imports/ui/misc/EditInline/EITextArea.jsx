import React from 'react';
import ReactDOM from 'react-dom';

import EITextField from './EITextField.jsx';


export default class EITextArea extends EITextField {
    renderEditingComponent = () => {
        return <textarea
            rows={this.props.rows}
            cols={this.props.cols}
            disabled={this.state.loading || this.props.disabled}
            defaultValue={this.props.value}
            onInput={e => this.valueChanged(e.target.value)}
            ref="input"
            onKeyDown={this.keyDown}
            {...this.props.editProps} />;
    };

    renderNormalComponent = () => {
        const value = this.state.newValue || this.props.value || this.props.emptyValue || "Set me.";
        return <span {...this.props.defaultProps}>
          <pre>value</pre>
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
        if (event.keyCode === 27) { this.cancelEditing() }     // Escape
    };
}
