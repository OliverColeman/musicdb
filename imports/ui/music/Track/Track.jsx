import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';

import { convertSecondsToHHMMSS } from '../../../modules/util';
import TrackCollection from '../../../api/Track/Track';
import TrackList from '../TrackList/TrackList';
import TrackListCollection from '../../../api/TrackList/TrackList';
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
    const { loading, loadingTrackLists, trackLists, track, viewContext } = this.props;

    if (loading) return (<Loading />);
    if (!track) return (<NotFound />);

    if (viewContext == 'inline') return (
      <Link to={`/track/${track._id}`} title={track.name} className={"Track inline-context name"}>
        {track.name}
      </Link>);

    return (
      <div className={"Track " + viewContext + "-context"}>
        {viewContext == "page" ?
          <div className="album album-image image">
            <Album albumId={track.albumId} viewContext="track" viewContext="image-medium" />
          </div>
          :
          <div className="album album-image image">
            <Album albumId={track.albumId} viewContext="track" viewContext="image-small" />
          </div>
        }

        { viewContext == 'list' ?
          <Link to={`/track/${track._id}`} title={track.name} className={"Track inline-context name"}>
            {track.name}
          </Link>
          :
          <div className="item-header">
            <Link className="name" to={`/track/${track._id}`}>{track.name}</Link>

            {viewContext != 'page' || !track.spotifyId ? '' :
              <a className="link spotify" title="Show in Spotify" target="_blank" href={"https://open.spotify.com/track/" + track.spotifyId} />
            }
          </div>
        }

        <div className="artists inline-list">
          { track.artistIds.map(artistId => (<Artist artistId={artistId} key={artistId} viewContext="inline" />)) }
        </div>

        <Album albumId={track.albumId} viewContext="track" viewContext="inline" />

        <div className="duration" title="Duration">{convertSecondsToHHMMSS(track.duration, true)}</div>

      { viewContext != "page" ? "" :
        <div className="trackLists">
          <div className="header-row">
            { ["Name", "Date", "Compiler", "Length"].map(h => (
              <div className={"header-cell header-" + h} key={h}>{h}</div>
            ))}
          </div>

          { loadingTrackLists ? (<Loading />) : trackLists.map(tracklist => (
            <TrackList trackList={tracklist} viewContext="list" key={tracklist._id} />
          ))}
        </div>
      }

      </div>
    );
  }
}


export default withTracker(({ match, trackId, track, viewContext }) => {
  trackId = trackId || track && track._id || match.params.trackId

  viewContext = viewContext || "page";
  const subscription = track ? null : Meteor.subscribe('Track.withId', trackId);

    const subTrackLists = viewContext == 'page' && Meteor.subscribe('Track.trackLists', trackId);

  return {
    loading: subscription && !subscription.ready(),
    track: track || TrackCollection.findOne(trackId),
    loadingTrackLists: subTrackLists && !subTrackLists.ready(),
    trackLists: subTrackLists && TrackListCollection.find({ trackIds: trackId}).fetch(),
    viewContext,
  };
})(Track);
