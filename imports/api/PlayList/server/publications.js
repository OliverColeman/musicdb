import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { publishComposite } from 'meteor/reywood:publish-composite';

import PlayList from '../PlayList';
import Track from '../../Track/Track';


Meteor.publish('PlayList.all', function all() {
  return PlayList.find();
});

publishComposite('PlayList.withId', function withId(documentId, includeTracks) {
  check(documentId, String);
  check(includeTracks, Match.Maybe(Boolean));

  return {
    find() {
      return PlayList.find({_id: documentId});
    },
    children: [
      {
        find(playList) {
          if (includeTracks) return Track.find({ _id: {$in: playList.trackIds }});
          return null;
        }
      }
    ]
  }
});

Meteor.publish('PlayList.withTagId', function withId(tagId) {
  check(tagId, String);
  return PlayList.find({tagIds: tagId});
});

Meteor.publish('PlayList.withGroupId', function withId(groupId) {
  check(groupId, String);
  return PlayList.find({groupId});
});
