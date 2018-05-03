import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import rateLimit from '../../modules/rate-limit';
import Access from '../../modules/access';
//import { defaultAccessRules } from '../Music/music';
import PlayList from './PlayList';
import Track from '../Track/Track';
import { getSchemaFieldTypes, throwMethodException } from '../Utility/methodutils';


Meteor.methods({
  'PlayList.new': function PlayListNew() {
    PlayList.insert({name: "New playlist", compilerIds: [], trackIds: []});
  },

  'PlayList.addTracks': function PlayListAddTracks(playListId, trackIds) {
    check(playListId, String);
    check(trackIds, [String]);

    try {
      const playList = PlayList.findOne(playListId);
      if (!playList) throw "Play list does not exist.";
      if (!Access.allowed({accessRules: PlayList.access, op: 'update', item: playList, user: this.userId})) throw "Not allowed.";

      const tracks = Track.find({_id: {$in: trackIds}}).fetch();
      if (tracks.length != trackIds.length) throw "Invalid track id(s) provided.";

      const durationDelta = tracks.reduce((total, track) => total + track.duration, 0);

      PlayList.update(playListId, {
        $push: { trackIds: { $each: trackIds } },
        $inc: { duration: durationDelta },
      });

      PlayList._handleTrackAdditions(playList, trackIds);
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
      if (!Access.allowed({accessRules: PlayList.access, op: 'update', item: playList, user: this.userId})) throw "Not allowed.";

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
      if (!Access.allowed({accessRules: PlayList.access, op: 'update', item: playList, user: this.userId})) throw "Not allowed.";

      const trackIds = playList.trackIds;
      const removed = trackIds.splice(index, 1);
      PlayList.update(playListId, {$set: {trackIds}});

      // If there are no other instances of the removed track.
      const trackId = removed[0];
      if (!trackIds.includes(trackId)) {
        PlayList._handleTrackRemoval(playList, trackId);
      }

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
