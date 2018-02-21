import moment from 'moment';

import { getCompiler, getArtist, getAlbum, getTrack, getPlayList } from '../../modules/server/music/music_service';
import Tag from '../../api/Tag/Tag';
import PlayList from '../../api/PlayList/PlayList';


// Add JD track list list if necessary.
let jdList = Tag.findOne({name: "JD"});
if (!jdList) {
  const tagId = Tag.insert({name: "JD"});
  jdList = Tag.findOne(tagId);
}


if (Meteor.isDevelopment && PlayList.find().count() == 0) {
  // Get some example lists.

  const getSampleLists = async function() {

    // This one contains a song not on Spotify.
    await getPlayList(
      {
        spotifyUserId: "petapieinthesky", spotifyId: "67YquHJyGJabxbFnB9Yn4Y"
      },
      {
        tagIds: [jdList._id],
        name: "JD 1",
        number: 1,
        date: moment().startOf('day').unix(),
      }
    )
    .then(data => console.log("Added list 1:", data))
    .catch(err => console.log(err));


    await getPlayList(
      {
        spotifyUserId: "1270621250", spotifyId: "38VMSVnvuwhS6xLRNrc3DX"
      },
      {
        tagIds: [jdList._id],
        name: "JD 2",
        number: 2,
        date: moment().startOf('day').subtract('1 weeks').unix(),
      }
    )
    .then(data => console.log("Added list 2:", data))
    .catch(err => console.log(err));
  }

  getSampleLists();
}

  //const list = getPlayList({spotifyUserId: "1270621250", spotifyId: "6oeIWKU7T6MctsNlYLHUat"});
//track 6jj5kO7tFT3ir8WbbVO0iU
//track 0Cj0jv3L1L2wIPqhTZqbSN
//list petapieinthesky 67YquHJyGJabxbFnB9Yn4Y (local file)
// list spotify:user:1270621250:playlist:3BCIWgDY0aOCMg6HIVye1a

// getPlayList({spotifyUserId: "petapieinthesky", spotifyId: "67YquHJyGJabxbFnB9Yn4Y"})
//   .then(data => console.log(data))
//   .catch(err => console.log(err));

// getAlbum({}, ["5rIqOJspxDq89aBBCUda1X"], "the best of 20 years")
//   .then(data => console.log(data))
//   .catch(err => console.log(err));

// const trackDetails = {
//   trackName: "Dancing:   queen",
//   artistNames: ['aBba '],
//   albumName: "Arrival ",
//   duration: 230,
// };
// getTrack({}, trackDetails)
//   .then(data => console.log(data))
//   .catch(err => console.log(err));

//  https://open.spotify.com/artist/4tpUmLEVLCGFr93o8hFFIB


// import seeder from '@cleverbeagle/seeder';
// import { Meteor } from 'meteor/meteor';
// import Track from '../../api/Track/Track';
//
// const TrackSeed = userId => ({
//   collection: Track,
//   environments: ['development', 'staging'],
//   noLimit: true,
//   modelCount: 5,
//   model(dataIndex) {
//     return {
//       owner: userId,
//       title: `Document #${dataIndex + 1}`,
//       body: `This is the body of document #${dataIndex + 1}`,
//     };
//   },
// });
//
// seeder(Meteor.users, {
//   environments: ['development', 'staging'],
//   noLimit: true,
//   data: [{
//     email: 'admin@admin.com',
//     password: 'password',
//     profile: {
//       name: {
//         first: 'Andy',
//         last: 'Warhol',
//       },
//     },
//     roles: ['admin'],
//     data(userId) {
//       return TrackSeed(userId);
//     },
//   }],
//   modelCount: 5,
//   model(index, faker) {
//     const userCount = index + 1;
//     return {
//       email: `user+${userCount}@test.com`,
//       password: 'password',
//       profile: {
//         name: {
//           first: faker.name.firstName(),
//           last: faker.name.lastName(),
//         },
//       },
//       roles: ['user'],
//       data(userId) {
//         return TrackSeed(userId);
//       },
//     };
//   },
// });
