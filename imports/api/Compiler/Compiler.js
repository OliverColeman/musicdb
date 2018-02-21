/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import { commonMusicItemFields } from '../Utility/music';
import { normaliseString, normaliseStringMatch } from '../../modules/util';

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
  ...commonMusicItemFields,
};
Compiler.attachSchema(new SimpleSchema(Compiler.schema));

export default Compiler;
