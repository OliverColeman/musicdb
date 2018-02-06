import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button, Label } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';

import TrackListListCollection from '../../../api/TrackListList/TrackListList';
import TrackListCollection from '../../../api/TrackList/TrackList';
import { convertSecondsToHHMMSS } from '../../../modules/util';
import TrackList from '../TrackList/TrackList';
import Compiler from '../Compiler/Compiler';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';

import './TrackListList.scss';


class TrackListList extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { loading, loadingLists, trackListList, trackLists, viewContext } = this.props;

    if (loading) return (<Loading />);
    if (!trackListList) return (<NotFound />);

    if (viewContext == 'inline') return (
      <Link to={`/listlist/${trackListList._id}`} title={trackListList.name} className={"TrackListList inline-context name"}>
        {trackListList.name}
      </Link>);

    const showLists = viewContext == "page";
    const hasDates = trackLists && trackLists.find(tl => !!tl.date);

    const headers = hasDates ? ["Name", "Date", "Compiler(s)", "Length"] : ["Name", "Compiler(s)", "Length"];

    return (
      <div className={"TrackListList " + viewContext + "-context"}>
        <div className="item-header">
          <Link className="name" to={`/listlist/${trackListList._id}`}>{trackListList.name}</Link>
        </div>

        { !showLists ? '' :
          <div className="tracklists">
            <div className="header-row">
              { headers.map(h => (
                <div className={"header-cell header-" + h} key={h}>{h}</div>
              ))}
            </div>

            { loadingLists ? (<Loading />) : trackLists.map(trackList => (
              <TrackList trackList={trackList} viewContext="list" showDate={hasDates} key={trackList._id} />
            ))}
          </div>
        }
      </div>
    );
  }
}


export default withTracker(({match, trackListList, trackListListId, viewContext}) => {
  viewContext = viewContext || "page";
  const id = trackListListId || (trackListList && trackListList._id) || match.params.trackListListId;

  const sub = trackListList ? null : Meteor.subscribe('TrackListList.withId', id);
  const subLists = viewContext == 'page' && Meteor.subscribe('TrackList.withTrackListListId', id);

  const sortOptions = {
    number: -1,
    date: -1,
    name: 1,
  };

  return {
    loading: sub && !sub.ready(),
    loadingLists: subLists && !subLists.ready(),
    trackListList: trackListList || TrackListListCollection.findOne(id),
    trackLists: subLists && TrackListCollection.find({trackListListId: id}, {sort: sortOptions}).fetch(),
    viewContext,
  };
})(TrackListList);
