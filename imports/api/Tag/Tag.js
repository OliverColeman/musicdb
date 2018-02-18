/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

const Tag = new Mongo.Collection('Tag');

Tag.allow({
  insert: () => false,
  update: () => false,
  remove: () => false,
});

Tag.deny({
  insert: () => true,
  update: () => true,
  remove: () => true,
});

Tag.schema = {
  name: String,
};
Tag.attachSchema(new SimpleSchema(Tag.schema));

export default Tag;
