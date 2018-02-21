/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import { commonMusicItemFields } from '../Utility/music';
import { normaliseString, normaliseStringMatch } from '../../modules/util';

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
  ...commonMusicItemFields,
  artistIds: [String],
};
Album.attachSchema(new SimpleSchema(Album.schema));


export default Album;
