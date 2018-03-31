import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button, Label } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';

import PlayListCollection from '../../../api/PlayList/PlayList';
import { convertSecondsToHHMMSS } from '../../../modules/util';
import PlayList from '../PlayList/PlayList';
import Compiler from '../Compiler/Compiler';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';

import './Group.scss';


class Group extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { loading, loadingLists, group, playLists, viewType } = this.props;

    if (loading) return (<Loading />);
    if (!group) return (<NotFound />);

    if (viewType == 'inline') return (
      <Link to={`/group/${group._id}`} title={group.name} className={"Group inline-viewtype name"}>
        {group.name}
      </Link>);

    const showLists = viewType == "page";
    const hasDates = playLists && playLists.find(tl => !!tl.date);

    const headers = hasDates ? ["Name", "Date", "Compiler(s)", "Length"] : ["Name", "Compiler(s)", "Length"];

    return (
      <div className={"Group " + viewType + "-viewtype"}>
        <div className="item-header">
          <Link className="name" to={`/group/${group._id}`}>{group.name}</Link>
        </div>

        { !showLists ? '' :
          <div className="playlists">
            <div className="header-row">
              { headers.map(h => (
                <div className={"header-cell header-" + h} key={h}>{h}</div>
              ))}
            </div>

            { loadingLists ? (<Loading />) : playLists.map(playList => (
              <PlayList playList={playList} viewType="list" showDate={hasDates} key={playList._id} />
            ))}
          </div>
        }
      </div>
    );
  }
}


export default withTracker(({match, group, groupId, viewType}) => {
  viewType = viewType || "page";
  const id = groupId || (group && group._id) || match && match.params.groupId;

  const sub = group ? false : Meteor.subscribe('Access.group', id);
  const subLists = viewType == 'page' && Meteor.subscribe('PlayList.withGroupId', id);

  const sortOptions = {
    number: -1,
    date: -1,
    name: 1,
  };

  return {
    loading: sub && !sub.ready(),
    loadingLists: subLists && !subLists.ready(),
    group: group || Meteor.groups.findOne(id),
    playLists: subLists && PlayListCollection.find({groupId: id}, {sort: sortOptions}).fetch(),
    viewType,
  };
})(Group);
