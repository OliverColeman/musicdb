import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button, Label } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';
import moment from 'moment';

import TrackListCollection from '../../../api/TrackList/TrackList';
import TrackCollection from '../../../api/Track/Track';
import { convertSecondsToHHMMSS } from '../../../modules/util';
import Track from '../Track/Track';
import Compiler from '../Compiler/Compiler';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';

import './TrackList.scss';


class TrackList extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { loading, loadingTracks, trackList, viewContext, showDate } = this.props;

    if (loading) return (<Loading />);
    if (!trackList) return (<NotFound />);

    if (viewContext == 'inline') return (
      <Link to={`/list/${trackList._id}`} title={trackList.name} className={"TrackList inline-context name"}>
        {trackList.name}
      </Link>);

    const showTracks = viewContext == "page";
    // Get Tracks in order (when/if available and applicable).
    const tracks = !loadingTracks && showTracks && trackList.trackIds.map(trackId => TrackCollection.findOne(trackId)).filter(t => t);

    return (
      <div className={"TrackList " + viewContext + "-context"}>
        <div className="item-header">
          <Link className="name" to={`/list/${trackList._id}`}>{trackList.name}</Link>

          {viewContext != 'page' || !trackList.spotifyUserId || !trackList.spotifyListId ? '' :
            <a className="link spotify" title="Show in Spotify" target="_blank" href={`https://open.spotify.com/user/${trackList.spotifyUserId}/playlist/${trackList.spotifyListId}`} />
          }
        </div>

        { showDate ? <div className="date">{moment.unix(trackList.date).format('YYYY-MM-DD')}</div> : '' }

        <div className="compilers inline-list">
          { viewContext == 'page' ? <Label>Created by:</Label> : '' }
          { trackList.compilerIds.map(compilerId => (<Compiler compilerId={compilerId} viewContext="inline" key={compilerId} />)) }
        </div>

        <div className="duration">
          { viewContext == 'page' ? <Label>Duration:</Label> : '' }
          {convertSecondsToHHMMSS(trackList.duration)}, {trackList.trackIds.length} tracks
        </div>

        { !showTracks ? '' :
          <div className="tracks">
            <div className="header-row">
              { ["Title", "Artist", "Album", "Length"].map(h => (
                <div className={"header-cell header-" + h} key={h}>{h}</div>
              ))}
            </div>

            { loadingTracks ? (<Loading />) : tracks.map(track => (
              <Track track={track} viewContext="list" key={track._id} />
            ))}
          </div>
        }
      </div>
    );
  }
}


export default withTracker(({match, trackList, trackListId, viewContext, showDate}) => {
  viewContext = viewContext || "page";
  const subList = trackList ? null : Meteor.subscribe('TrackList.withId', trackListId || match.params.trackListId);
  const subTracks = viewContext == 'page' && Meteor.subscribe('TrackList.tracks', trackListId || (trackList && trackList._id) || match.params.trackListId);

  return {
    loading: subList && !subList.ready(),
    loadingTracks: subTracks && !subTracks.ready(),
    trackList: trackList || TrackListCollection.findOne(trackListId || match.params.trackListId),
    viewContext,
    showDate,
  };
})(TrackList);
