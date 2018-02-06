import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import rateLimit from '../../modules/rate-limit';

import TrackList from './TrackList';
import { getSchemaFieldTypes, throwMethodException } from '../Utility/methodutils';


Meteor.methods({
  'TrackList.insert': function TrackListInsert(doc) {
    check(doc, getSchemaFieldTypes(TrackList.schema, doc));

    try {
      return TrackList.insert(doc);
    } catch (exception) {
      throwMethodException(exception);
    }
  },

  'TrackList.update': function TrackListUpdate(doc) {
    check(doc, getSchemaFieldTypes(TrackList.schema, doc, true));

    try {
      const id = doc._id;
      TrackList.update(id, { $set: doc });
      return id; // Return _id so we can redirect to document after update.
    } catch (exception) {
      throwMethodException(exception);
    }
  },

  'TrackList.remove': function TrackListRemove(id) {
    check(id, String);

    try {
      return TrackList.remove(id);
    } catch (exception) {
      throwMethodException(exception);
    }
  },
});


rateLimit({
  methods: [
    'TrackList.insert',
    'TrackList.update',
    'TrackList.remove',
  ],
  limit: 5,
  timeRange: 1000,
});
