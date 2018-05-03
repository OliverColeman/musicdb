import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import PlayList from '../../PlayList/PlayList';
import Track from '../Track';


Meteor.publish('Track.all', function all() {
  return Track.find();
});

Meteor.publish('Track.withId', function withId(trackId) {
  check(trackId, String);
  return Track.find({ _id: trackId });
});

Meteor.publish('Track.playLists', function playLists(trackId, groupId) {
  check(trackId, Match.Maybe(String));
  check(groupId,  Match.Maybe(String));
  return PlayList.find({ trackIds: trackId, groupId });
});
