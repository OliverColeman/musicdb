/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

const TrackList = new Mongo.Collection('TrackList');

TrackList.allow({
  insert: () => false,
  update: () => false,
  remove: () => false,
});

TrackList.deny({
  insert: () => true,
  update: () => true,
  remove: () => true,
});

TrackList.schema = {
  name: String,
  compilerIds: [String],
  trackIds: [String],
  duration: Number,

  spotifyUserId: {
    type: String,
    optional: true,
  },
  spotifyListId: {
    type: String,
    optional: true,
  },
  tagIds: { type: Array, optional: true },
  'tagIds.$': { type: String },
  number: { type: Number, optional: true },
  date: { type: Number, optional: true }, //unix timestamp
};

TrackList.attachSchema(new SimpleSchema(TrackList.schema));

export default TrackList;
