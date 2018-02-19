import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import TrackList from '../../TrackList/TrackList';
import Track from '../Track';

Meteor.publish('Track.all', function all() {
  return Track.find();
});

Meteor.publish('Track.withId', function withId(documentId) {
  check(documentId, String);
  return Track.find({ _id: documentId });
});

Meteor.publish('Track.trackLists', function withId(documentId, spotifyTrackId) {
  check(documentId, Match.Maybe(String));
  check(spotifyTrackId,  Match.Maybe(String));

  const track = Track.findOne(documentId ? { _id: documentId } : {spotifyTrackId});
  if (track) {
    const tl = TrackList.find({ trackIds: track._id });
    return tl;
  }
});
