/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import { commonMusicItemFields } from '../Utility/music';
import { normaliseString, normaliseStringMatch } from '../../modules/util';

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
  ...commonMusicItemFields,
};
Artist.attachSchema(new SimpleSchema(Artist.schema));

export default Artist;
