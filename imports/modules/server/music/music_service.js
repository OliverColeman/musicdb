import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import _ from 'lodash';

import Compiler from '../../../api/Compiler/Compiler';
import Artist from '../../../api/Artist/Artist';
import Album from '../../../api/Album/Album';
import PlayList from '../../../api/PlayList/PlayList';
import Track from '../../../api/Track/Track';
import ProgressMonitor from '../../../api/ProgressMonitor/ProgressMonitor';
import SpotifyMS from './spotify';

const Spotify = new SpotifyMS();


// TODO THIS FILE IS IN THE PROCESS OF BEING HEAVILY REFACTORED, DO NOT MODIFY.


/**
 * Functions to import the metadata for music items, such as tracks,
 * artists, and albums, as well as track lists and the compilers thereof.
 * Metadata is represented by and stored in documents in Meteor/mongo Collections.
 */


/**
 * Import an item from a URL for the item on a service. A document (for the
 * appropriate collection for the item, eg Artist, Track) is created if no
 * matching document exists, otherwise the existing document is updated.
 * To match existing documents use the findByName functions for the appropriate
 * collection.
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
    console.log(Spotify);
    return Spotify.importFromURL(type, url, insertMetadata);
  }

  throw "Given URL does not correspond to a supported service.";
}

export { importFromURL };
