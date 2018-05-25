import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { publishComposite } from 'meteor/reywood:publish-composite';
import _ from 'lodash';

import { musicCollection } from '../collections';
import { findBySoundexOrDoubleMetaphone, normaliseString } from '../../../modules/util';
import { importFromSearch } from '../../../modules/server/music/music_service';
import { searchQuery, searchScore } from '../search';
import Track from '../../Track/Track';
import Artist from '../../Artist/Artist';
import Album from '../../Album/Album';

const searchScoreThreshold = 0.7;

Meteor.publish('search', function search(args) {
  check(args, {
    type: String,
    terms: String,
    limit: Number,
    importFromServices: Match.Maybe(Boolean),
    inPlayListsWithGroupId: Match.Maybe(String),
  });

  let { type, terms, limit, importFromServices, inPlayListsWithGroupId } = args;

  limit = Math.floor(limit);
  if (limit > 25) limit = 25;
  else if (limit <= 0) limit = 10;

  const self = this;
  const collectionName = 'search_' + type;
  const searchScoreKey = 'searchscore_' + normaliseString(terms);
  let initializing = true;

  const cursor = searchQuery({type, terms, inPlayListsWithGroupId});

  // Get initial set of results.
  const allDocs = _.sortBy(cursor.fetch(), [doc => -doc[searchScoreKey]]);

  // Add initial set of results within limit.
  for (let i = 0; i < Math.min(limit, allDocs.length) ; i++) {
    let doc = allDocs[i];
    self.added(collectionName, doc._id, doc);
  }

  // Trigger import if specified and initial best result doesn't look like a good match.
  if (importFromServices && type == 'track' && allDocs[0][searchScoreKey] < searchScoreThreshold) {
    Meteor.defer(async () => {
      // Spotify search is run first because it's web service returns way more quickly.
      let foundDocs = await importFromSearch('spotify', 'track', terms);
      let bestScore = foundDocs.length > 0 ? Math.max(...foundDocs.map(fd => searchScore(type, terms, fd))) : 0;
      if (bestScore < searchScoreThreshold) {
        // Only do slow MB search if we couldn't find much on Spotify.
        foundDocs = await importFromSearch('musicbrainz', 'track', terms);
        bestScore = foundDocs.length > 0 ? Math.max(...foundDocs.map(fd => searchScore(type, terms, fd))) : 0;
      }
    }, 300);
  }

  const observer = cursor.observeChanges({
    added: (id, fields) => {
      if (!initializing) {
        const doc = {
          _id: id,
          ...fields,
          [searchScoreKey]: searchScore(type, terms, fields),
        };
        const insertIndex = _.sortedIndexBy(allDocs, doc, doc => -doc[searchScoreKey]);
        allDocs.splice(insertIndex, 0, doc);

        // If this affects the top N results.
        if (insertIndex < limit) {
          // Add new document to results.
          self.added(collectionName, doc._id, doc);

          // If we already had N documents in the results, remove the one that
          // has been bumped to position N+1.
          if (allDocs.length > limit) {
            self.removed(collectionName, allDocs[limit]._id);
          }
        }
      }
    },

    removed: (id) => {
      if (!initializing) {
        const removeIndex = allDocs.findIndex(doc => doc._id == id);
        allDocs.splice(removeIndex, 1);

        // If this affects the top N results.
        if (removeIndex < limit) {
          self.removed(collectionName, id);

          // If we (still) have at least N matching documents.
          if (allDocs.length >= limit) {
            // Add new Nth document to results.
            const doc = allDocs[limit-1];
            self.added(collectionName, doc._id, doc);
          }
        }
      }
    },

    changed: (id, fields) => {
      if (!initializing) {
        const currentIndex = allDocs.findIndex(doc => doc._id == id);
        const newDoc = {
          ...allDocs[currentIndex],
          ...fields,
        };
        newDoc.searchScoreKey = searchScore(type, terms, newDoc);
        const newIndex = _.sortedIndexBy(allDocs, newDoc, doc => -doc[searchScoreKey]);

        if (currentIndex == newIndex) {
          allDocs[currentIndex] = newDoc;
          if (currentIndex < limit) {
            self.changed(collectionName, newDoc._id, newDoc)
          }
        }
        else {
          allDocs.splice(currentIndex, 1);
          allDocs.splice(newIndex - (newIndex > currentIndex ? 1 : 0), 0, newDoc);

          // If the document has moved outside of the limit.
          if (currentIndex < limit && newIndex >= limit) {
            self.removed(collectionName, id);
            const doc = allDocs[limit-1];
            self.added(collectionName, doc._id, doc);
          }
          // If the document has moved inside of the limit.
          else if (currentIndex >= limit && newIndex < limit) {
            self.added(collectionName, newDoc._id, newDoc);
            self.removed(collectionName, allDocs[limit]._id);
          }
        }
      }
    }
  });

  initializing = false;

  self.ready();

  self.onStop(() => observer.stop());
});



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
