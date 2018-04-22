/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import { check, Match } from 'meteor/check';

import { getCommonMusicItemFields, defaultAccessRules } from '../Music/music';
import { normaliseString, normaliseStringMatch } from '../../modules/util';

const Artist = new Mongo.Collection('Artist');

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

const commonFields = getCommonMusicItemFields();

Artist.schema = {
  ...commonFields,
};
Artist.schemaInstance = new SimpleSchema(Artist.schema, { check });
Artist.attachSchema(Artist.schemaInstance);


Artist.access = {
  ...defaultAccessRules,
}


/**
 * Find Artists by name.
 * Name matching uses "normalised" matching, ignoring case, punctuation,
 * multiple and start/end white space characters.
 * // TODO Allow disambiguation by album or track names/ids?
 *
 * @param {string} name - The name of the track.
 * @return {Object} The matching Artists.
 */
Artist.findByName = (name) => {
  // Search Compiler collection by name.
  return Artist.find({nameNormalised: normaliseString(name)}).fetch();
}


export default Artist;
