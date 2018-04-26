import { Meteor } from 'meteor/meteor';
import { check } from 'meteor/check';
import { publishComposite } from 'meteor/reywood:publish-composite';

import LinkedTrack from '../LinkedTrack';
import Track from '../../Track/Track';


Meteor.publish('LinkedTrack.all', function all() {
  return LinkedTrack.find();
});

Meteor.publish('LinkedTrack.withId', function withId(documentId) {
  check(documentId, String);
  return LinkedTrack.find({ _id: documentId });
});

publishComposite('LinkedTracks.forTrackId', function search(trackId) {
  check(trackId, String);

  return {
    find() {
      return LinkedTrack.find({ trackIds: trackId });
    },
    children: [
      {
        find(linkedTrack) {
          return Track.find({_id: {$in: linkedTrack.trackIds}});
        }
      }
    ]
  }
});
