import moment from 'moment';

import { importFromURL } from '../../modules/server/music/music_service';
import Tag from '../../api/Tag/Tag';
import PlayList from '../../api/PlayList/PlayList';


// Add JD track list list if necessary.
let jdList = Tag.findOne({name: "JD"});
if (!jdList) {
  const tagId = Tag.insert({name: "JD"});
  jdList = Tag.findOne(tagId);
}


// if (Meteor.isDevelopment && PlayList.find().count() == 0) {
//   // Get some example lists.
//   try {
//     // This one contains a song not on Spotify.
//     const list1 = importFromURL(
//       'playlist',
//       "https://open.spotify.com/user/petapieinthesky/playlist/67YquHJyGJabxbFnB9Yn4Y",
//       {
//         tagIds: [jdList._id],
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
//         tagIds: [jdList._id],
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
