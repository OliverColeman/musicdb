import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import ProgressMonitor from '../ProgressMonitor';

Meteor.publish('progressMonitor', function progressMonitor(id) {
  check(id, String);
  return ProgressMonitor.find({ _id: id });
});
