import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import PlayList from '../PlayList';
import Track from '../../Track/Track';

Meteor.publish('PlayList.all', function all() {
  return PlayList.find();
});

Meteor.publish('PlayList.withId', function withId(documentId, spotifyId) {
  check(documentId, Match.Maybe(String));
  check(spotifyId,  Match.Maybe(String));

  return PlayList.find(documentId ? { _id: documentId } : {spotifyId});
});

Meteor.publish('PlayList.tracks', function withId(documentId, spotifyId) {
  check(documentId, Match.Maybe(String));
  check(spotifyId,  Match.Maybe(String));

  const list = PlayList.findOne(documentId ? { _id: documentId } : {spotifyId});
  if (list) {
    return Track.find({ _id: {$in: list.trackIds }});
  }
});

Meteor.publish('PlayList.withTagId', function withId(tagId) {
  check(tagId, String);
  return PlayList.find({tagIds: tagId});
});

Meteor.publish('PlayList.withGroupId', function withId(groupId) {
  check(groupId, String);
  return PlayList.find({groupId});
});
