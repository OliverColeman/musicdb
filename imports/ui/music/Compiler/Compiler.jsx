import React from 'react';
import PropTypes from 'prop-types';
import { ButtonToolbar, ButtonGroup, Button } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';

import CompilerCollection from '../../../api/Compiler/Compiler';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';
import LinkOrNot from '../../misc/LinkOrNot/LinkOrNot';
import ServiceLinks from '../ServiceLinks/ServiceLinks';
import PlayListList from '../PlayListList/PlayListList';


class Compiler extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { loading, loadingLists, compiler, viewType, noLinks } = this.props;

    if (loading) return (<Loading />);
    if (!compiler) return (<NotFound />);

    if (viewType == 'inline') return (
      <LinkOrNot link={!noLinks} to={`/compiler/${compiler._id}`} title={compiler.name} className={"Compiler inline-viewtype name"}>
        {compiler.name}
      </LinkOrNot>
    );

    return (
      <div className={"Compiler " + viewType + "-viewtype"}>
        <div className="item-header">
          <LinkOrNot link={!noLinks} className="name" to={`/compiler/${compiler._id}`}>{compiler.name}</LinkOrNot>

          {viewType == 'page' && <ServiceLinks type='compiler' item={compiler} />}
        </div>

        { viewType != "page" ? '' :
          <div>
            <h4>Playlists</h4>
            <PlayListList loadingLists={loadingLists} selector={{compilerIds: compiler._id}} />
          </div>
        }
      </div>
    );
  }
}


export default withTracker(({match, compiler, compilerId, viewType, noLinks}) => {
  viewType = viewType || "page";
  const id = compilerId || (compiler && compiler._id) || match && match.params.compilerId;

  const subCompiler = compiler ? null : Meteor.subscribe('Compiler.withId', id);
  const subLists = viewType == 'page' && Meteor.subscribe('PlayList.withCompilerId', id);

  return {
    loading: subCompiler && !subCompiler.ready(),
    loadingLists: subLists && !subLists.ready(),
    compiler: compiler || CompilerCollection.findOne(id),
    viewType,
    noLinks,
  };
})(Compiler);
