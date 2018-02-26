/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import { commonMusicItemFields } from '../Utility/music';
import { normaliseString, normaliseStringMatch } from '../../modules/util';

const Track = new Mongo.Collection('Track');

Track.allow({
  insert: () => false,
  update: () => false,
  remove: () => false,
});

Track.deny({
  insert: () => true,
  update: () => true,
  remove: () => true,
});

Track.schema = {
  ...commonMusicItemFields,
  artistIds: [String],
  albumId: {
    type: String,
    optional: true,
  },
  duration: {
    type: Number,
    optional: true,
  },
  features: {
    type: Object,
    optional: true,
  },
}

Track.attachSchema(new SimpleSchema(Track.schema));


/**
 * Find Tracks by name and the names or Ids of the artists and album.
 * Name matching uses "normalised" matching, ignoring case, punctuation,
 * multiple and start/end white space characters.
 *
 * @param {string} name - The name of the track.
 * @param {Array} artists - Either artist names or Artist documents.
 * @param {string|Object} album - Either an album name or an Album document.
 * @return {Array} The matching Tracks.
 */
Track.findByName = (name, artists, album) => {
  name = normaliseString(name);
  const artistNamesGiven = typeof artists[0] == 'string';
  artists = artists.map(a => artistNamesGiven ? normaliseString(a) : a._id).sort();
  const albumNameGiven = typeof album == 'string';
  album = albumNameGiven ? normaliseString(album) : album._id;

  // Search Track collection by track name then filter for album and artists.
  const tracks = Track.find({nameNormalised: name}).fetch();
  return tracks.filter(t => {
    // Check album.
    if (albumNameGiven && Album.findOne(t.albumId).nameNormalised != album) return false;
    if (!albumNameGiven && t.albumId != album) return false;

    // Check artists.
    const trackArtists = artistNamesGiven ? t.artistIds.map(aid => Artist.findOne(aid).nameNormalised) : t.artistIds;
    return _.isEqual(trackArtists.sort(), artists);
  });
}


export default Track;
