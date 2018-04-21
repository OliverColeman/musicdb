import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import Album from '../../Album/Album';
import Artist from '../../Artist/Artist';
import Compiler from '../../Compiler/Compiler';
import PlayList from '../../PlayList/PlayList';
import Track from '../../Track/Track';

const musicItemCollection = {
  album: Album,
  artist: Artist,
  compiler: Compiler,
  playlist: PlayList,
  track: Track,
}

Meteor.publish('NeedsReview', function needsReview(type) {
  check(type, String);
  const collection = musicItemCollection[type];
  if (!collection) throw "Invalid type in NeedsReview pub."

  return collection.find({$or: [
    {needsReview: true},
    {dataMaybeMissing: {$exists: true, $ne: []}}
  ]}, {limit: 20});
});
