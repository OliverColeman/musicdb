/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import { check, Match } from 'meteor/check';

import { getCommonMusicItemFields, defaultAccessRules } from '../Music/music';
import { normaliseString, normaliseStringMatch } from '../../modules/util';
import Artist from '../Artist/Artist';

const Album = new Mongo.Collection('Album');

Album.allow({
  insert: () => false,
  update: () => false,
  remove: () => false,
});

Album.deny({
  insert: () => true,
  update: () => true,
  remove: () => true,
});

const commonFields = getCommonMusicItemFields();

Album.schema = {
  ...commonFields,
  artistIds: [String],
};
Album.schemaInstance = new SimpleSchema(Album.schema, { check });
Album.attachSchema(Album.schemaInstance);


Album.access = {
  ...defaultAccessRules,
}


/**
 * Find Albums by name and the name or id of an artist.
 * Name matching uses "normalised" matching, ignoring case, punctuation,
 * multiple and start/end white space characters.
 *
 * @param {string} name - The name of the album.
 * @param {string|Object} artist - Either an artist name or Artist document.
 * @return {Array} The matching Albums.
 */
Album.findByName = (name, artist) => {
  name = normaliseString(name);
  const artistNameGiven = typeof artist[0] == 'string';
  artist = artistNameGiven ? normaliseString(artist) : artist._id;

  // Search Album collection by name then filter on artist.
  const albums = Album.find({nameNormalised: name}).fetch();
  return albums.filter(a => {
    // Check artist.
    const albumArtists = artistNameGiven ? a.artistIds.map(aid => Artist.findOne(aid).nameNormalised) : a.artistIds;
    return !!albumArtists.find(a => a == artist);
  });
}


export default Album;
