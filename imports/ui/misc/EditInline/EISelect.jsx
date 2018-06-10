import React from 'react';
import ReactDOM from 'react-dom';
import Select from 'react-select';
import 'react-select/dist/react-select.css';

import EIBase from './EIBase.jsx';


export default class EISelect extends EIBase {
  constructor(props) {
    super(props);
    this.state.value = this.props.value;
  }

  renderEditingComponent = () => {
    return <Select
      disabled={this.state.loading || this.props.disabled}
      value={this.getSelectedOptions()}
      onChange={this.handleChange}
      multi={Array.isArray(this.props.value)}
      options={this.props.options}
      valueKey={this.props.valueKey}
      labelKey={this.props.labelKey}
      {...this.props.editProps}
    />;
  }

  getSelectedOptions = () => {
    if (!Array.isArray(this.props.value)) {
      return this.props.options.find(o => this.state.newValue == o[this.props.valueKey]);
    }
    return this.state.newValue.map(v => this.props.options.find(o => o[this.props.valueKey] == v));
  }

  handleChange = (value) => {
    if (!Array.isArray(value)) {
      this.valueChanged(value ? value[this.props.valueKey] : null);
    }
    else {
      this.valueChanged(value.map(v => v[this.props.valueKey]));
    }
  }

  renderNormalComponent = () => {
    let values = this.getSelectedOptions();
    values = Array.isArray(values) ? values : [values];
    values = values.map(v => v[this.props.labelKey]).join(', ').trim();
    console.log('v', values);
    values = values || this.props.emptyValue || "Set me.";
    return <span {...this.props.defaultProps} >
      { values }
    </span>;
  };
}
