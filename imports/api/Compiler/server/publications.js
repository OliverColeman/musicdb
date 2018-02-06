import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import Compiler from '../Compiler';

Meteor.publish('Compiler.all', function all() {
  return Compiler.find();
});

Meteor.publish('Compiler.withId', function withId(documentId) {
  check(documentId, String);
  return Compiler.find({ _id: documentId });
});
