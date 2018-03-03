import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import _ from 'lodash';

import Compiler from '../../../api/Compiler/Compiler';
import Artist from '../../../api/Artist/Artist';
import Album from '../../../api/Album/Album';
import PlayList from '../../../api/PlayList/PlayList';
import Track from '../../../api/Track/Track';
import ProgressMonitor from '../../../api/ProgressMonitor/ProgressMonitor';

/**
 * Base class for music service integrations.
 * Subclasses should override one or both of importFromURL and importFromIds.
 * TODO this is a first bash at this API, likely to change.
 */
export default class MusicService  {
  constructor(name, machineName, url) {
    this.name = name;
    this.machineName = machineName;
    this.url = url;
  }

   /**
    * Import an item from a URL for the item on the service. A document (for the
    * appropriate collection for the item, eg Artist, Track) is created if no
    * matching document exists, otherwise the existing document is updated.
    * To match existing documents use the findByName functions for the appropriate
    * collection. (PlayLists are not matched automatically.)
    * @param {string} url - The url of the item on the service.
    * @param {string} type - The item type, eg 'artist', 'track'.
    * @param {Object} insertMetadata - Metadata to add if the document does not
    *   already exist (ignored otherwise). Must match appropriate document fields.
    * @return {Object} A Promise, resolving to a document for the appropriate
    *   collection for the item containing metadata for the item.
    */
  async importFromURL(type, url, insertMetadata) {
    throw `Import from URL not supported by ${this.name}.`;
  }

  /**
   * Import a specified item from the service. A document (for the
   * appropriate collection for the item, eg Artist, Track) is created if no
   * matching document exists, otherwise the existing document is updated.
   * To match existing documents by name use the findByName functions for the
   * appropriate collection. (PlayLists are not matched automatically.)
   * @param {string} type - The item type, eg 'artist', 'track'.
   * @param {Object} ids - service and type specific id(s) for the item.
   * @param {Object} insertMetadata - Metadata to add if the document does not
   *   already exist (ignored otherwise). Must match appropriate document fields.
   * @return {Object} A Promise, resolving to a document for the appropriate
   *   collection for the item containing metadata for the item.
   */
  async importFromIds(type, ids, insertMetadata) {
    throw `Import from ids not supported by ${this.name}.`;
  }

  /**
   * Attempt to import an item from the service by name(s). If the item is found
   * on the service then a document (for the appropriate collection for the
   * item, eg Artist, Track) is created if no matching document exists,
   * otherwise the existing document is updated. To match existing documents use
   * the findByName functions for the appropriate collection. (PlayLists are not
   * matched automatically.)
   * @param {string} type - The item type, supported types are 'album' and 'track'.
   * @param {Object} names - The name of the item and other associated names to
   * use for disambiguation. For albums: { albumName, artistNames }. For tracks:
   * { trackName, albumName, artistNames }.
   * @return {Object} A Promise, resolving to a document for the appropriate
   *   collection for the item containing metadata for the item or null if the
   *   item could not be found on the service.
   */
  async importFromSearch(type, names) {
    throw `Match from names not supported by ${this.name}.`;
  }
}
