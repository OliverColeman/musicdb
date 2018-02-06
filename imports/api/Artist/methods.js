import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import rateLimit from '../../modules/rate-limit';

import Artist from './Artist';
import { getSchemaFieldTypes, throwMethodException } from '../Utility/methodutils';


Meteor.methods({
  'Artist.insert': function ArtistInsert(doc) {
    check(doc, getSchemaFieldTypes(Artist.schema, doc));

    try {
      return Artist.insert(doc);
    } catch (exception) {
      throwMethodException(exception);
    }
  },

  'Artist.update': function ArtistUpdate(doc) {
    check(doc, getSchemaFieldTypes(Artist.schema, doc, true));

    try {
      const id = doc._id;
      Artist.update(id, { $set: doc });
      return id; // Return _id so we can redirect to document after update.
    } catch (exception) {
      throwMethodException(exception);
    }
  },

  'Artist.remove': function ArtistRemove(id) {
    check(id, String);

    try {
      return Artist.remove(id);
    } catch (exception) {
      throwMethodException(exception);
    }
  },
});


rateLimit({
  methods: [
    'Artist.insert',
    'Artist.update',
    'Artist.remove',
  ],
  limit: 5,
  timeRange: 1000,
});
