/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import { check, Match } from 'meteor/check';

import { getCommonMusicItemFields, defaultAccessRules } from '../Music/music';
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

const commonFields = getCommonMusicItemFields();

Compiler.schema = {
  ...commonFields,
};
Compiler.schemaInstance = new SimpleSchema(Compiler.schema, { check });
Compiler.attachSchema(Compiler.schemaInstance);


Compiler.access = {
  ...defaultAccessRules,
}


/**
 * Find Compilers by name.
 * Name matching uses "normalised" matching, ignoring case, punctuation,
 * multiple and start/end white space characters.
 *
 * @param {string} name - The name of the compiler.
 * @return {Array} The matching Compilers.
 */
Compiler.findByName = (name) => {
  // Search Compiler collection by name.
  return Album.find({nameNormalised: normaliseString(name)}).fetch();
}


export default Compiler;
