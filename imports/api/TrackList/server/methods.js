import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Jobs } from 'meteor/msavin:sjobs';

import rateLimit from '../../../modules/rate-limit';
import TrackList from '../TrackList';
import { getCompiler, getArtist, getAlbum, getTrack, getTrackList } from '../../../modules/server/music_service';
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
      tagId: Match.Maybe(String),
      number: Match.Maybe(Number),
      date: Match.Maybe(Number),
    });

    console.log('method import', ids, insertMetadata)

    try {
      const promise = getTrackList(ids, insertMetadata);
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
    'TrackList.import',
  ],
  limit: 5,
  timeRange: 1000,
});
