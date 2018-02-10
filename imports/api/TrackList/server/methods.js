import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Jobs } from 'meteor/msavin:sjobs';

import rateLimit from '../../../modules/rate-limit';
import ProgressMonitor from '../../ProgressMonitor/ProgressMonitor';
import TrackList from '../TrackList';
import { getSchemaFieldTypes, throwMethodException } from '../../Utility/methodutils';


Meteor.methods({
  'TrackList.import': function TrackListImport(ids, insertMetadata) {
    check(ids, {
      spotifyUserId: String,
      spotifyListId: String,
    });
    check(insertMetadata, {
      name: Match.Maybe(String),
      compilerIds: Match.Maybe([String]),
      trackListListId: Match.Maybe(String),
      number: Match.Maybe(Number),
      date: Match.Maybe(Number),
    });

    console.log('method import', ids, insertMetadata)

    try {
      const progressId = ProgressMonitor.makeNew("Import track  list");
      Jobs.run("TrackList.import", ids, insertMetadata, progressId);
      return progressId;
    } catch (exception) {
      throwMethodException(exception);
    }
  },
});


rateLimit({
  methods: [
    'TrackList.import',
  ],
  limit: 5,
  timeRange: 1000,
});
