import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { musicItemCollection } from '../music';

Meteor.publish('NeedsReview', function needsReview(type) {
  check(type, String);
  const collection = musicItemCollection(type);
  if (!collection) throw "Invalid type in NeedsReview pub."

  return collection.find({$or: [
    {needsReview: true},
    {dataMaybeMissing: {$exists: true, $ne: []}}
  ]}, {limit: 20});
});
