/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

const PlayList = new Mongo.Collection('PlayList');

PlayList.allow({
  insert: () => false,
  update: () => false,
  remove: () => false,
});

PlayList.deny({
  insert: () => true,
  update: () => true,
  remove: () => true,
});

PlayList.schema = {
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

PlayList.attachSchema(new SimpleSchema(PlayList.schema));

export default PlayList;
