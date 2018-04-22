import { normaliseString, normaliseStringMatch, soundex, doubleMetaphone } from '../../modules/util';
import Access from '../../modules/access';


/**
 * Document fields that are used by all music items.
 */
const getCommonMusicItemFields = () => {
  return {
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
      access: adminUpdateOnlyAccessRules,
    },
    "imageURLs.small": { type: String, optional: true },
    "imageURLs.medium": { type: String, optional: true },
    "imageURLs.large": { type: String, optional: true },

    spotifyId: {
      type: String,
      optional: true,
      access: adminUpdateOnlyAccessRules,
    },
    // MusicBrainz
    mbId: {
      type: String,
      optional: true,
      access: adminUpdateOnlyAccessRules,
    },

    soundex: {
      type: Array,
      autoValue() {
        const name = this.field("name");
        if (name.value) return soundex(name.value);
      },
      access: adminUpdateOnlyAccessRules,
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
      access: adminUpdateOnlyAccessRules,
    }, 'doubleMetaphone.$': {
      type: String,
    },
  };
}


const defaultAccessRules = {
  [Access.UNAUTHENTICATED]: [ 'view' ],
  [Access.AUTHENTICATED]: [ 'view' ],
  [Access.OWN]: [ 'view', 'update', 'delete' ],
  admin: [ 'view', 'update', 'delete', 'create' ],
  // Note: If a user has the 'admin' role in the Roles.GLOBAL_GROUP then these
  // rules apply across all groups, otherwise they apply only for the groups the
  // user and (if applicable) item is in.
}


const adminUpdateOnlyAccessRules = {
  [Access.UNAUTHENTICATED]: [ 'view' ],
  [Access.AUTHENTICATED]: [ 'view' ],
  [Access.OWN]: [ 'view', 'delete' ],
  admin: [ 'view', 'update', 'delete', 'create' ],
  // Note: If a user has the 'admin' role in the Roles.GLOBAL_GROUP then these
  // rules apply across all groups, otherwise they apply only for the groups the
  // user and (if applicable) item is in.
}


export { getCommonMusicItemFields, defaultAccessRules, adminUpdateOnlyAccessRules };
