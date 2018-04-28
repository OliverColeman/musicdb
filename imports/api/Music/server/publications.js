import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import _ from 'lodash';

import { musicCollection } from '../collections';

Meteor.publish('NeedsReview', function needsReview(type) {
  check(type, String);
  const collection = musicCollection[type];
  if (!collection) throw "Invalid type in NeedsReview pub."

  const filters = [
    {needsReview: true},
    {dataMaybeMissing: {$exists: true, $ne: []}}
  ];

  if (type = 'artist') {
    const rawCollection = collection.rawCollection();
    const aggregateQuery = Meteor.wrapAsync(rawCollection.aggregate, rawCollection);
    const aggResult = aggregateQuery([
      { $group: {
        _id: { nameNormalised: "$nameNormalised" },   // replace `name` here twice
        uniqueIds: { $addToSet: "$_id" },
        count: { $sum: 1 }
      } },
      { $match: {
        count: { $gte: 2 }
      } },
      { $sort : { count : -1} },
      { $limit : 50 }
    ]);

    const artistIds = _.flatten(aggResult.map(res => res.uniqueIds));
    filters.push({_id: {$in: artistIds}});
  }

  return collection.find({$or: filters}, {limit: 50});
});
