import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';

import { convertSecondsToHHMMSS } from '../../../modules/util';
import TrackCollection from '../../../api/Track/Track';
import PlayList from '../PlayList/PlayList';
import PlayListCollection from '../../../api/PlayList/PlayList';
import Album from '../Album/Album';
import Artist from '../Artist/Artist';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';

import './Track.scss';


class Track extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { loading, loadingPlayLists, playLists, track, viewType } = this.props;

    if (loading) return (<Loading />);
    if (!track) return (<NotFound />);

    if (viewType == 'inline') return (
      <Link to={`/track/${track._id}`} title={track.name} className={"Track inline-viewtype name"}>
        {track.name}
      </Link>);

    if (viewType == 'list') return (
      <div className={"Track " + viewType + "-viewtype"}>
        <div className="album album-image image">
          { !track.albumId ? '' : <Album albumId={track.albumId} viewType="track" viewType="image-small" /> }
        </div>

        <Link to={`/track/${track._id}`} title={track.name} className={"Track inline-viewtype name"}>
          {track.name}
        </Link>

        <div className="artists inline-list">
          { track.artistIds.map(artistId => (<Artist artistId={artistId} key={artistId} viewType="inline" />)) }
        </div>

        { !track.albumId ?
          <div>[unknown]</div>[unknown] :
          <Album albumId={track.albumId} viewType="track" viewType="inline" />
        }

        <div className="duration" title="Duration">{convertSecondsToHHMMSS(track.duration, true)}</div>
      </div>
    );

    // viewType == 'page'
    return (
      <div className={"Track " + viewType + "-viewtype"}>
        <div className="item-header">
          <Link className="name" to={`/track/${track._id}`}>{track.name}</Link>
        </div>

        <div className="album album-image image">
          { !track.albumId ? '' : <Album albumId={track.albumId} viewType="track" viewType="image-medium" /> }
        </div>

        <div className="artists inline-list">
          { track.artistIds.map(artistId => (<Artist artistId={artistId} key={artistId} viewType="inline" />)) }
        </div>

        <Album albumId={track.albumId} viewType="inline" />

        <div className="duration" title="Duration">{convertSecondsToHHMMSS(track.duration, true)}</div>

        <div className="playLists">
          <div className="header-row">
            { ["Name", "Date", "Compiler", "Length"].map(h => (
              <div className={"header-cell header-" + h} key={h}>{h}</div>
            ))}
          </div>

          { loadingPlayLists ? (<Loading />) : playLists.map(playlist => (
            <PlayList playList={playlist} viewType="list" key={playlist._id} showDate={true} />
          ))}
        </div>
      </div>
    );
  }
}


export default withTracker(({ match, trackId, track, viewType }) => {
  trackId = trackId || track && track._id || match.params.trackId

  viewType = viewType || "page";
  const subscription = track ? null : Meteor.subscribe('Track.withId', trackId);

    const subPlayLists = viewType == 'page' && Meteor.subscribe('Track.playLists', trackId);

  return {
    loading: subscription && !subscription.ready(),
    track: track || TrackCollection.findOne(trackId),
    loadingPlayLists: subPlayLists && !subPlayLists.ready(),
    playLists: subPlayLists && PlayListCollection.find({ trackIds: trackId}).fetch(),
    viewType,
  };
})(Track);
