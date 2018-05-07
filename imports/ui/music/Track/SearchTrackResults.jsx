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
import TrackList from './TrackList';
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


export default withTracker(({ artistName, albumName, trackName, onSelect, limit, importFromServices, inPlayListsWithGroupId }) => {
  artistName = artistName ? artistName.trim() : '';
  albumName = albumName ? albumName.trim() : '';
  trackName = trackName ? trackName.trim() : '';
  importFromServices = !!importFromServices;

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
  const subscription = (!trackName && !artistName) ? null : Meteor.subscribe('search.track', {artistName, albumName, trackName, limit: searchLimit, importFromServices, inPlayListsWithGroupId});

  let additionalSelectors = {};
  let artistIds = artistName ? findBySoundexOrDoubleMetaphone(ArtistCollection, soundex(artistName), doubleMetaphone(artistName)).map(a => a._id) : null;
  let albumIds = albumName ? findBySoundexOrDoubleMetaphone(AlbumCollection, soundex(albumName), doubleMetaphone(albumName)).map(a => a._id) : null;
  if (artistIds && artistIds.length) additionalSelectors.artistIds = {$in: artistIds};
  if (albumIds && albumIds.length) additionalSelectors.albumId = {$in: albumIds};
  if (inPlayListsWithGroupId) {
    additionalSelectors.appearsInPlayListGroups = inPlayListsWithGroupId;
  }

  let tracks = [];
  if (subscription) {
    if (trackName) tracks = findBySoundexOrDoubleMetaphone(TrackCollection, soundex(trackName), doubleMetaphone(trackName), additionalSelectors, searchLimit).fetch();
    else if (artistName) tracks = TrackCollection.find(additionalSelectors, {searchLimit}).fetch();
  }

  return {
    loading: subscription && !subscription.ready(),
    artistName, albumName, trackName, limit,
    tracks,
    onSelect,
  };
})(SearchTrackResults);
