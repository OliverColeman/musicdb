/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

const Compiler = new Mongo.Collection('Compiler');

Compiler.allow({
  insert: () => false,
  update: () => false,
  remove: () => false,
});

Compiler.deny({
  insert: () => true,
  update: () => true,
  remove: () => true,
});

Compiler.schema = {
  name: String,
  spotifyId: {
    type: String,
    optional: true,
  },
  imageURL: { type: String, optional: true },
};
Compiler.attachSchema(new SimpleSchema(Compiler.schema));

export default Compiler;
