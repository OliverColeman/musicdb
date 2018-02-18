import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import rateLimit from '../../modules/rate-limit';

import PlayList from './PlayList';
import { getSchemaFieldTypes, throwMethodException } from '../Utility/methodutils';


Meteor.methods({
  'PlayList.insert': function PlayListInsert(doc) {
    check(doc, getSchemaFieldTypes(PlayList.schema, doc));

    try {
      return PlayList.insert(doc);
    } catch (exception) {
      throwMethodException(exception);
    }
  },

  'PlayList.update': function PlayListUpdate(doc) {
    check(doc, getSchemaFieldTypes(PlayList.schema, doc, true));

    try {
      const id = doc._id;
      PlayList.update(id, { $set: doc });
      return id; // Return _id so we can redirect to document after update.
    } catch (exception) {
      throwMethodException(exception);
    }
  },

  'PlayList.remove': function PlayListRemove(id) {
    check(id, String);

    try {
      return PlayList.remove(id);
    } catch (exception) {
      throwMethodException(exception);
    }
  },
});


rateLimit({
  methods: [
    'PlayList.insert',
    'PlayList.update',
    'PlayList.remove',
  ],
  limit: 5,
  timeRange: 1000,
});
