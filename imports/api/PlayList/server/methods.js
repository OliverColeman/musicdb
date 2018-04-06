import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Jobs } from 'meteor/msavin:sjobs';

import rateLimit from '../../../modules/rate-limit';
import Access from '../../../modules/access';
import PlayList from '../PlayList';
import { importFromURL } from '../../../modules/server/music/music_service';
import { getSchemaFieldTypes, throwMethodException } from '../../Utility/methodutils';


Meteor.methods({
  'PlayList.import': function PlayListImport(url, insertMetadata) {
    check(url, String);
    check(insertMetadata, {
      name: Match.Maybe(String),
      compilerIds: Match.Maybe([String]),
      groupId: Match.Maybe(String),
      number: Match.Maybe(Number),
      date: Match.Maybe(Number),
    });

    if (!Access.allowed({collection: PlayList, op: 'create', user: this.userId})) throwMethodException("Not allowed.");

    // Check user is allowed to put list in specified group.
    const user = Meteor.users.findOne(this.userId);
    const userGroups = (user && user.roles) ? Object.keys(user.roles) : [];
    if (insertMetadata.groupId &&
        !Roles.userIsInRole(this.userId, ['admin'], Roles.GLOBAL_GROUP) &&
        !userGroups.includes(insertMetadata.groupId)) {
      throwMethodException("Not allowed.");
    }

    try {
      const promise = importFromURL('playlist', url, insertMetadata);
      const list = promise.await();

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
