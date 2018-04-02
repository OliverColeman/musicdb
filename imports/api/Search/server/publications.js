import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { publishComposite } from 'meteor/reywood:publish-composite';

import { soundex, doubleMetaphone, findBySoundexOrDoubleMetaphone } from '../../../modules/util';
import { importFromSearch } from '../../../modules/server/music/music_service';
import PlayList from '../../PlayList/PlayList';
import Track from '../../Track/Track';
import Artist from '../../Artist/Artist';
import Album from '../../Album/Album';
import Compiler from '../../Compiler/Compiler';


const typeMap = {
  artist: Artist,
  album: Album,
  track: Track,
  playlist: PlayList,
  compiler: Compiler,
}


Meteor.publish('search', function search(type, name, limit) {
  check(type, String);
  check(name, String);
  check(limit, Number);
  limit = Math.floor(limit);
  if (limit > 100) limit = 100;
  else if (limit <= 0) limit = 50;
  return findBySoundexOrDoubleMetaphone(typeMap[type.toLowerCase()], soundex(name), doubleMetaphone(name), null, limit);
});


publishComposite('search.track', function search(artistName, albumName, trackName, limit) {
  check(artistName, String);
  check(albumName, String);
  check(trackName, String);
  check(limit, Number);

  limit = Math.floor(limit);
  if (limit > 100) limit = 100;
  else if (limit <= 0) limit = 50;

  // Filter by artist and album.
  const additionalSelectors = {};
  artistIds = artistName ? findBySoundexOrDoubleMetaphone(Artist, soundex(artistName), doubleMetaphone(artistName)).map(a => a._id) : null;
  albumIds = albumName ? findBySoundexOrDoubleMetaphone(Album, soundex(albumName), doubleMetaphone(albumName)).map(a => a._id) : null;
  if (artistIds) additionalSelectors.artistIds = {$in: artistIds};
  if (albumIds) additionalSelectors.albumId = {$in: albumIds};

  return {
    find() {
      const results = findBySoundexOrDoubleMetaphone(Track, soundex(trackName), doubleMetaphone(trackName), additionalSelectors, limit);

      if (results.count() < limit) {
        Meteor.defer(async () => {
          try {
            await importFromSearch('musicbrainz', 'track', { trackName, albumName, artistNames: [artistName] });
          }
          catch(e) {
            console.error(e);
          }

          try {
            await importFromSearch('spotify', 'track', { trackName, albumName, artistNames: [artistName] });
          }
          catch(e) {
            console.error(e);
          }
        });
      }

      return results;
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
