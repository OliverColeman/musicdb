import React from 'react';
import PropTypes from 'prop-types';
import { ButtonToolbar, ButtonGroup, Button } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';

import Access from '../../../modules/access';
import EditInline from '../../misc/EditInline/EditInline.jsx';
import CompilerCollection from '../../../api/Compiler/Compiler';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';
import LinkOrNot from '../../misc/LinkOrNot/LinkOrNot';
import IconsAndLinks from '../IconsAndLinks/IconsAndLinks';
import PlayListList from '../PlayList/PlayListList';


class Compiler extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { loading, compiler, viewType, noLinks } = this.props;

    if (loading) return (<Loading />);
    if (!compiler) return (<NotFound />);

    const editable = !compiler.spotifyId && !compiler.mbId;

    if (viewType == 'inline') return (
      <LinkOrNot link={!noLinks} to={`/compiler/${compiler._id}`} title={compiler.name} className={"Compiler inline-viewtype name"}>
        {compiler.name}
      </LinkOrNot>
    );

    if (viewType == 'list') {
      return (
        <div className={"Compiler " + viewType + "-viewtype"}>
          <LinkOrNot link={!noLinks} to={`/compiler/${compiler._id}`} title={compiler.name} className={"Compiler inline-viewtype name"}>
            {compiler.name}
          </LinkOrNot>

          <PlayListList selector={{compilerIds: compiler._id}} viewType='inline' />

          <IconsAndLinks type='compiler' item={compiler} />
        </div>
      );
    }

    return (
      <div className={"Compiler " + viewType + "-viewtype"}>
        <div className="item-header">
          <LinkOrNot link={!noLinks && viewType != "page"} className="name" to={`/compiler/${compiler._id}`}>
            {viewType == 'page' && editable ?
              <EditInline doc={compiler} field="name" updateMethod="compiler.update" inputType={EditInline.types.textfield} />
              :
              compiler.name
            }
          </LinkOrNot>

          {viewType == 'page' && <IconsAndLinks type='compiler' item={compiler} />}
        </div>

        { viewType != "page" ? '' :
          <div>
            <h4>Playlists</h4>
            <PlayListList selector={{compilerIds: compiler._id, groupId: Meteor.groups.findOne({name: "JD"})._id}} />
          </div>
        }
      </div>
    );
  }
}


export default withTracker(({match, compiler, compilerId, viewType, noLinks}) => {
  viewType = viewType || "page";
  const id = compilerId || (compiler && compiler._id) || match && match.params.compilerId;

  const subCompiler = compiler ? null : Meteor.subscribe('Compiler', id);

  return {
    loading: subCompiler && !subCompiler.ready(),
    compiler: compiler || CompilerCollection.findOne(id),
    viewType,
    noLinks,
  };
})(Compiler);
