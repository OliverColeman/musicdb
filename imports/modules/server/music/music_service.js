import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import _ from 'lodash';
import { Jobs } from 'meteor/msavin:sjobs';

import Track from '../../../api/Track/Track';
import SpotifyMS from './spotify';
import MusicBrainzMS from './musicbrainz';

/**
 * Functions to import the metadata for music items, such as tracks,
 * artists, and albums, as well as track lists and the compilers thereof.
 * Metadata is represented by and stored in documents in Meteor/mongo Collections.
 */


const Spotify = new SpotifyMS();
const MusicBrainz = new MusicBrainzMS();


/**
 * Imports an item from a URL for the item on a service. If the item has been
 * imported previously this will be returned without searching for it on the
 * service. Otherwise a document (for the appropriate collection for the item,
 * eg Artist, Track) is created if no matching document exists, otherwise the
 * existing document is updated.
 * @param {string} url - The url of the item on the service.
 * @param {string} type - The item type, eg 'artist', 'track'.
 * @param {Object} insertMetadata - Metadata to add if the document does not
 *   already exist (ignored otherwise). Must match appropriate document fields.
 * @return {Object} A Promise, resolving to a document for the appropriate
 *   collection for the item containing metadata for the item.
 */
const importFromURL = (type, url, insertMetadata) => {
  insertMetadata = insertMetadata || {};
  if (url.toLowerCase().includes('spotify')) {
    return Spotify.importFromURL(type, url, insertMetadata);
  }
  if (url.toLowerCase().includes('musicbrainz')) {
    return MusicBrainz.importFromURL(type, url, insertMetadata);
  }
  throw "Given URL does not correspond to a supported service.";
}


/**
 * Import an item specified by its id on the specified service. If the item has
 * been imported previously this will be returned without searching for it on
 * the service. Otherwise a document (for the appropriate collection for the
 * item, eg Artist, Track) is created if no matching document exists, otherwise
 * the existing document is updated.
 * @param {string} service - The service to import from, eg 'spotify', 'musicbrainz'.
 * @param {string} type - The item type, eg 'artist', 'track'.
 * @param {Object} ids - service and/or type-specific id(s) for the item.
 * @param {Object} insertMetadata - Metadata to add if the document does not
 *   already exist (ignored otherwise). Must match appropriate document fields.
 * @return {Object} A Promise, resolving to a document for the appropriate
 *   collection for the item containing metadata for the item.
 */
const importFromIds = (service, type, ids, insertMetadata) => {
  insertMetadata = insertMetadata || {};
  if (service.toLowerCase() == 'spotify') {
    return Spotify.importFromIds(type, url, insertMetadata);
  }
  if (service.toLowerCase() == 'musicbrainz') {
    return MusicBrainz.importFromIds(type, url, insertMetadata);
  }
  throw "Unknown service: " + service;
}


/**
 * Attempt to import an item from the service by name(s). If a matching item has
 * been imported previously this will be returned without searching for it on
 * the service. Otherwise if the item is found on the service then a document
 * (for the appropriate collection for the item, eg Artist, Track) is created if
 * no matching document exists, otherwise the existing document is updated.
 * @param {string} service - The service to import from, eg 'spotify', 'musicbrainz'.
 * @param {string} type - The item type, supported types are 'album' and 'track'.
 * @param {Object} names - The name of the item and other associated info to
 * use for disambiguation. For albums: { albumName, artistNames }. For tracks:
 * { trackName, albumName, artistNames, duration }.
 * @return {Object} A Promise, resolving to a document for the appropriate
 *   collection for the item containing metadata for the item or null if the
 *   item could not be found on the service.
 */
const importFromSearch = (service, type, names) => {
  if (service.toLowerCase() == 'spotify') {
    return Spotify.importFromSearch(type, names);
  }
  if (service.toLowerCase() == 'musicbrainz') {
    return MusicBrainz.importFromSearch(type, names);
  }
  throw "Unknown service: " + service;
}


/**
 * Attempt to link the given Track to any services it's not currently linked to.
 */
const linkTrackToAllServices = async (track) => {
  if (!track.mbId) {
    await MusicBrainz.linkToService('track', track);
  }

  if (!track.spotifyId) {
    await Spotify.linkToService('track', track);
  }
}


export { importFromURL, importFromIds, importFromSearch };


// Link to (other) music services upon insert.
Track.after.insert((userId, track) => {
  Jobs.run("music.linkTrackToAllServices", track);
});

Jobs.register({
  "music.linkTrackToAllServices": function (track) {
    try {
      linkTrackToAllServices(track).await();
    }
    catch(error) {
      console.error(error);
    }
    this.success();
  }
});


//importFromURL('playlist', "https://open.spotify.com/user/1255543442/playlist/3daHzs65o0T2vzWBIZdab9").await();


// let tra;
//
// tra = importFromURL('track', "https://musicbrainz.org/recording/e3adcd5b-c3ff-4860-bcde-9e92ef0967ad").await();
// console.log('tra b', tra);
//
// tra = importFromURL("track", "https://open.spotify.com/track/0Ry3vlDRNON0neCzTYnChh").await();
// console.log('tra a', tra);
//
//
// tra = importFromSearch('musicbrainz', 'track', {
//   trackName: "the winner takes it all",
//   albumName: "super trouper",
//   artistNames: ['abba'],
//   duration: 295
// }).await();
// console.log('tra1', tra);
//

// tra = importFromSearch('spotify', 'track', {
//   trackName: "the winner takes it all",
//   albumName: "super trouper",
//   artistNames: ['abba'],
//   duration: 295
// }).await();
// console.log('tra2', tra);
