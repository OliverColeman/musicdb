import React from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import classNames from 'classnames';


class EIBase extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      editing: false,
      loading: false,
      invalid: false,
      newValue: this.props.value,
    };
  }


  startEditing = (event) => {
    if (event && event.stopPropagation) event.stopPropagation();
    this.props.beforeStart && this.props.beforeStart();
    if (this.props.disabled) return;
    this.setState({editing: true});
    this.props.afterStart ? this.props.afterStart() : null;
  };

  finishEditing = () => {
    let newValue = this.state.newValue;
    if (!this.props.value && !newValue || this.props.value == newValue) {
      this.props.beforeFinish ? this.props.beforeFinish(newValue) : null;
      this.cancelEditing();
    }
    else {
      const isValid = this.doValidations(newValue);
      if (isValid) {
        this.commit();
      }
      else if (this.props.handleValidationFail) {
        this.props.handleValidationFail(newValue, () => this.cancelEditing());
      }
      this.props.afterFinish ? this.props.afterFinish(isValid, newValue) : null;
    }
  };

  cancelEditing = () => {
    this.setState({editing: false, invalid: false, validationMessage: null, newValue: this.props.value});
  };

  valueChanged = (value) => {
    this.setState({newValue: value});
    this.doValidations(value);
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

  componentWillReceiveProps = (nextProps) => {
    if ('value' in nextProps && !(nextProps.shouldRemainWhileInvalid && this.state.invalid)) {
      this.setState({loading: false, editing: false, invalid: false, newValue: this.props.value});
    }
  }

  commit = () => {
    if (!this.state.invalid) {
      this.setState({loading: true});
      this.props.change(this.state.newValue);
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
    const { loading, editing, invalid, validationMessage } = this.state;
    const { disabled, className, inputType, classEditing, classLoading, classDisabled, classInvalid, children } = this.props;

    const buttonsBelow = inputType == 'textarea';

    const classes = classNames(
      "editinline-inner",
      buttonsBelow && "buttonsbelow",
      inputType,
      editing && (classEditing || "editing"),
      loading && (classLoading || "loading"),
      disabled && (classDisabled || "disabled"),
      invalid && (classInvalid || "invalid")
    );

    const buttonCommit = <button className="btn btn-success fa fa-check" title="Commit changes."
        onClick={this.finishEditing}  tabIndex="1"/>;
    const buttonCancel = <button className="btn btn-danger fa fa-times" title="Abandon changes."
        onClick={this.cancelEditing} tabIndex="2" />;

    if (editing) {
      return (
        <div className={className}>
          <div className={classes} onClick={ e => e.stopPropagation() }>
            <div className="input-wrap">
              { this.renderEditingComponent() }
              { !buttonsBelow && !invalid && buttonCommit }
              { !buttonsBelow && buttonCancel }
            </div>
            { (!!validationMessage || buttonsBelow) && <div className="validation-wrap">
              <div className="validation-message">{validationMessage}</div>
              { buttonsBelow && !invalid && buttonCommit }
              { buttonsBelow && buttonCancel }
            </div> }
          </div>
        </div>
      )
    }
    else {
      return (
        <span className={classes}>
          { children || this.renderNormalComponent() }
          { !disabled && <span className='edit-icon' onClick={this.startEditing} tabIndex="0">🖉</span> }
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
  // For select.
  options: PropTypes.arrayOf(PropTypes.object),
  valueKey: PropTypes.string,
  labelKey: PropTypes.string,
};

export default EIBase;
