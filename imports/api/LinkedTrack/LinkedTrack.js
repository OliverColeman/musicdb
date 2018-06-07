/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import { check, Match } from 'meteor/check';
import _ from 'lodash';

import { getCommonMusicItemFields, defaultAccessRules } from '../Music/music';
import { normaliseString, normaliseStringMatch } from '../../modules/util';
import Artist from '../Artist/Artist';

const LinkedTrack = new Mongo.Collection('LinkedTrack');

LinkedTrack.allow({
  insert: () => false,
  update: () => false,
  remove: () => false,
});

LinkedTrack.deny({
  insert: () => true,
  update: () => true,
  remove: () => true,
});

LinkedTrack.schema = {
  trackNameNormalisedStrong: String,
  trackIds: [String],
  artistIds: [String],
};
LinkedTrack.schemaInstance = new SimpleSchema(LinkedTrack.schema, { check });
LinkedTrack.attachSchema(LinkedTrack.schemaInstance);


export default LinkedTrack;
