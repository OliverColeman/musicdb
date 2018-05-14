import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import _ from 'lodash';

import rateLimit from '../../modules/rate-limit';
import Access from '../../modules/access';
import Compiler from './Compiler';
import { throwMethodException } from '../Utility/methodutils';

const newPlaylistValidateKeys = Object.keys(Compiler.schema);
delete(newPlaylistValidateKeys.userId);

Meteor.methods({
  'Compiler.new': function CompilerNew(compiler) {
    try {
      check(compiler, Match.Maybe(Object)); // Real validation occurs when we try to insert.
      if (!Access.allowed({accessRules: Compiler.access, op: 'create', user: this.userId})) throw "Not allowed.";
      compiler = _.assign({name: "New compiler"}, compiler || {});
      return Compiler.insert(compiler);
    }
    catch (exception) {
      throwMethodException(exception);
    }
  },
});


rateLimit({
  methods: [
    'Compiler.new',
  ],
  limit: 5,
  timeRange: 1000,
});