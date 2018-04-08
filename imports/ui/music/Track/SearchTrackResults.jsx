import React from 'react';
import PropTypes from 'prop-types';
import autoBind from 'react-autobind';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button, FormControl, FormGroup } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';
import _ from 'lodash';

import { soundex, doubleMetaphone, findBySoundexOrDoubleMetaphone, levenshteinScore } from '../../../modules/util';
import TrackCollection from '../../../api/Track/Track';
import ArtistCollection from '../../../api/Artist/Artist';
import AlbumCollection from '../../../api/Album/Album';
import Track from './Track';
import Album from '../Album/Album';
import Artist from '../Artist/Artist';
import Loading from '../../misc/Loading/Loading';

import './Track.scss';


class SearchTrackResults extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);
  }


  render() {
    const { loading, artistName, albumName, trackName, tracks, limit, onSelect } = this.props;

    if (loading) return (<div className="SearchTrackResults"><Loading /></div>);

    const tracksScored = tracks.map(t => {
      let scores = [levenshteinScore(trackName, t.name)];
      if (albumName && t.albumId) scores.push(levenshteinScore(albumName, AlbumCollection.findOne({_id: t.albumId}).name));
      // Use best scoring artist for the track.
      if (artistName) scores.push(Math.min(ArtistCollection.find({_id: {$in: t.artistIds}}).map(a => levenshteinScore(artistName, a.name))));
      return { ...t, score: _.mean(scores)};
    });
    const tracksSorted = _.sortBy(tracksScored, ['score']).slice(0, Math.min(tracksScored.length, limit));

    return (
      <div className="SearchTrackResults">
        { (trackName && tracks.length == 0) ?
          <div className="no-results">No tracks found.</div>
          :
          <div className="track-list">
            { tracksSorted.map(trk => (
              <Track track={trk} viewType="list" noImage={true} noLinks={true} showIconsAndLinks={true} key={trk._id} onClick={() => onSelect(trk)} />
            ))}
          </div>
        }
      </div>
    );
  }
}


export default withTracker(({ artistName, albumName, trackName, onSelect, limit }) => {
  artistName = artistName ? artistName.trim() : '';
  albumName = albumName ? albumName.trim() : '';
  trackName = trackName ? trackName.trim() : '';
  // We can't use Levenshtein score to order the search server-side, so collect more
  // than we'll show and the sort by Levenshtein and then truncate to desired limit.
  const searchLimit = 100;
  const subscription = !trackName ? null : Meteor.subscribe('search.track', artistName, albumName, trackName, searchLimit);

  return {
    loading: subscription && !subscription.ready(),
    artistName, albumName, trackName, limit,
    tracks: subscription ? findBySoundexOrDoubleMetaphone(TrackCollection, soundex(trackName), doubleMetaphone(trackName), null, searchLimit).fetch() : [],
    onSelect,
  };
})(SearchTrackResults);
