import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Tag from '../Tag';

Meteor.publish('Tag.all', function all() {
  return Tag.find();
});

Meteor.publish('Tag.withId', function withId(documentId) {
  check(documentId, String);
  return Tag.find({ _id: documentId });
});
