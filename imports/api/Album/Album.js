/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

const Album = new Mongo.Collection('Album');

Album.allow({
  insert: () => false,
  update: () => false,
  remove: () => false,
});

Album.deny({
  insert: () => true,
  update: () => true,
  remove: () => true,
});

Album.schema = {
  name: String,
  artistIds: [String],
  spotifyId: {
    type: String,
    optional: true,
  },
  imageURLs: {
    type: Array,
    optional: true,
  },
};
Album.attachSchema(new SimpleSchema(Album.schema));

export default Album;
