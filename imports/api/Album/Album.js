/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import { commonMusicItemFields } from '../Utility/music';
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

Album.schema = {
  ...commonMusicItemFields,
  artistIds: [String],
};
Album.attachSchema(new SimpleSchema(Album.schema));


/**
 * Find Albums by name and the names or ids of the artists.
 * Name matching uses "normalised" matching, ignoring case, punctuation,
 * multiple and start/end white space characters.
 *
 * @param {string} name - The name of the album.
 * @param {Array} artists - Either artist names or Artist documents.
 * @return {Array} The matching Albums.
 */
Album.findByName = (name, artists) => {
  name = normaliseString(name);
  const artistNamesGiven = typeof artists[0] == 'string';
  artists = artists.map(a => artistNamesGiven ? normaliseString(a) : a._id).sort();

  // Search Album collection by name then filter on artists.
  const albums = Album.find({nameNormalised: name}).fetch();
  return albums.filter(a => {
    // Check artists.
    const albumArtists = artistNamesGiven ? a.artistIds.map(aid => Artist.findOne(aid).nameNormalised) : a.artistIds;
    return _.isEqual(albumArtists.sort(), artists);
  });
}


export default Album;
