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

const durationMatchMargin = 4;


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

  /**
   * @see MusicService
   */
  linkToService(type, item) {
    switch (type) {
      case 'album':
        return getAlbum({_id: item._id}, {
          albumName: item.name,
          artistIds: item.artistIds,
        });
      case 'track':
        const artistNames = Artist.find({_id: {$in: item.artistIds}}).fetch().map(a => a.name);
        return getTrack({_id: item._id}, {
          trackName: item.name,
          albumName: Album.findOne(item.albumId).name,
          artistNames,
          duration: item.duration,
        });
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
  insertMetadata = insertMetadata || {};
  details = details || {};

  let mbArtist = details.mbArtist || null;
  let mbId = ids.mbId || mbArtist && mbArtist.id;

  let artist = Object.keys(ids).length && Artist.findOne(ids)

  if (mbId && (!artist || !artist.mbId)) {
    try {
      if (!mbArtist) {
        console.log("loading artist data from mb by id");
        mbArtist = await mbAPI.artistAsync(mbId);
      }

      if (artist) {
        Artist.update(artist._id,  {$set :{
          mbId,
          disambiguation: mbArtist.disambiguation,
        }});
        return Artist.findOne(artist._id);
      }

      artist = {
        name: mbArtist.name,
        mbId,
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

  return artist;
}


/**
 * @summary Get/create an Album. Either by ids or by artist (ids) and name.
 * @param {Object} ids One or more id fields, such as _id or mbId. May be empty.
 * @param {Object} details Album details including {albumName, artistIds (internal)
 *   or artistNames}, or a full album description from the MB API
 *   {'mbAlbum'}. May be empty.
 */
const getAlbum = async (ids, details, insertMetadata) => {
  details = details || {};
  if ((details.albumName || details.artistIds || details.artistNames) &&
        (!details.albumName || !(details.artistIds || details.artistNames))) {
    console.error('mb', details);
    throw "Invalid arguments: if any one of 'albumName', 'artistIds', 'artistNames' is provided in the details argument then albumName and one of artistIds or artistNames must also be provided.";
  }

  ids = ids || {};
  insertMetadata = insertMetadata || {};

  let mbAlbum = details.mbAlbum || null;
  let mbId = ids.mbId || mbAlbum && mbAlbum.id;
  let mbArtists, mbArtist;
  let name, artist, artists;

  // First see if we already have this album in our DB...
  // ...by id
  let album = ids && Object.keys(ids).length && Album.findOne(ids)

  // ...or by matching from a mbAlbum object or names.
  if (!album && (mbAlbum || details.albumName)) {
    // Get artist and album document if possible, otherwise use names.
    if (mbAlbum) {
      if (!mbAlbum['artist-credit']) {
        mbAlbum = await mbAPI.releaseGroupAsync(mbId, {inc: 'artists'});
      }
      name = mbAlbum.title;
      artist = mbAlbum['artist-credit'][0].artist;
      artist = Album.findOne({mbId: artist.id}) || artist.name;
    }
    else {
      name = details.albumName;
      artist = details.artistNames ? details.artistNames[0] : Artist.findOne(details.artistIds[0]);
    }

    album = Album.findByName(name, artist).find(a=>!!a);
  }

  // If we haven't matched the album or we don't have an associated mbId for it.
  if (!album || !album.mbId) {
    // Make sure we have a MB album object.
    if ((!mbAlbum || !mbAlbum['artist-credit']) && (mbId || details.albumName)) {
      try {
        if (mbId) {
          console.log("loading album data from mb by id");
          mbAlbum = await mbAPI.releaseGroupAsync(mbId, {inc: 'artists'});
        }
        else {
          console.log("searching for album data from mb", details);
          artist = details.artistNames ? normaliseString(details.artistNames[0]) : Artist.findOne(details.artistIds[0]).nameNormalised;
          const results = await mbAPI.searchAsync('release-group', {
            artist: artist,
            releasegroup: details.albumName,
            limit: 50,
          });
          // See if any results match across artist and album name.
          mbAlbum = results['release-groups'].find(rg =>
            normaliseStringMatch(rg.title, details.albumName) &&
            rg['artist-credit'].find(ac => normaliseString(ac.artist.name) == artist)
          );
        }
      }
      catch (err) {
        console.error("Error retrieving album info from MB:", err);
        throw "Error retrieving album info from MB."
      }
    }

    if (mbAlbum) {
      mbId = mbAlbum.id;

      /////// If there's already a matching album object in the DB, update it. /////////
      if (album) {
        // Set the mbId for the album and associated artists as necessary.
        Album.update(album._id, {$set: {
          mbId,
          disambiguation: mbAlbum.disambiguation,
        }});

        mbArtists = mbAlbum['artist-credit'].map(ac => ac.artist ? ac.artist : ac);
        for (artist of Artist.find({_id: {$in: album.artistIds}}).fetch()) {
          if (!artist.mbId) {
            // See if this artist appears in the artists listed for the recording on MB.
            mbArtist = mbArtists.find(mba => normaliseStringMatch(mba.name, artist.name));
            if (mbArtist) {
              await getArtist({_id: artist._id}, { mbArtist });
              mbArtists = mbArtists.filter(mba => mba.id != mbArtist.id);
            }
          }
          else {
            mbArtists = mbArtists.filter(mba => mba.id != artist.mbId);
          }
        }
        // Add remaining artists listed by MB that didn't appear in the album artist list.
        if (mbArtists.length) {
          let newArtists = [];
          for (let mba of mbArtists) {
            newArtists.push(await getArtist({mbId: mba.id}, {mbArtist: mba}));
          }
          Album.update(album._id, {
            $push: {artistIds: newArtists.map(a => a._id)},
            $set: {needsReview: true}
          });
        }

        // Return the updated Album.
        return Album.findOne(album._id);
      }

      /////// We have a mbAlbum but no matching Album. Create the Album. ////////
      // Get Artists.
      mbArtists = mbAlbum['artist-credit'].map(ac => ac.artist);
      artists = [];
      for (let mba of mbArtists) {
       artists.push(await getArtist(
          {mbId: mba.id},
          {mbArtist: mba}
        ));
      }

      // Create the Album.
      album = {
        name: mbAlbum.title,
        artistIds: artists.map(artist => artist._id),
        mbId: mbAlbum.id,
        disambiguation: mbAlbum.disambiguation,
        ...insertMetadata,
      }

      const albumId = Album.insert(album);
      return Album.findOne(albumId);
    }
  }

  //////// We could not find a matching MB album. ////////
  // If we found a matching Album in our DB just return it.
  if (album) return album;

  // Otherwise create an Album from details if given.
  if (details.albumName) {
    artistIds = details.artistIds || [];
    // TODO Add artists from names if artistIds not given?

    const id = Album.insert({
      name: details.albumName,
      artistIds,
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
 */
const getTrack = async (ids, details, insertMetadata) => {
  // We use the below logic to find and match up an MB track.
  //  Attempt to load an existing Track by given ids (either internal or MB id).
  //  If that fails attempt to load an existing Track by the track, artist and album names and track duration.
  //  If we couldn't find an existing track or it doesn't have an asssociated MB id:
  //    Load or search for the track/recording on MB (mbTrack).
  //    If it was found on MB:
  //      If we found an existing track in our DB then:
  //        Update it and its associated artists and album with their corresponding MB ids.
  //        Return the track.
  //      Else
  //        Create and return a new Track using the MB recording/track data.
  //    Else (it was not found on MB):
  //      If we found an existing track in our DB then:
  //        Return it.
  //      Else
  //        Create a new Track if the track, artist and album names and track duration were provided.

  details = details || {};
  if ((details.trackName || details.artistNames || details.albumName || details.duration) &&
        (!details.trackName || !details.artistNames || !details.albumName || !details.duration))
      throw "Invalid arguments: if any one of 'trackName', 'artistNames', 'albumName', or 'duration' is provided in the details argument then all must also be provided.";

  ids = ids || {};
  insertMetadata = insertMetadata || {};

  let mbTrack = details.mbTrack || null; //MB recording/track object.
  let mbId = ids.mbId || mbTrack && mbTrack.id;
  let mbReleaseGroups, mbArtists, mbArtist, mbAlbum;
  let name, artist, artists, album, duration, durationMatch;

  // First see if we already have this track in our DB...
  // ...by id
  let track = Object.keys(ids).length && Track.findOne(ids);

  // ...or by matching from a mbTrack object or names and duration.
  if (!track && (mbTrack || details.trackName)) {
    // If we have a MB id but no MB track then fetch the mbTrack.
    if (mbId && !mbTrack) {
      console.log("loading track data from mb by id");
      mbTrack = await mbAPI.recordingAsync(mbId, {inc: 'artists+releases+release-groups'});
    }

    // Get artist and album document if possible, otherwise use names.
    if (mbTrack) {
      name = mbTrack.title;

      artist = mbTrack['artist-credit'][0].artist;
      artist = Artist.findOne({mbId: artist.id}) || artist.name;

      mbReleaseGroups = await getReleaseGroups(mbTrack);
      album = Album.findOne({mbId: {$in: mbReleaseGroups.map(rg => r.id)}});
      if (!album) {
        let matchAlbumName = track && track.albumId && Album.findOne(track.albumId).name;
        album = matchReleaseGroup(mbReleaseGroups, matchAlbumName).title;
      }

      duration = mbTrack.length / 1000;
    }
    else {
      name = details.trackName;
      artist = details.artistNames[0];
      album = details.albumName;
      duration = details.duration;
    }

    track = Track.findByName(name, artist, album)
      .filter(t => Math.abs(t.duration - duration) < durationMatchMargin)
      .find(t=>!!t);
  }

  // If we haven't matched the track or we don't have an associated mbId for it.
  if (!track || !track.mbId) {
    // Make sure we have an MB recording/track object.
    if (!mbTrack && (mbId || details.trackName)) {
      if (mbId) {
        console.log("loading track data from mb by id");
        mbTrack = await mbAPI.recordingAsync(mbId, {inc: 'artists+releases+release-groups'});
      }
      else {
        //console.log("searching for track data from mb", details);
        const results = await mbAPI.searchAsync('recording', {
          recording: details.trackName,
          artist: details.artistNames[0],
          release: details.albumName,
          limit: 50,
        });

        // See if any results match across track name, (first) artist name,
        // album name, and are within 1 second duration.
        mbTrack = results.recordings && results.recordings.find(mbt =>
          normaliseStringMatch(mbt.title, details.trackName) &&
          (Math.abs(mbt.length / 1000 - details.duration) < durationMatchMargin) &&
          mbt['artist-credit'].find(ac => normaliseStringMatch(ac.artist.name, details.artistNames[0])) &&
          mbt.releases.find(r => normaliseStringMatch(r.title, details.albumName))
        );

        // If we didn't find an exact matching track, see if we can find one with different duration.
        // This at least allows us to unambiguously match artists and album.
        if (!mbTrack) {
          mbTrack = results.recordings && results.recordings.find(mbt =>
            normaliseStringMatch(mbt.title, details.trackName) &&
            mbt['artist-credit'].find(ac => normaliseStringMatch(ac.artist.name, details.artistNames[0])) &&
            mbt.releases.find(r => normaliseStringMatch(r.title, details.albumName))
          );

          if (mbTrack) console.log("found diff duration: " + details.duration + " : " + (mbTrack.length / 1000));
        }
      }
    }

    // If an MB recording/track object was provided or found,
    // then create or update a/the Track.
    if (mbTrack) {
      mbId = mbTrack.id;
      mbReleaseGroups = await getReleaseGroups(mbTrack);

      /////// If there's already a matching track object in the DB, update it. /////////
      if (track) {
        // Set the mbId for the track and associated artists and albums as necessary.
        Track.update(track._id, {$set: {
          mbId,
          disambiguation: mbTrack.disambiguation,
        }});

        album = Album.findOne(track.albumId);
        if (!album.mbId) {
          mbAlbum = matchReleaseGroup(mbReleaseGroups, album.name);
          if (mbAlbum) {
            album = await getAlbum({_id: album._id}, {mbAlbum});
          }
        }

        mbArtists = mbTrack['artist-credit'].map(ac => ac.artist ? ac.artist : ac);
        for (artist of Artist.find({_id: {$in: track.artistIds}}).fetch()) {
          if (!artist.mbId) {
            // See if this artist appears in the artists listed for the recording on MB.
            mbArtist = mbArtists.find(mba => normaliseStringMatch(mba.name, artist.name));
            if (mbArtist) {
              await getArtist({_id: artist._id}, { mbArtist });
              mbArtists = mbArtists.filter(mba => mba.id != mbArtist.id);
            }
          }
          else {
            mbArtists = mbArtists.filter(mba => mba.id != artist.mbId);
          }
        }
        // Add remaining artists listed by MB that didn't appear in the track artist list.
        if (mbArtists.length) {
          let newArtists = [];
          for (let mba of mbArtists) {
            newArtists.push(await getArtist({mbId: mba.id}, {mbArtist: mba}));
          }
          Track.update(track._id, {
            $push: {artistIds: newArtists.map(a => a._id)},
            $set: {needsReview: true}
          });
        }

        // Return the updated Track.
        return Track.findOne(track._id);
      }

      /////// We have an mbTrack but no matching Track. Create the Track. ////////
      // Get Album.
      mbAlbum = matchReleaseGroup(mbReleaseGroups, details.albumName ? details.albumName : null);
      album = mbAlbum ? await getAlbum({mbId: mbAlbum.id}, {mbAlbum}) : null;

      // Get Artists.
      mbArtists = mbTrack['artist-credit'].map(ac => ac.artist);
      artists = [];
      for (let mba of mbArtists) {
       artists.push(await getArtist(
          {mbId: mba.id},
          {mbArtist: mba}
        ));
      }

      // Determine if the specified duration matches the duration of the MB track.
      const durationMatch = !details.duration || (Math.abs(mbTrack.length / 1000 - details.duration) < durationMatchMargin);
      // Create the Track.
      track = {
        name: mbTrack.title,
        artistIds: artists.map(artist => artist._id),
        duration: durationMatch ? mbTrack.length / 1000 : details.duration,
        ...insertMetadata,
      }
      // If we found the exact track, set the mbId.
      if (durationMatch) {
        track.mbId = mbTrack.id;
        track.disambiguation = mbTrack.disambiguation;
      }

      if (!album) {
        track.dataMaybeMissing = ['albumId']
      } else {
        track.albumId = album._id;
      }

      const trackId = Track.insert(track);
      return Track.findOne(trackId);

      // TODO fetch acoustic features. should run this as a background job?
    }
  }

  //////// We could not find a matching MB track/recording. ////////
  // If we found a matching Track in our DB just return it.
  if (track) return track;

  // Otherwise create a Track from details if given.
  if (details.trackName) {
    // We can't find an exact match for the track+artist+album names in MB. We need to determine artists,
    // which almost certainly will be on MusicBrainz and so should be linked to, but we need to
    // reliably unambiguously determine the artists. Many artists have same name. We can't use
    // album to disambiguate otherwise we would have found the track in the above MB search.
    const artists = [];
    for (let artistName of details.artistNames) {
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
        artists.push(await getArtist({mbId: mbArtist.id}, {mbArtist}));
        continue;
      }

      // Otherwise just add every matching artist from mb, a human will have to disambiguate.
      results = await mbAPI.searchAsync('artist', {
        artist: details.artistNames[0],
        limit: 50,
      });
      let filteredArtists = results.artists.filter(artist => normaliseStringMatch(artistName, artist.name));
      for (mbArtist of filteredArtists) {
        artists.push(await getArtist({mbId: mbArtist.id},  {mbArtist}));
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


const getReleaseGroups = async (mbTrack) => {
  // Make sure we have release-group/album for the MB recording/track.
  if (!mbTrack.releases[0]['release-group'] || !mbTrack.releases[0]['release-group']['first-release-date']) {
    const mbTrack2 = await mbAPI.recordingAsync(mbTrack.id, {inc: 'releases+release-groups'});
    mbTrack.releases = mbTrack2.releases;
  }
  return mbTrack.releases.map(r => r['release-group']);
}


// Get the best match for a release-group/album for the given release groups.
// If albumName is given then try to match against it. Otherwise returns the
// earliest release group with a first-release-date if available, otherwise
// returns any release group.
const matchReleaseGroup = (mbReleaseGroups, albumName) => {
  // Sort by first release date.
  mbReleaseGroups = _.sortBy(mbReleaseGroups, [ rg => rg['first-release-date'] ]);
  // Filter out any RGs missing first release date.
  mbReleaseGroupsFiltered = mbReleaseGroups.filter(rg => !!rg['first-release-date']);

  // Attempt to match against album name if given.
  if (albumName) {
    let releaseGroup = mbReleaseGroupsFiltered.find(rg => normaliseStringMatch(rg.title, albumName));
    if (releaseGroup) return releaseGroup;
    releaseGroup = mbReleaseGroups.find(rg => normaliseStringMatch(rg.title, albumName));
    if (releaseGroup) return releaseGroup;
  }
  if (mbReleaseGroupsFiltered.length) return mbReleaseGroupsFiltered[0];
  return mbReleaseGroups[0];
}
