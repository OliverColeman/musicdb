import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import rateLimit from '../../modules/rate-limit';

import Tag from './Tag';
import { getSchemaFieldTypes, throwMethodException } from '../Utility/methodutils';


Meteor.methods({
  'Tag.insert': function TagInsert(doc) {
    check(doc, getSchemaFieldTypes(Tag.schema, doc));

    try {
      return Tag.insert(doc);
    } catch (exception) {
      throwMethodException(exception);
    }
  },

  'Tag.update': function TagUpdate(doc) {
    check(doc, getSchemaFieldTypes(Tag.schema, doc, true));

    try {
      const id = doc._id;
      Tag.update(id, { $set: doc });
      return id; // Return _id so we can redirect to document after update.
    } catch (exception) {
      throwMethodException(exception);
    }
  },

  'Tag.remove': function TagRemove(id) {
    check(id, String);

    try {
      return Tag.remove(id);
    } catch (exception) {
      throwMethodException(exception);
    }
  },
});


rateLimit({
  methods: [
    'Tag.insert',
    'Tag.update',
    'Tag.remove',
  ],
  limit: 5,
  timeRange: 1000,
});
