import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Album from '../Album';

Meteor.publish('Album.all', function all() {
  return Album.find();
});

Meteor.publish('Album.withId', function withId(documentId) {
  check(documentId, String);
  return Album.find({ _id: documentId });
});
