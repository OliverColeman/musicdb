import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import rateLimit from '../../modules/rate-limit';

import PlayList from './PlayList';
import Track from '../Track/Track';
import { getSchemaFieldTypes, throwMethodException } from '../Utility/methodutils';


Meteor.methods({
  'PlayList.addTracks': function PlayListAddTracks(playListId, trackIds) {
    check(playListId, String);
    check(trackIds, [String]);

    try {
      const playList = PlayList.findOne(playListId);
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


  'PlayList.remove': function PlayListRemove(id) {
    check(id, String);

    try {
      return PlayList.remove(id);
    } catch (exception) {
      throwMethodException(exception);
    }
  },
});


rateLimit({
  methods: [
    'PlayList.insert',
    'PlayList.update',
    'PlayList.remove',
  ],
  limit: 5,
  timeRange: 1000,
});
