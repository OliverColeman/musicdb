import React from 'react';
import PropTypes from 'prop-types';
import { Meteor } from 'meteor/meteor';
import { createContainer } from 'meteor/react-meteor-data';
import { ReactiveVar } from 'meteor/reactive-var';
import { Bert } from 'meteor/themeteorchef:bert';
import _ from 'lodash';

import EITextField from './EITextField.jsx';
import EITextArea from './EITextArea.jsx';
import EIColour from './EIColour'

import './EditInline.scss';


class EditInline extends React.Component {
  constructor (props) {
    super(props);

    this.state = {};
    this.state[props.field] = _.get(props.doc, props.field);
  }

  isStringAcceptable = (string) => !this.props.required || string.length >= 1

  updateDoc = (newState) => {
  	const { updateMethod, doc, field } = this.props;

  	_.set(doc, field, newState[field].trim());

    Meteor.call(updateMethod, doc, (error, result) => {
      if (error) {
      	Bert.alert(error.reason, 'danger');
      }
    });
  }

  render = () => {
  	const { doc, field, inputType, required, disabled } = this.props;

    const rieProps = {
      value: _.get(doc, field),
      change: this.updateDoc,
      propName: field,
      className: this.state.highlight ? "riek editable" : "riek",
      classLoading: "loading",
      classInvalid: "invalid",
      disabled: disabled,
    }

    if (inputType=='color') return <EIColour {...rieProps} />;

    rieProps.validate=this.isStringAcceptable;

    if (inputType=='textfield') return <EITextField {...rieProps} />;
		if (inputType=='textarea') return <EITextArea {...rieProps} />;
  }
}


EditInline.propTypes = {
  doc: PropTypes.object.isRequired,
  field: PropTypes.string.isRequired,
  updateMethod: PropTypes.string.isRequired,
  inputType: PropTypes.string.isRequired,
  required: PropTypes.bool,
  disabled: PropTypes.bool,
};

EditInline.defaultProps = {
  required: true,
  disabled: false,
};

EditInline.types = {
	textfield: 'textfield',
	textarea: 'textarea',
	color: 'color',
}

export default EditInline;
