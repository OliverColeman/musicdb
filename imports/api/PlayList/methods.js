import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';

import rateLimit from '../../modules/rate-limit';
import Access from '../../modules/access';
import PlayList from './PlayList';
import Track from '../Track/Track';
import { getSchemaFieldTypes, throwMethodException } from '../Utility/methodutils';


Meteor.methods({
  'PlayList.addTracks': function PlayListAddTracks(playListId, trackIds) {
    check(playListId, String);
    check(trackIds, [String]);

    const playList = PlayList.findOne(playListId);

    if (!Access.allowed({collection: PlayList, op: 'update', item: playList, user: this.userId})) throwMethodException("Not allowed.");

    try {
      if (!playList) throw "Play list does not exist.";
      const tracks = Track.find({_id: {$in: trackIds}}).fetch();
      if (tracks.length != trackIds.length) throw "Invalid track id(s) provided.";

      const durationDelta = tracks.reduce((total, track) => total + track.duration, 0);

      PlayList.update(playListId, {
        $push: { trackIds: { $each: trackIds } },
        $inc: { duration: durationDelta },
      });
    } catch (exception) {
      throwMethodException(exception);
    }
  },

  'PlayList.moveTrack': function PlayListMoveTrack(playListId, trackId, insertIndex) {
    check(playListId, String);
    check(trackId, String);
    check(insertIndex, Number);

    try {
      const playList = PlayList.findOne(playListId);
      if (!playList) throw "Play list does not exist.";
      if (!Access.allowed({collection: PlayList, op: 'update', item: playList, user: this.userId})) throw "Not allowed.";

      const trackIds = playList.trackIds;
      const currentIndex = trackIds.indexOf(trackId);
      if (currentIndex == -1) throw "Track is not in play list.";
      const movedTrackIndex = trackIds.splice(currentIndex, 1);
      if (insertIndex > currentIndex) insertIndex--;
      trackIds.splice(insertIndex, 0, movedTrackIndex[0]);
      PlayList.update(playListId, {$set: {trackIds}});
    } catch (exception) {
      throwMethodException(exception);
    }
  },

  'PlayList.removeTrack': function PlayListMoveTrack(playListId, index) {
    check(playListId, String);
    check(index, Number);

    try {
      const playList = PlayList.findOne(playListId);
      if (!playList) throw "Play list does not exist.";
      if (!Access.allowed({collection: PlayList, op: 'update', item: playList, user: this.userId})) throw "Not allowed.";

      const trackIds = playList.trackIds;
      trackIds.splice(index, 1);
      PlayList.update(playListId, {$set: {trackIds}});
    } catch (exception) {
      throwMethodException(exception);
    }
  },
});


rateLimit({
  methods: [
    'PlayList.addTracks',
    'PlayList.moveTrack',
    'PlayList.removeTrack',
  ],
  limit: 5,
  timeRange: 1000,
});
