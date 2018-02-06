/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

const Artist = new Mongo.Collection('Artist');

if (Meteor.isServer) {
  Artist._ensureIndex( { name: "text" } );
}

Artist.allow({
  insert: () => false,
  update: () => false,
  remove: () => false,
});

Artist.deny({
  insert: () => true,
  update: () => true,
  remove: () => true,
});

Artist.schema = {
  name: String,
  spotifyId: {
    type: String,
    optional: true,
  },
  imageURL: {
    type: String,
    optional: true,
  },
};
Artist.attachSchema(new SimpleSchema(Artist.schema));

export default Artist;
