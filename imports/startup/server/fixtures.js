import moment from 'moment';

import { normaliseString, normaliseStringStrong, doubleMetaphone } from '../../modules/util';
import Artist from '../../api/Artist/Artist';
import Album from '../../api/Album/Album';
import PlayList from '../../api/PlayList/PlayList';
import Track from '../../api/Track/Track';
import LinkedTrack from '../../api/LinkedTrack/LinkedTrack';

//
// LinkedTrack.remove({});
//
// console.log("removed linked tracks.");
//
// let offset = 0
// const updateTracks = () => {
//   const tracks = Track.find({}, {limit: 25, skip: offset, sort: {'_id': 1}}).fetch();
//   for (let track of tracks) {
//     // Unset and then set so that LinkedTrack records are recreated properly.
//     Track.update(track._id, {$unset: {
//       nameNormalised: "",
//       nameNormalisedStrong: "",
//     }});
//     Track.update(track._id, {$set: {
//       nameNormalised: normaliseString(track.name),
//       nameNormalisedStrong: normaliseStringStrong(track.name),
//       doubleMetaphone: doubleMetaphone(track.name),
//     } });
//   }
//   if (!!tracks.length) {
//     offset += 25;
//     Meteor.setTimeout(updateTracks, 1000);
//   }
//   else {
//     console.log('finished updating tracks');
//   }
// }
// updateTracks();


// const artists = Artist.find({}, { fields: {name: 1}}).fetch();
// console.log("got artists ", artists.length);
// let artistIndex = 0;
// const updateArtists = () => {
//   for (let i = 0; artistIndex < artists.length && i < 50; i++, artistIndex++) {
//     let artist = artists[artistIndex];
//     Artist.update(artist._id, {$set: {
//       nameNormalisedStrong: normaliseStringStrong(artist.name)
//     } });
//   }
//   console.log('updated artists ', artistIndex);
//   if (artistIndex < artists.length) {
//     Meteor.setTimeout(updateArtists, 1000);
//   }
//   else {
//     console.log('finished updated artists');
//   }
// }
// updateArtists();
//
//
// const albums = Album.find({}, { fields: {name: 1}}).fetch();
// console.log("got albums ", albums.length);
// let albumIndex = 0;
// const updateAlbums = () => {
//   for (let i = 0; albumIndex < albums.length && i < 50; i++, albumIndex++) {
//     let album = albums[albumIndex];
//     Album.update(album._id, {$set: {
//       nameNormalisedStrong: normaliseStringStrong(album.name)
//     } });
//   }
//   console.log('updated albums ', albumIndex);
//   if (albumIndex < albums.length) {
//     Meteor.setTimeout(updateAlbums, 837);
//   }
//   else {
//     console.log('finished updated albums');
//   }
// }
// updateAlbums();


// Add an admin user if no users defined.
if (Meteor.users.find().count() == 0) {
  const adminId = Accounts.createUser({
    email: "admin@admin.admin",
    password: "admin",
    profile: { name: { first : "Ad", last : "Min" } }
  });
  Roles.addUsersToRoles(adminId, ['admin'], Roles.GLOBAL_GROUP);
}


// Add JD group if necessary.
let jdGroup = Meteor.groups.findOne({name: "JD"});
if (!jdGroup) {
  const groupId = Meteor.groups.insert({name: "JD"});
  jdGroup = Meteor.groups.findOne(groupId);
}


//import { importFromURL } from '../../modules/server/music/music_service';
// if (Meteor.isDevelopment && PlayList.find().count() == 0) {
//   // Get some example lists.
//   try {
//     // This one contains a song not on Spotify.
//     const list1 = importFromURL(
//       'playlist',
//       "https://open.spotify.com/user/petapieinthesky/playlist/67YquHJyGJabxbFnB9Yn4Y",
//       {
//         groupId: jdGroup._id,
//         name: "JD 1",
//         number: 1,
//         date: moment().startOf('day').unix(),
//       }
//     ).await();
//     console.log("Added list 1:", list1);
//
//     const list2 = importFromURL(
//       'playlist',
//       "https://open.spotify.com/user/1270621250/playlist/38VMSVnvuwhS6xLRNrc3DX",
//       {
//         groupId: jdGroup._id,
//         name: "JD 2",
//         number: 2,
//         date: moment().startOf('day').subtract('1 weeks').unix(),
//       }
//     ).await();
//     console.log("Added list 2:", list2);
//   }
//   catch(err) {
//     console.log(err);
//   }
// }
