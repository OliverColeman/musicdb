/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import { getCommonMusicItemFields } from '../Music/music';
import { normaliseString, normaliseStringMatch } from '../../modules/util';
import Album from '../Album/Album';
import Artist from '../Artist/Artist';

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

const commonFields = getCommonMusicItemFields();

Track.schema = {
  ...commonFields,
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
 * Find Tracks by name and the name or id of an artist and the album.
 * Name matching uses "normalised" matching, ignoring case, punctuation,
 * multiple and start/end white space characters.
 *
 * @param {string} name - The name of the track.
 * @param {string|Object} artist - Either an artist name or Artist document.
 * @param {string|Object} album - Either an album name or an Album document. Optional.
 * @return {Array} The matching Tracks.
 */
Track.findByName = (name, artist, album) => {
  name = normaliseString(name);
  const artistNameGiven = typeof artist == 'string';
  artist = artistNameGiven ? normaliseString(artist) : artist._id;
  const albumNameGiven = album && typeof album == 'string';
  if (album) album = albumNameGiven ? normaliseString(album) : album._id;

  // Search Track collection by track name then filter for album and artists.
  const tracks = Track.find({nameNormalised: name}).fetch();
  return tracks.filter(t => {
    // Check album if given.
    if (album) {
      if (!t.albumId) return false;
      if (albumNameGiven && Album.findOne(t.albumId).nameNormalised != album) return false;
      if (!albumNameGiven && t.albumId != album) return false;
    }

    // Check artist.
    const trackArtists = artistNameGiven ? t.artistIds.map(aid => Artist.findOne(aid).nameNormalised) : t.artistIds;
    return !!trackArtists.find(ta => ta == artist);
  });
}


export default Track;
