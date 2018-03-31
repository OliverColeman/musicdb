import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

Meteor.publish('Access.groups', function() {
  return Meteor.groups.find({name: {$ne: '__global_roles__'}});
});

Meteor.publish('Access.group', function(id) {
  check(id, String);
  return Meteor.groups.find({_id: id});
});
