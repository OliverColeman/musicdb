import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Artist from '../Artist';

Meteor.publish('Artist.all', function all() {
  return Artist.find();
});

Meteor.publish('Artist.withId', function withId(documentId) {
  check(documentId, String);
  return Artist.find({ _id: documentId });
});
