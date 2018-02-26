import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Jobs } from 'meteor/msavin:sjobs';

import rateLimit from '../../../modules/rate-limit';
import PlayList from '../PlayList';
import { importFromURL } from '../../../modules/server/music/music_service';
import { getSchemaFieldTypes, throwMethodException } from '../../Utility/methodutils';


Meteor.methods({
  'PlayList.import': function PlayListImport(url, insertMetadata) {
    check(url, String);
    check(insertMetadata, {
      name: Match.Maybe(String),
      compilerIds: Match.Maybe([String]),
      tagIds: Match.Maybe([String]),
      number: Match.Maybe(Number),
      date: Match.Maybe(Number),
    });

    console.log('method import', url, insertMetadata)

    try {
      const promise = importFromURL('playlist', url, insertMetadata);
      const list = promise.await();
      console.log('method import results', list);

      if (list && list._id) return list;

      throw "Unable to import list, unknown error.";
    } catch (exception) {
      throwMethodException(exception);
    }
  },
});


rateLimit({
  methods: [
    'PlayList.import',
  ],
  limit: 5,
  timeRange: 1000,
});
