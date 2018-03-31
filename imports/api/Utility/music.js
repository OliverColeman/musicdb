import { normaliseString, normaliseStringMatch, soundex, doubleMetaphone } from '../../modules/util';
import Access from '../../modules/access';


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
  },

  needsReview: {
    type: Boolean,
    optional: true,
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


export { commonMusicItemFields, defaultAccessRules };
