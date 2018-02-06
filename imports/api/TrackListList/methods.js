import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import rateLimit from '../../modules/rate-limit';

import TrackListList from './TrackListList';
import { getSchemaFieldTypes, throwMethodException } from '../Utility/methodutils';


Meteor.methods({
  'TrackListList.insert': function TrackListListInsert(doc) {
    check(doc, getSchemaFieldTypes(TrackListList.schema, doc));

    try {
      return TrackListList.insert(doc);
    } catch (exception) {
      throwMethodException(exception);
    }
  },

  'TrackListList.update': function TrackListListUpdate(doc) {
    check(doc, getSchemaFieldTypes(TrackListList.schema, doc, true));

    try {
      const id = doc._id;
      TrackListList.update(id, { $set: doc });
      return id; // Return _id so we can redirect to document after update.
    } catch (exception) {
      throwMethodException(exception);
    }
  },

  'TrackListList.remove': function TrackListListRemove(id) {
    check(id, String);

    try {
      return TrackListList.remove(id);
    } catch (exception) {
      throwMethodException(exception);
    }
  },
});


rateLimit({
  methods: [
    'TrackListList.insert',
    'TrackListList.update',
    'TrackListList.remove',
  ],
  limit: 5,
  timeRange: 1000,
});
