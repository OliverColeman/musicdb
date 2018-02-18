/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

const Track = new Mongo.Collection('Track');

Track.allow({
  insert: () => false,
  update: () => false,
  remove: () => false,
});

Track.deny({
  insert: () => true,
  update: () => true,
  remove: () => true,
});

Track.schema = {
  name: String,
  artistIds: [String],
  albumId: String,
  duration: {
    type: Number,
    optional: true,
  },
  spotifyId: {
    type: String,
    optional: true,
  },
  features: {
    type: Object,
    optional: true,
  },
  dataMaybeMissing: {
    type: Array,
    optional: true,
  },
  'dataMaybeMissing.$': {
    type: String, // A field name from above.
  },
  potentialDuplicate: {
    type: Boolean,
    optional: true,
  },
}

Track.attachSchema(new SimpleSchema(Track.schema));


export default Track;
