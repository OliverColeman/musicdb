import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import classNames from 'classnames';


class EIBase extends React.Component {
  constructor(props) {
    super(props);

    if (!this.props.propName) throw "RTFM: missing 'propName' prop";
    if (!this.props.change) throw "RTFM: missing 'change' prop";

    this.state = {
      editing: false,
      loading: false,
      invalid: false,
    };
  }


  componentDidUpdate = (prevProps, prevState) => {
    var inputElem = ReactDOM.findDOMNode(this.refs.input);
    if (this.state.editing && !prevState.editing) {
      inputElem.focus();
      this.selectInputText(inputElem);
    } else if (this.state.editing && prevProps.text != this.props.text) {
      this.finishEditing();
    }
  };

  startEditing = (event) => {
    if (event && event.stopPropagation) event.stopPropagation();
    this.props.beforeStart && this.props.beforeStart();
    if (this.props.disabled) return;
    this.setState({editing: true});
    this.props.afterStart ? this.props.afterStart() : null;
  };

  finishEditing = () => {
    let newValue = ReactDOM.findDOMNode(this.refs.input).value;
    if (!this.props.value && !newValue || this.props.value == newValue) {
      this.props.beforeFinish ? this.props.beforeFinish(newValue) : null;
      this.cancelEditing();
    }
    else {
      const isValid = this.doValidations(newValue);
      if (isValid) {
        this.commit(newValue);
      }
      else if (this.props.handleValidationFail) {
        this.props.handleValidationFail(newValue, () => this.cancelEditing());
      }
      this.props.afterFinish ? this.props.afterFinish(isValid, newValue) : null;
    }
  };

  cancelEditing = () => {
    this.setState({editing: false, invalid: false, validationMessage: null});
  };

  keyDown = (event) => {
    if(event.keyCode === 13) { this.finishEditing() }           // Enter
    else if (event.keyCode === 27) { this.cancelEditing() }     // Escape
  };

  textChanged = (event) => {
    this.doValidations(event.target.value.trim());
  };

  doValidations = (value) => {
    let validationResult;
    if (this.props.validate) {
      validationResult = this.props.validate(value);
    }
    else if (this.validate) {
      validationResult = this.validate(value);
    }
    isValid = typeof validationResult == 'string' ? validationResult.length == 0 : !!validationResult;
    this.setState({
      invalid: !isValid,
      validationMessage: typeof validationResult == 'string' ? validationResult : null,
    });
    return isValid;
  }

  selectInputText = (element) => {
    if (element.setSelectionRange) element.setSelectionRange(0, element.value.length);
  }

  componentWillReceiveProps = (nextProps) => {
    if ('value' in nextProps && !(nextProps.shouldRemainWhileInvalid && this.state.invalid)) {
      this.setState({loading: false, editing: false, invalid: false, newValue: null});
    }
  }

  commit = (value) => {
    if (!this.state.invalid) {
      let newProp = {};
      newProp[this.props.propName] = value;
      this.setState({loading: true, newValue: value});
      this.props.change(newProp);
    }
  };

  makeClassString = () => {
    var classNames = [];
    if (this.props.className) classNames.push(this.props.className);
    if (this.state.editing && this.props.classEditing) classNames.push(this.props.classEditing);
    if (this.state.loading && this.props.classLoading) classNames.push(this.props.classLoading);
    if (this.props.disabled && this.props.classDisabled) classNames.push(this.props.classDisabled);
    if (this.state.invalid && this.props.classInvalid) classNames.push(this.props.classInvalid);
    return classNames.join(' ');
  };


  render = () => {
    const { editing, validationMessage } = this.state;

    const classes = classNames(
      this.props.className,
      this.props.inputType,
      this.state.editing && (this.props.classEditing || "editing"),
      this.state.loading && (this.props.classLoading || "loading"),
      this.props.disabled && (this.props.classDisabled || "disabled"),
      this.state.invalid && (this.props.classInvalid || "invalid")
    );

    if (editing) {
      return (
        <span className={classes} onClick={ e => e.stopPropagation() }>
          { this.renderEditingComponent() }
          { validationMessage && <div className="validation-message">{validationMessage}</div> }
        </span>
      )
    }
    else {
      return (
        <span className={classes}>
          { this.props.children || this.renderNormalComponent() }
          { !this.props.disabled && <span className='edit-icon' onClick={ e => this.startEditing(e) }  tabIndex="0">🖉</span> }
        </span>
      );
    }
  };
}

EIBase.propTypes = {
  value: PropTypes.any,
  change: PropTypes.func.isRequired,
  propName: PropTypes.string.isRequired,
  editProps: PropTypes.object,
  defaultProps: PropTypes.object,
  disabled: PropTypes.bool,
  validate: PropTypes.func,
  handleValidationFail: PropTypes.func,
  shouldBlockWhileLoading: PropTypes.bool,
  shouldRemainWhileInvalid: PropTypes.bool,
  classLoading: PropTypes.string,
  classEditing: PropTypes.string,
  classDisabled: PropTypes.string,
  classInvalid: PropTypes.string,
  className: PropTypes.string,
  beforeStart: PropTypes.func,
  afterStart: PropTypes.func,
  beforeFinish: PropTypes.func,
  afterFinish: PropTypes.func,
};

export default EIBase;
