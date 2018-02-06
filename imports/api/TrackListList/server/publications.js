import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import TrackListList from '../TrackListList';

Meteor.publish('TrackListList.all', function all() {
  return TrackListList.find();
});

Meteor.publish('TrackListList.withId', function withId(documentId) {
  check(documentId, String);
  return TrackListList.find({ _id: documentId });
});
