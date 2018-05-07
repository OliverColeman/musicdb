import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { publishComposite } from 'meteor/reywood:publish-composite';
import _ from 'lodash';

import { musicCollection } from '../collections';
import { soundex, doubleMetaphone, findBySoundexOrDoubleMetaphone } from '../../../modules/util';
import { importFromSearch } from '../../../modules/server/music/music_service';
import Track from '../../Track/Track';
import Artist from '../../Artist/Artist';
import Album from '../../Album/Album';


Meteor.publish('search', function search(type, name, limit) {
  check(type, String);
  check(name, String);
  check(limit, Number);
  limit = Math.floor(limit);
  if (limit > 100) limit = 100;
  else if (limit <= 0) limit = 50;
  return findBySoundexOrDoubleMetaphone(musicCollection[type.toLowerCase()], soundex(name), doubleMetaphone(name), null, limit);
});


publishComposite('search.track', function search(args) {
  check(args, {
    artistName: String,
    albumName: String,
    trackName: String,
    limit: Number,
    importFromServices: Match.Maybe(Boolean),
    inPlayListsWithGroupId: Match.Maybe(String),
  });

  let {artistName, albumName, trackName, limit, importFromServices, inPlayListsWithGroupId} = args;

  limit = Math.floor(limit);
  if (limit > 100) limit = 100;
  else if (limit <= 0) limit = 50;

  // Filter by artist and album.
  let additionalSelectors = {};
  let artistIds = artistName ? findBySoundexOrDoubleMetaphone(Artist, soundex(artistName), doubleMetaphone(artistName)).map(a => a._id) : null;
  let albumIds = albumName ? findBySoundexOrDoubleMetaphone(Album, soundex(albumName), doubleMetaphone(albumName)).map(a => a._id) : null;
  if (artistIds && artistIds.length) additionalSelectors.artistIds = {$in: artistIds};
  if (albumIds && albumIds.length) additionalSelectors.albumId = {$in: albumIds};
  if (inPlayListsWithGroupId) {
    additionalSelectors.appearsInPlayListGroups = inPlayListsWithGroupId;
  }

  return {
    find() {
      // If this is a search by track name.
      if (trackName) {
        const results = findBySoundexOrDoubleMetaphone(Track, soundex(trackName), doubleMetaphone(trackName), additionalSelectors, limit);

        if (importFromServices && results.count() < limit) {
          Meteor.defer(() => {
            // Note 1: importFromSearch is called asynchronously here, but the spotify and
            // MB searches are actually run serially because it contains an internal locking
            // mechanism to prevent parallel execution with itself (to avoid duplicate records).
            // Note 2: Spotify search is run first because it's web service returns more quickly.
            importFromSearch('spotify', 'track', { trackName, albumName, artistNames: [artistName] });
            importFromSearch('musicbrainz', 'track', { trackName, albumName, artistNames: [artistName] });
          }, 300);
        }

        return results;
      }
      // This is a search by artist name.
      else {
        if (!artistIds || !artistIds.length) return null;
        return Track.find(additionalSelectors, {limit});
      }
    },
    children: [
      {
        find(track) {
          return Artist.find({_id: {$in: track.artistIds}});
        }
      },
      {
        find(track) {
          return Album.find({_id: track.albumId});
        }
      },

    ]
  }
});


Meteor.publish('NeedsReview', function needsReview(type) {
  check(type, String);
  const collection = musicCollection[type];
  if (!collection) throw "Invalid type in NeedsReview pub."

  const filters = [
    {needsReview: true},
    {dataMaybeMissing: {$exists: true, $ne: []}}
  ];

  if (type = 'artist') {
    const rawCollection = collection.rawCollection();
    const aggregateQuery = Meteor.wrapAsync(rawCollection.aggregate, rawCollection);
    const aggResult = aggregateQuery([
      { $group: {
        _id: { nameNormalised: "$nameNormalised" },   // replace `name` here twice
        uniqueIds: { $addToSet: "$_id" },
        count: { $sum: 1 }
      } },
      { $match: {
        count: { $gte: 2 }
      } },
      { $sort : { count : -1} },
      { $limit : 50 }
    ]);

    const artistIds = _.flatten(aggResult.map(res => res.uniqueIds));
    filters.push({_id: {$in: artistIds}});
  }

  return collection.find({$or: filters}, {limit: 50});
});
