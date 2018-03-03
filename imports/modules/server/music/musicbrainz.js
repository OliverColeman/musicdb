import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import bluebird from 'bluebird';
import NB from 'nodebrainz';
import _ from 'lodash';

import { normaliseString, normaliseStringMatch } from '../../util';
import MusicService from './music_service_class';
import Compiler from '../../../api/Compiler/Compiler';
import Artist from '../../../api/Artist/Artist';
import Album from '../../../api/Album/Album';
import PlayList from '../../../api/PlayList/PlayList';
import Track from '/imports/api/Track/Track';


// Mapping from our item types to MB types.
// MB does not have playlist functionality. Closest thing is a 'collection'
// of recordings, but this is unordered and the nodebrainz client doesn't
// support it so it hardly seems worth the trouble at the moment. For this
// reason we also don't bother supporting users/compilers at present.
const typeMapping = {
  'user':      false,
  'artist':    'artist',
  'album':     'release-group',
  'track':     'recording',
  'playlist':  false,
}

/**
 * Functions to import items from MusicBrainz.
 * @see MusicService
 */
export default class MusicBrainz extends MusicService {
  constructor() {
    super("MusicBrainz", "mb", "https://mb.com");
  }

  /**
   * @see MusicService
   */
  importFromURL(type, url, insertMetadata) {
    if (!typeMapping[type]) throw `Importing ${type} from MusicBrainz not supported.`;
    const urlRE = /^.*musicbrainz\.org\/([a-zA-Z]+)\/([\w-]+)(?:\/.*)?\s*$/i;
    const matches = url.match(urlRE);
    if (!matches) throw "Malformed MusicBrainz URL: " + url;
    let [ , urlType, mbId] = matches;
    if (typeMapping[type] != urlType) throw `Invalid MusicBrainz URL for importing ${type}: ${url}`;
    return this.importFromIds(type, { mbId }, insertMetadata);
  }

  /**
   * @see MusicService
   */
  importFromIds(type, ids, insertMetadata) {
    switch (type) {
      case 'artist':    return getArtist(ids, null, insertMetadata);
      case 'album':     return getAlbum(ids, null, insertMetadata);
      case 'track':     return getTrack(ids, null, insertMetadata);
    }
    throw "Unsupported music item type: " + type;
  }

  /**
   * @see MusicService
   */
  importFromSearch(type, names) {
    switch (type) {
      case 'album':     return getAlbum(null, names);
      case 'track':     return getTrack(null, names);
    }
    throw "Unsupported music item type: " + type;
  }
}


const mbAPI = bluebird.promisifyAll(new NB({
  userAgent:'musicdb/0.0.1 ( https://github.com/OliverColeman/musicdb )',
  retryOn: true, retryDelay: 3000, retryCount: 3,
  defaultLimit: 50
}));


/**
 * @summary Get/create an Artist.
 * @param {Object} ids One or more id fields, such as _id or mbId.
 * @param {Object} details Artist details (not implemented yet, see TODO in getTrack),
    or a full artist description from the MB API {'mbArtist'}. May be empty.
 */
const getArtist = async (ids, details, insertMetadata) => {
  ids = ids || {};
  if (!ids.mbId && details && details.mbArtist) ids.mbId = details.mbArtist.id;

  let artist = Object.keys(ids).length && Artist.findOne(ids)
  if (!!artist) return artist;

  insertMetadata = insertMetadata || {};
  details = details || {};

  if (ids.mbId || details && details.mbArtist) {
    try {
      let mbArtist;
      if (details && details.mbArtist) {
        console.log("using preloaded artist data");
        mbArtist = details.mbArtist;
        // If the given artist details are missing the disambiguation field, load full details.
        if (typeof mbArtist.disambiguation == 'undefined') {
          mbArtist = await mbAPI.artistAsync(mbArtist.id);
        }
      }
      else {
        console.log("loading artist data from mb by id");
        mbArtist = await mbAPI.artistAsync(ids.mbId);
      }

      artist = {
        name: mbArtist.name,
        mbId: mbArtist.id,
        disambiguation: mbArtist.disambiguation,
        ...insertMetadata,
      };
      const id = Artist.insert(artist);
      return Artist.findOne(id);
    }
    catch (err) {
      console.error("Error retrieving artist info from MusicBrainz:", err);
      throw "Error retrieving artist info from MusicBrainz."
    }
  }
}


/**
 * @summary Get/create an Album. Either by ids or by artist (ids) and name.
 * @param {Object} ids One or more id fields, such as _id or mbId. May be empty.
 * @param {Object} details Album details including {artistIds (internal) or
 *   artistNames, albumName}, or a full album description from the MB API
 *   {'mbAlbum'}. May be empty.
 */
const getAlbum = async (ids, details, insertMetadata) => {
  ids = ids || {};
  if (!ids.mbId && details && details.mbAlbum) ids.mbId = details.mbAlbum.id;

  let album = Object.keys(ids).length && Album.findOne(ids);
  if (!!album) return album;

  details = details || {};
  insertMetadata = insertMetadata || {};

  if (ids.mbId || details && ((details.artistIds || details.artistNames) && details.albumName || details.mbAlbum)) {
    try {
      let mbAlbum;
      if (details.mbAlbum && details.mbAlbum['artist-credit']) {
        console.log("using preloaded album data");
        mbAlbum = details.mbAlbum;
      }
      else if (ids.mbId) {
        console.log("loading album data from mb by id");
        mbAlbum = await mbAPI.releaseGroupAsync(ids.mbId, {inc: 'artists'});
      }
      else {
        // Before querying MB, see if we have a matching album in our DB with a mbId.
        const artistNames = details.artistNames ? details.artistNames :
          Artist.find({_id: {$in: details.artistIds}}).fetch().map(a => a.name);
        const existingAlbum = Album.findByName(details.albumName, artistNames).find(a => !!a.mbId);
        if (existingAlbum) {
          console.log("using existing album");
          return existingAlbum;
        }

        console.log("searching for album data from mb", details);
        const results = await mbAPI.searchAsync('release-group', {
          artist: artistNames[0],
          releasegroup: details.albumName,
          limit: 50,
        });

        // See if any results match the album name and (first) artist name.
        mbAlbum = results['release-groups'].find(rg => {
          return normaliseStringMatch(rg.title, details.albumName) &&
                  rg['artist-credit'].find(ac => normaliseStringMatch(ac.artist.name, artistNames[0]));
        });
      }

      if (mbAlbum) {
        // Collate list of artists.
        const artists = (await Promise.all(
          mbAlbum['artist-credit'].map(ac => getArtist({mbId: ac.id ? ac.id : ac.artist.id}))
        )).filter(artist => !!artist);

        const existingAlbums = Album.findByName(mbAlbum.title, artists);
        let album;
        if (existingAlbums.length == 1) {
          album = existingAlbums[0];
        }
        else {
          album = {
            name: mbAlbum.title,
            artistIds: artists.map(a => a._id),
            ...insertMetadata,
          };
        }
        album.mbId = mbAlbum.id;
        album.disambiguation = mbAlbum.disambiguation;

        if (existingAlbums.length == 1) {
          Album.update(album._id, {$set: album});
          return album;
        }
        else {
          const id = Album.insert(album);
          return Album.findOne(id);
        }
      }
    }
    catch (err) {
      console.error("Error retrieving album info from MusicBrainz:", err);
      throw "Error retrieving album info from MusicBrainz."
    }
  }

  // If we get to to here the album wasn't found on MusicBrainz.
  if (details.albumName) {
    artistIds = details.artistIds || [];

    // See if we already have an album with same name and artists.
    const existingAlbums = Album.findByName(details.albumName, Artist.find({_id: {$in: artistIds}}));
    if (existingAlbums.length) return existingAlbums[0];

    const id = Album.insert({
      name: details.albumName,
      artistIds: artistIds,
      ...insertMetadata,
    });
    return Album.findOne(id);
  }
}


/**
 * @summary Get/create a Track. Either by ids or with the given track details.
 * @param {Object} ids One or more id fields, such as _id or mbId. May be empty.
 * @param {Object} details Basic track details {'trackName', 'artistNames' (array), 'albumName', 'duration'},
    or a full track description from the MB API {'mbTrack'}. May be empty.
 * TODO Handle adding tracks (and associated artists and album) when can't find on MusicBrainz.
 */
const getTrack = async (ids, details, insertMetadata) => {
  ids = ids || {};
  if (!ids.mbId && details && details.mbTrack) ids.mbId = details.mbTrack.id;

  // First see if we already have this track in our DB.
  let track = Object.keys(ids).length && Track.findOne(ids);
  if (!!track) return track;

  details = details || {};
  insertMetadata = insertMetadata || {};

  // If this is a mb track or we can search for it on mb.
  if (ids.mbId || details.mbTrack || details.trackName && details.artistNames && details.albumName && details.duration) {
    try {
      let mbTrack;

      if (details.mbTrack) {
        console.log("using preloaded mb track data");
        mbTrack = details.mbTrack;
      }
      else if (ids.mbId) {
        console.log("loading track data from mb by id");
        mbTrack = await mbAPI.recordingAsync(ids.mbId, {inc: 'artists+releases+release-groups'});
      }
      else {
        // Before querying MB, see if we already have a matching track in our DB with a mbId.
        let existingTrack = Track.findByName(details.trackName, details.artistNames, details.albumName)
          .find(et => et.mbId && (Math.abs(et.duration - details.duration) < 1));

        if (existingTrack) {
          console.log("using existing track");
          return existingTrack;
        }

        console.log("searching for track data from mb", ids, details);
        const results = await mbAPI.searchAsync('recording', {
          recording: details.trackName,
          artist: details.artistNames[0],
          release: details.albumName,
          limit: 50,
        });

        // See if any results match across track name, (first) artist name,
        // album name and are within 1 second duration.
        mbTrack = results.recordings.find(track => {
          return normaliseStringMatch(track.title, details.trackName) &&
                  (Math.abs(track.length / 1000 - details.duration) < 1) &&
                  track['artist-credit'].find(ac => normaliseStringMatch(ac.artist.name, details.artistNames[0])) &&
                  track.releases.find(r => normaliseStringMatch(r.title, details.albumName));
        });

        // If we didn't find an exact matching track, see if we can find one with different duration.
        // This at least allows us to unambiguously match artists and album.
        if (!mbTrack) {
          mbTrack = results.recordings.find(track => {
            return normaliseStringMatch(track.title, details.trackName) &&
                    track['artist-credit'].find(ac => normaliseStringMatch(ac.artist.name, details.artistNames[0])) &&
                    track.releases.find(r => normaliseStringMatch(r.title, details.albumName));
          });

          console.log("found diff diration");
        }
      }

      if (mbTrack) {
        // If we don't have the required release group info then fetch it.
        // This can happen when using search results.
        if (!mbTrack.releases[0]['release-group']['first-release-date']) {
          mbTrack = await mbAPI.recordingAsync(mbTrack.id, {inc: 'artists+releases+release-groups'});
        }

        const mbArtists = mbTrack['artist-credit'].map(ac => ac.artist);
        const artists = await Promise.all(
          mbArtists.map(
            mbArtist => getArtist(
              {mbId: mbArtist.id},
              {mbArtist}
            )
          )
        );

        // Use the earliest album/release if no album name given, otherwise earliest matching album.
        const mbReleases = _.sortBy(mbTrack.releases, [ r => r['release-group']['first-release-date'] ]);
        let mbAlbum;
        if (!details.albumName) {
          mbAlbum = mbReleases[0]['release-group'];
        }
        else {
          mbAlbum = mbReleases.find(r => normaliseStringMatch(details.albumName, r['release-group'].title));
          if (mbAlbum) mbAlbum = mbAlbum['release-group'];
        }

        const album = mbAlbum ? await getAlbum({mbId: mbAlbum.id}, {mbAlbum}) : null;

        const existingTracks = Track.findByName(mbTrack.title, artists, album)
          .filter(track => Math.abs(track.duration - details.duration) < 1);

        console.log('etc', existingTracks.length);

        if (existingTracks.length == 1) {
          Track.update(existingTracks[0]._id, {$set: {
            mbId: mbTrack.id,
            disambiguation: mbTrack.disambiguation
          }});
          return Track.findOne(existingTracks[0]._id);
        }
        else {
          const durationMatch = Math.abs(mbTrack.length / 1000 - details.duration) < 1;
          const track = {
            name: mbTrack.title,
            artistIds: artists.map(artist => artist._id),
            duration: durationMatch ? mbTrack.length / 1000 : details.duration,
            ...insertMetadata,
          }
          // If we found the exact track, set the mbId.
          if (Math.abs(track.length / 1000 - details.duration) < 1) {
            track.mbId = mbTrack.id;
            track.disambiguation = mbTrack.disambiguation;
          }

          if (!album) {
            track.dataMaybeMissing = ['albumId']
          } else {
            track.albumId = album._id;
          }

          const trackId = Track.insert(track);

          console.log('it', track);
          return Track.findOne(trackId);
        }

        // TODO fetch acoustic features. should run this as a background job?
      }
    }
    catch (err) {
      console.error("Error retrieving track info from MusicBrainz:", err);
      throw "Error retrieving track info from MusicBrainz."
    }
  }

  // We didn't find a recording with matching artist and release-group names in MusicBrainz...
  if (details.trackName && details.artistNames && details.albumName) {
    // ...if we can find a name match in DB return that.
    const existingTracks = Track.findByName(details.trackName, details.artistNames, details.albumName);
    if (existingTracks.length) return existingTracks[0];

    // We can't find an exact match for the track+artist+album names. We need to determine artists,
    // which almost certainly will be on MusicBrainz and so should be linked to, but we need to
    // reliably unambiguously determine the artists. Many artists have same name. We can't use
    // album to disambiguate otherwise we would have found the track in the above MB search.
    const artists = [];
    for (artistName of details.artistNames) {
      // First search by track and artist name,
      // if we find a result where both names match exactly it's probably the right artist.
      let results = await mbAPI.searchAsync('recording', {
        recording: details.trackName,
        artist: details.artistNames[0],
        limit: 50,
      });
      mbTrack = results.recordings.find(track => {
        return normaliseStringMatch(track.title, details.trackName) &&
                track['artist-credit'].find(ac => normaliseStringMatch(ac.artist.name, artistName));
      });
      if (mbTrack) {
        let mbArtist = mbTrack['artist-credit'].find(ac => normaliseStringMatch(ac.artist.name, artistName)).artist;
        artists.push(await getArtist({}, {mbArtist}));
        continue;
      }

      // Otherwise just add every matching artist from mb, a human will have to disambiguate.
      results = await mbAPI.searchAsync('artist', {
        artist: details.artistNames[0],
        limit: 50,
      });
      let filteredArtists = results.artists.filter(artist => normaliseStringMatch(artistName, artist.name));
      for (mbArtist of filteredArtists) {
        artists.push(await getArtist({},  {mbArtist}));
      }
    }
    const artistIds = artists.map(artist => artist._id);

    const album = await getAlbum({},
      {
        albumName: details.albumName,
        artistIds,
      }, {
        // This isn't necessarily a complete list of artists for this album.
        dataMaybeMissing: ['artistIds'],
      });

    const dataMaybeMissing = ['artistIds'];
    if (!details.duration) dataMaybeMissing.push('duration');

    const track = {
      name: details.trackName,
      artistIds,
      albumId: album._id,
      duration: details.duration,
      dataMaybeMissing,
    };

    const id = Track.insert(track);
    return Track.findOne(id);
  }
}
