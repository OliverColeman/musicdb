import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import TrackList from '../TrackList';
import Track from '../../Track/Track';

Meteor.publish('TrackList.all', function all() {
  return TrackList.find();
});

Meteor.publish('TrackList.withId', function withId(documentId) {
  check(documentId, String);
  return TrackList.find({ _id: documentId });
});

Meteor.publish('TrackList.tracks', function withId(documentId) {
  check(documentId, String);
  const list = TrackList.findOne(documentId);
  if (list) {
    return Track.find({ _id: {$in: list.trackIds }});
  }
});

Meteor.publish('TrackList.withTrackListListId', function withId(trackListListId) {
  check(trackListListId, String);
  return TrackList.find({trackListListId});
});
