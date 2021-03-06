import React from 'react';
import PropTypes from 'prop-types';
import { Meteor } from 'meteor/meteor';
import { createContainer } from 'meteor/react-meteor-data';
import { ReactiveVar } from 'meteor/reactive-var';
import { Bert } from 'meteor/themeteorchef:bert';
import _ from 'lodash';

import EITextField from './EITextField';
import EITextArea from './EITextArea';
import EIColour from './EIColour'
import EISelect from './EISelect';

import './EditInline.scss';


class EditInline extends React.Component {
  constructor (props) {
    super(props);

    this.state = {};
    this.state[props.field] = _.get(props.doc, props.field);
  }

  validate = (value) => {
    if (this.props.required && !value) return "Required."
    for (let func of this.props.validationFuncs) {
      validationResult = func(value);
      let isValid = typeof validationResult == 'string' ? validationResult.length == 0 : !!validationResult;
      if (!isValid) return validationResult;
    }
    return true;
  }

  updateDoc = (newValue) => {
  	const { updateMethod, doc, field } = this.props;

    if (typeof newValue == 'string') newValue = newValue.trim();
  	_.set(doc, field, newValue);

    Meteor.call(updateMethod, doc, (error, result) => {
      if (error) {
      	Bert.alert(error.reason, 'danger');
      }
    });
  }

  render = () => {
  	const { doc, field, inputType, required, disabled, emptyValue, validationFuncs, children } = this.props;

    const rieProps = {
      value: _.get(doc, field),
      emptyValue,
      change: this.updateDoc,
      propName: field,
      className: "EditInline",
      disabled,
      validate: this.validate,
      children,
      inputType,
    }

    if (inputType=='color') return <EIColour {...rieProps} />;
    if (inputType=='textfield') return <EITextField {...rieProps} />;
		if (inputType=='textarea') return <EITextArea {...rieProps} />;
    rieProps.options = this.props.options;
    rieProps.valueKey = this.props.valueKey;
    rieProps.labelKey = this.props.labelKey;
    if (inputType=='select') return <EISelect {...rieProps} />;
  }
}


EditInline.propTypes = {
  doc: PropTypes.object.isRequired,
  field: PropTypes.string.isRequired,
  updateMethod: PropTypes.string.isRequired,
  inputType: PropTypes.string.isRequired,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
  validationFuncs: PropTypes.arrayOf(PropTypes.func),
  // For select.
  options: PropTypes.arrayOf(PropTypes.object),
  valueKey: PropTypes.string,
  labelKey: PropTypes.string,
};

EditInline.defaultProps = {
  required: false,
  disabled: false,
  validationFuncs: [],
};

EditInline.types = {
	textfield: 'textfield',
	textarea: 'textarea',
	color: 'color',
  select: 'select',
}

export default EditInline;
