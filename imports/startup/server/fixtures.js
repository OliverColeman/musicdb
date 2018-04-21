import moment from 'moment';

import { importFromURL } from '../../modules/server/music/music_service';
import PlayList from '../../api/PlayList/PlayList';

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
