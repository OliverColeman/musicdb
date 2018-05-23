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


let importFromSearchInProgress = false;

/**
 * Attempt to import an item from the service by name(s). If a matching item has
 * been imported previously this will be returned without searching for it on
 * the service. Otherwise if the item is found on the service then a document
 * (for the appropriate collection for the item, eg Artist, Track) is created if
 * no matching document exists, otherwise the existing document is updated.
 * @param {string} service - The service to import from, eg 'spotify', 'musicbrainz'.
 * @param {string} type - The item type, supported types are 'album' and 'track'.
 * @param {Object|String} names - The name of the item and other associated info to
 * use for disambiguation. This may be a single string containing the search terms
 * or an object: for albums { albumName, artistNames }; for tracks
 * { trackName, albumName, artistNames, duration }.
 * @return {Object} A Promise, resolving to an array of documents for the
 *   appropriate collection.
 */
const importFromSearch = (service, type, names) => {
  return new Promise((resolve, reject) => {
    const waitForCompletion = async (service, type, names) => {
      if (importFromSearchInProgress) {
        Meteor.setTimeout(() => {
          waitForCompletion(service, type, names);
        }, 100);
      }
      else {
        importFromSearchInProgress = true;
        try {
          let result;
          if (service.toLowerCase() == 'spotify') {
            result = await Spotify.importFromSearch(type, names);
          }
          else if (service.toLowerCase() == 'musicbrainz') {
            result = await MusicBrainz.importFromSearch(type, names);
          }
          else {
            throw "Unknown service: " + service;
          }
          importFromSearchInProgress = false;
          resolve(result);
        }
        catch (ex) {
          importFromSearchInProgress = false;
          reject(ex);
        }
      }
    };

    waitForCompletion(service, type, names);
  });
}


/**
 * Attempt to link the given Track to any services it's not currently linked to.
 */
const linkTrackToAllServices = async (track) => {
  if (!track.mbId) {
    try {
      await MusicBrainz.linkToService('track', track);
    }
    catch(e) {
      console.error(e);
    }
  }

  if (!track.spotifyId) {
    try {
      await Spotify.linkToService('track', track);
    }
    catch(e) {
      console.error(e);
    }
  }
}


export { importFromURL, importFromIds, importFromSearch };


// Link to (other) music services upon insert.
Track.after.insert((userId, track) => {
  Jobs.run("music.linkTrackToAllServices", track._id);
});

Jobs.register({
  "music.linkTrackToAllServices": function (trackId) {
    try {
      linkTrackToAllServices(Track.findOne(trackId)).await();
    }
    catch(error) {
      console.error(error);
    }
    this.success();
  }
});

//linkTrackToAllServices(Track.findOne('MkcDdK2Y4YJe75AAa'));

//importFromURL('playlist', "https://open.spotify.com/user/1255543442/playlist/3daHzs65o0T2vzWBIZdab9").await();


// Meteor.setTimeout(() => {
//   let tra;
//
//   tra = importFromURL('track', "https://open.spotify.com/track/0vhCcrN8ULryq1KuEEYlm2").await();
//   console.log('tra s', tra);
//
//   tra = importFromURL('track', "https://musicbrainz.org/recording/fc6e4946-581d-4fb0-af52-4ba5127553bb").await();
//   console.log('tra mb', tra);
//
//   tra = importFromURL('track', "https://open.spotify.com/track/1pzQSwqvKFz6rAPrGJmyBG").await();
//   console.log('tra s2', tra);
//
// }, 300);

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
