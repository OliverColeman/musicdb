import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import rateLimit from '../../modules/rate-limit';

import Compiler from './Compiler';
import { getSchemaFieldTypes, throwMethodException } from '../Utility/methodutils';


Meteor.methods({
  'Compiler.insert': function CompilerInsert(doc) {
    check(doc, getSchemaFieldTypes(Compiler.schema, doc));

    try {
      return Compiler.insert(doc);
    } catch (exception) {
      throwMethodException(exception);
    }
  },

  'Compiler.update': function CompilerUpdate(doc) {
    check(doc, getSchemaFieldTypes(Compiler.schema, doc, true));

    try {
      const id = doc._id;
      Compiler.update(id, { $set: doc });
      return id; // Return _id so we can redirect to document after update.
    } catch (exception) {
      throwMethodException(exception);
    }
  },

  'Compiler.remove': function CompilerRemove(id) {
    check(id, String);

    try {
      return Compiler.remove(id);
    } catch (exception) {
      throwMethodException(exception);
    }
  },
});


rateLimit({
  methods: [
    'Compiler.insert',
    'Compiler.update',
    'Compiler.remove',
  ],
  limit: 5,
  timeRange: 1000,
});
