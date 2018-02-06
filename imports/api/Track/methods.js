import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import rateLimit from '../../modules/rate-limit';

import Track from './Track';
import { getSchemaFieldTypes, throwMethodException } from '../Utility/methodutils';


Meteor.methods({
  'Track.insert': function TrackInsert(doc) {
    check(doc, getSchemaFieldTypes(Track.schema, doc));

    try {
      return Track.insert(doc);
    } catch (exception) {
      throwMethodException(exception);
    }
  },

  'Track.update': function TrackUpdate(doc) {
    check(doc, getSchemaFieldTypes(Track.schema, doc, true));

    try {
      const id = doc._id;
      Track.update(id, { $set: doc });
      return id; // Return _id so we can redirect to document after update.
    } catch (exception) {
      throwMethodException(exception);
    }
  },

  'Track.remove': function TrackRemove(id) {
    check(id, String);

    try {
      return Track.remove(id);
    } catch (exception) {
      throwMethodException(exception);
    }
  },
});


rateLimit({
  methods: [
    'Track.insert',
    'Track.update',
    'Track.remove',
  ],
  limit: 5,
  timeRange: 1000,
});
