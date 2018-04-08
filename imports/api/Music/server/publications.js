import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';

import { musicItemCollection } from '../music';

Meteor.publish('NeedsReview', function needsReview(type) {
  check(type, String);
  check(type, Match.Where((type) => Object.keys(musicItemCollection).includes(type)));
  const collection = musicItemCollection[type];

  return collection.find({$or: [
    {needsReview: true},
    {dataMaybeMissing: {$exists: true, $ne: []}}
  ]}, {limit: 20});
});
