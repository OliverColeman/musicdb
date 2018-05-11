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
import { trackSearch } from '../../../api/Music/search';
import TrackCollection from '../../../api/Track/Track';
import ArtistCollection from '../../../api/Artist/Artist';
import AlbumCollection from '../../../api/Album/Album';
import TrackList from '../Track/TrackList';
import Loading from '../../misc/Loading/Loading';

import './Search.scss';


class SearchTrackResults extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);
  }


  render() {
    const { loading, mixedNames, artistName, albumName, trackName, tracks, limit, onSelect } = this.props;

    if (loading) return (<div className="SearchTrackResults"><Loading /></div>);

    let tracksScored;
    if (mixedNames) {
      tracksScored = tracks.map(t => {
        // Get Levenshtein scores for track name alone, artist names alone, and
        // track name followed and preceded by each artist, then use the lowest score.
        let scores = [levenshteinScore(mixedNames, t.name)];
        const artistNames = ArtistCollection.find({_id: {$in: t.artistIds}}).map(a => a.name);
        for (let artist of artistNames) {
          scores.push(levenshteinScore(mixedNames, artist));
          scores.push(levenshteinScore(mixedNames, t.name + " " + artist));
          scores.push(levenshteinScore(mixedNames,  artist + " " + t.name));
        }
        return { ...t, score: _.min(scores)};
      });
    }
    else {
      tracksScored = tracks.map(t => {
        let scores = [levenshteinScore(trackName, t.name)];
        if (albumName && t.albumId) scores.push(levenshteinScore(albumName, AlbumCollection.findOne({_id: t.albumId}).name));
        // Use best scoring artist for the track.
        if (artistName) scores.push(Math.min(ArtistCollection.find({_id: {$in: t.artistIds}}).map(a => levenshteinScore(artistName, a.name))));
        return { ...t, score: _.mean(scores)};
      });
    }

    const tracksSorted = _.sortBy(tracksScored, ['score']).slice(0, Math.min(tracksScored.length, limit));

    return (
      <div className="SearchTrackResults">
        { ((trackName || artistName || mixedNames) && tracks.length == 0) ?
          <div className="no-results">Nada.</div>
          :
          <div className="tracks-wrapper">
            <TrackList
              items={tracksSorted}
              noLinks={!!onSelect}
              noMenu={true}
              compactView={true}
              onClick={onSelect}
            />
          </div>
        }
      </div>
    );
  }
}


export default withTracker(({ mixedNames, artistName, albumName, trackName, onSelect, limit, importFromServices, inPlayListsWithGroupId }) => {
  mixedNames = mixedNames ? mixedNames.trim() : '';
  artistName = artistName ? artistName.trim() : '';
  albumName = albumName ? albumName.trim() : '';
  trackName = trackName ? trackName.trim() : '';

  if (typeof inPlayListsWithGroupId == 'undefined') {
  	// TODO get group from logged in user or something.
  	const group = Meteor.groups.findOne({name: "JD"});
    inPlayListsWithGroupId = group._id;
  }
  else {
    // publication function only accepts strings or null, but allow passing truthy values to this component.
    inPlayListsWithGroupId = inPlayListsWithGroupId ? inPlayListsWithGroupId : undefined;
  }

  // We can't use Levenshtein score to order the search server-side, so collect more
  // than we'll show and then sort by Levenshtein and then truncate to desired limit.
  const searchLimit = 100;
  importFromServices = !!importFromServices;

  let subscription, tracks;
  if (mixedNames) {
    subscription = Meteor.subscribe('search.track', {mixedNames, limit: searchLimit, importFromServices, inPlayListsWithGroupId});
    tracks = trackSearch({mixedNames, limit: searchLimit, inPlayListsWithGroupId});
  }
  else if (trackName || artistName) {
    subscription = Meteor.subscribe('search.track', {artistName, albumName, trackName, limit: searchLimit, importFromServices, inPlayListsWithGroupId});
    tracks = trackSearch({artistName, albumName, trackName, limit: searchLimit, inPlayListsWithGroupId});
  }
  tracks = tracks ? tracks.fetch() : [];

  return {
    loading: subscription && !subscription.ready(),
    mixedNames, artistName, albumName, trackName,
    limit,
    tracks,
    onSelect,
  };
})(SearchTrackResults);
