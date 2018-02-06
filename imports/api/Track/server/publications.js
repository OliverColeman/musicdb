import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Track from '../Track';

Meteor.publish('Track.all', function all() {
  return Track.find();
});

Meteor.publish('Track.withId', function withId(documentId) {
  check(documentId, String);
  return Track.find({ _id: documentId });
});
