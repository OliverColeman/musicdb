import { normaliseString, normaliseStringMatch, soundex, doubleMetaphone } from '../../modules/util';
import Access from '../../modules/access';
import Album from '../Album/Album';
import Artist from '../Artist/Artist';
import Compiler from '../Compiler/Compiler';
import PlayList from '../PlayList/PlayList';
import Track from '../Track/Track';


/**
 * Get the Collection for the specified music item type.
 */
const musicItemCollection = (type) => {
  // This is a function rather than an object to avoid es6 module loading dependency issues.
  switch(type) {
    case 'album': return Album;
    case 'artist': return Artist;
    case 'compiler': return Compiler;
    case 'playlist': return PlayList;
    case 'track': return Track;
  }
}


/**
 * Document fields that are used by all music items.
 */
const commonMusicItemFields = {
  name: String,
  nameNormalised: {
    type: String,
    autoValue() {
      var name = this.field("name");
      if (name.isSet) {
        return normaliseString(name.value);
      } else {
        this.unset();
      }
    },
  },

  disambiguation: {
    type: String,
    optional: true,
  },

  dataMaybeMissing: {
    type: Array,
    optional: true,
  },
  'dataMaybeMissing.$': {
    type: String, // The name of the field that may be missing data.
  },

  potentialDuplicate: {
    type: Boolean,
    optional: true,
    // This isn't actually set anywhere, still required?
  },

  needsReview: {
    type: Boolean,
    optional: true,
    // This is used to manually indicate that the item needs review.
    // An item also "needs review" if the dataMaybeMissing field is populated,
    // and probably if it is not linked to a music service,
    // and if there appear to be duplicates.
  },

  imageURLs: {
    type: Object,
    optional: true,
  },
  "imageURLs.small": { type: String, optional: true },
  "imageURLs.medium": { type: String, optional: true },
  "imageURLs.large": { type: String, optional: true },

  spotifyId: {
    type: String,
    optional: true,
  },
  // MusicBrainz
  mbId: {
    type: String,
    optional: true,
  },

  soundex: {
    type: Array,
    autoValue() {
      const name = this.field("name");
      if (name.value) return soundex(name.value);
    },
  }, 'soundex.$': {
    type: String,
  },

  doubleMetaphone: {
    type: Array,
    optional: true,
    autoValue() {
      const name = this.field("name");
      if (name.value) return doubleMetaphone(name.value);
    },
  }, 'doubleMetaphone.$': {
    type: String,
  },
}


const defaultAccessRules = {
  [Access.UNAUTHENTICATED]: [ 'view' ],
  [Access.AUTHENTICATED]: [ 'view' ],
  [Access.OWN]: [ 'view', 'update', 'delete' ],
  admin: [ 'view', 'update', 'delete', 'create' ],
  // Note: If a user has the 'admin' role in the Roles.GLOBAL_GROUP then these
  // rules apply across all groups, otherwise they appy only for the groups the
  // user and (if applicable) item is in .
}


export { commonMusicItemFields, defaultAccessRules, musicItemCollection };
