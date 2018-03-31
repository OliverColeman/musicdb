/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import { commonMusicItemFields, defaultAccessRules } from '../Utility/music';
import { normaliseString, normaliseStringMatch } from '../../modules/util';
import Access from '../../modules/access';
import Track from '../Track/Track';


const PlayList = new Mongo.Collection('PlayList');

PlayList.allow({
  insert: () => false,
  update: () => false,
  remove: () => false,
});

PlayList.deny({
  insert: () => true,
  update: () => true,
  remove: () => true,
});

PlayList.schema = {
  ...commonMusicItemFields,

  compilerIds: [String],
  trackIds: [String],
  duration: {
    type: Number,
    defaultValue: 0,
  },
  groupId: { type: String, optional: true },
  tagIds: { type: Array, optional: true },
  'tagIds.$': { type: String },
  number: { type: Number, optional: true },
  date: { type: Number, optional: true }, //unix timestamp

  // Need the user id as well as list id for play lists.
  spotifyUserId: {
    type: String,
    optional: true,
  },
};

PlayList.attachSchema(new SimpleSchema(PlayList.schema));


PlayList.access = {
  ...defaultAccessRules,
  [Access.AUTHENTICATED]: [ 'create', 'view' ],
}


PlayList.before.insert((userId, doc) => {
  const tracks = Track.find({_id: {$in: doc.trackIds}}).fetch();
  if (tracks.length) {
    doc.duration = tracks.reduce((total, track) => total + track.duration, 0);
  }
});
// We don't use .after.update because it's a pain handling the various modifier types.
// Methods that add or remove tracks must manually update the duration.


export default PlayList;
