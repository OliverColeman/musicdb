import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { musicCollection } from '../collections';

Meteor.publish('NeedsReview', function needsReview(type) {
  check(type, String);
  const collection = musicCollection[type];
  if (!collection) throw "Invalid type in NeedsReview pub."

  return collection.find({$or: [
    {needsReview: true},
    {dataMaybeMissing: {$exists: true, $ne: []}}
  ]}, {limit: 20});
});
