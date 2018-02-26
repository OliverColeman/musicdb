/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import { commonMusicItemFields } from '../Utility/music';
import { normaliseString, normaliseStringMatch } from '../../modules/util';
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
    autoValue() {
      var tracks = this.field("trackIds");
      if (!tracks.isSet || !tracks.value.length) return 0;
      return Track.find({_id: {$in: tracks.value}}).fetch()
        .reduce((total, track) => total + track.duration, 0);
    }
  },
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

export default PlayList;
