import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import rateLimit from '../../modules/rate-limit';

import Album from './Album';
import { getSchemaFieldTypes, throwMethodException } from '../Utility/methodutils';


Meteor.methods({
  'Album.insert': function AlbumInsert(doc) {
    check(doc, getSchemaFieldTypes(Album.schema, doc));

    try {
      return Album.insert(doc);
    } catch (exception) {
      throwMethodException(exception);
    }
  },

  'Album.update': function AlbumUpdate(doc) {
    check(doc, getSchemaFieldTypes(Album.schema, doc, true));

    try {
      const id = doc._id;
      Album.update(id, { $set: doc });
      return id; // Return _id so we can redirect to document after update.
    } catch (exception) {
      throwMethodException(exception);
    }
  },

  'Album.remove': function AlbumRemove(id) {
    check(id, String);

    try {
      return Album.remove(id);
    } catch (exception) {
      throwMethodException(exception);
    }
  },
});


rateLimit({
  methods: [
    'Album.insert',
    'Album.update',
    'Album.remove',
  ],
  limit: 5,
  timeRange: 1000,
});
