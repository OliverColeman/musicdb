import React from 'react';
import PropTypes from 'prop-types';
import autoBind from 'react-autobind';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button, Label } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';

import Access from '../../../modules/access';
import CompilerCollection from '../../../api/Compiler/Compiler';
import Compiler from '../Compiler/Compiler';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';

import './Compiler.scss';


class CompilerList extends React.Component {
  constructor(props) {
    super(props);

    autoBind(this);
  }


  handleNew() {
    Meteor.call('Compiler.new', (error, compiler) => {
      if (error) {
        Bert.alert(error.reason ? error.reason : error.message, 'danger');
      }
    });
  }


  render() {
    const { loadingCompilers, compilers, viewType, noLinks } = this.props;

    if (loadingCompilers) return ( <Loading /> );

    const createNewAccess = Access.allowed({accessRules: CompilerCollection.access, op: 'create'});

    if (viewType == 'inline') {
      return (
        <div className={"CompilerList inline-viewtype inline-list"}>
          { compilers.map(compiler => (
            <Compiler compiler={compiler} viewType="inline" noLinks={noLinks} key={compiler._id} />
          ))}
        </div>
      );
    }

    return (
      <div className={"CompilerList"}>
        { viewType == 'page' && <div className="compilers-header">
          <h4>Compilers</h4>
          { createNewAccess && <Button className='btn btn-success new-compiler' onClick={this.handleNew}>New Compiler</Button> }
        </div> }

        <div className="compilers">
          <div className="header-row">
            { ["Name", "Playlists", "Icons"].map(h => (
              <div className={"header-cell header-" + h} key={h}>{h}</div>
            ))}
          </div>

          { compilers.map(compiler => (
            <Compiler compiler={compiler} viewType="list" key={compiler._id} />
          ))}
        </div>
      </div>
    );
  }
}


export default withTracker(({items, selector, viewType, noLinks}) => {
  viewType = viewType || 'page';

  const sortOptions = {
    name: 1,
  };

  // Show all compilers if none specified.
  if (!items && !selector) selector = {};

  // Currently we subscribe to all compilers in App.jsx
  const sub = false; //!items ? Meteor.subscribe('Compiler', selector) : null;

  return {
    loadingCompilers: sub && !sub.ready(),
    compilers: items || CompilerCollection.find(selector, {sort: { name: 1 }}).fetch(),
    viewType,
    noLinks,
  };
})(CompilerList);
