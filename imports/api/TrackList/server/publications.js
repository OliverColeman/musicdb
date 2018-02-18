import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import TrackList from '../TrackList';
import Track from '../../Track/Track';

Meteor.publish('TrackList.all', function all() {
  return TrackList.find();
});

Meteor.publish('TrackList.withId', function withId(documentId, spotifyListId) {
  check(documentId, Match.Maybe(String));
  check(spotifyListId,  Match.Maybe(String));

  return TrackList.find(documentId ? { _id: documentId } : {spotifyListId});
});

Meteor.publish('TrackList.tracks', function withId(documentId, spotifyListId) {
  check(documentId, Match.Maybe(String));
  check(spotifyListId,  Match.Maybe(String));

  const list = TrackList.findOne(documentId ? { _id: documentId } : {spotifyListId});
  if (list) {
    return Track.find({ _id: {$in: list.trackIds }});
  }
});

Meteor.publish('TrackList.withTagId', function withId(tagId) {
  check(tagId, String);
  return TrackList.find({tagIds: tagId});
});
