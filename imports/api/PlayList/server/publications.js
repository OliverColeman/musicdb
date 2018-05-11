import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { publishComposite } from 'meteor/reywood:publish-composite';

import PlayList from '../PlayList';
import Track from '../../Track/Track';
import Artist from '../../Artist/Artist';
import Compiler from '../../Compiler/Compiler';


publishComposite('PlayList', function PlayListSelector(selector, includeTracks, includeCompilers) {
  check(selector, Match.OneOf(String, Object)); // TODO allows access to any PlayList, however at the moment all playlists may be public.
  check(includeTracks, Match.Maybe(Boolean));
  check(includeCompilers, Match.Maybe(Boolean));

  return {
    find() {
      return PlayList.find(selector);
    },
    children: [
      {
        find(playList) {
          if (includeTracks) return Track.find({ _id: {$in: playList.trackIds }});
          return null;
        },
        children: [
          {
            find(track) {
              // Also publish first Artist so we can get the artist name for, eg, the youtube search links.
              return Artist.find({ _id: track.artistIds[0]});
            }
          }
        ]
      },
      {
        find(playList) {
          if (includeCompilers) return Compiler.find({ _id: {$in: playList.compilerIds }});
          return null;
        },
      },
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

Meteor.publish('PlayList.withUserId', function withId(userId) {
  check(userId, String);
  return PlayList.find({userId});
});

Meteor.publish('PlayList.withCompilerId', function withId(compilerId) {
  check(compilerId, String);
  return PlayList.find({compilerIds: compilerId});
});
