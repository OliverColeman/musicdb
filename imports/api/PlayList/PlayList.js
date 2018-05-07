/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import { check, Match } from 'meteor/check';
import _ from 'lodash';

import { getCommonMusicItemFields, defaultAccessRules, adminUpdateOnlyAccessRules } from '../Music/music';
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

const commonFields = getCommonMusicItemFields();

PlayList.schema = {
  ...commonFields,

  compilerIds: { type: Array, defaultValue: [] },
  'compilerIds.$': String,

  trackIds: { type: Array, defaultValue: [] },
  'trackIds.$': String,

  duration: {
    type: Number,
    defaultValue: 0,
  },

  userId: {
    type: String,
    autoValue: function() {
      if (this.isInsert) {
        return this.userId;
      } else {
        this.unset();  // Prevent user from supplying their own value
      }
    },
    access: adminUpdateOnlyAccessRules
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
    access: adminUpdateOnlyAccessRules,
  },
};

PlayList.schemaInstance = new SimpleSchema(PlayList.schema, { check });
PlayList.attachSchema(PlayList.schemaInstance);


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


PlayList.after.insert((userId, doc) => {
  if (doc.trackIds.length) {
    PlayList._handleTrackAdditions(doc, doc.trackIds);
  }
});

PlayList.after.remove((userId, doc) => {
  for (let trackId of _.uniq(doc.trackIds)) {
    PlayList._handleTrackRemoval(doc, trackId);
  }
});


// Update Track fields in response to the addition of Tracks to a PlayList.
PlayList._handleTrackAdditions = (playList, trackIds) => {
  const trackUpdate = { appearsInPlayLists: playList._id };
  if (playList.groupId) trackUpdate.appearsInPlayListGroups = playList.groupId;
  for (let trackId of trackIds) {
    Track.update({_id: {$in: trackIds}}, { $addToSet: trackUpdate }, {multi: true});
  }
}

// Update Track fields in response to the removal of a Track from a PlayList.
// Should only be called when the track does not appear anywhere else in the playlist.
PlayList._handleTrackRemoval = (playList, trackId) => {
  const trackUpdate = { appearsInPlayLists: playList._id };

  if (playList.groupId) {
    // See if the track appears in any other playlists with the same group id.
    // Pull the group id from the appearsInPlayListGroups field for the track if not.
    const otherCount = PlayList.find({trackIds: trackId, groupId: playList.groupId}).count();
    if (otherCount == 0) {
      trackUpdate.appearsInPlayListGroups = playList.groupId;
    }
  }

  Track.update({_id: trackId}, {$pull: trackUpdate});
}


export default PlayList;
