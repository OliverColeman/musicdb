import { normaliseString, normaliseStringMatch } from '../../modules/util';


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
}

export { commonMusicItemFields };
