import { Meteor } from 'meteor/meteor';
import SpotifyWebApi from 'spotify-web-api-node';
import Compiler from '../../api/Compiler/Compiler';
import Artist from '../../api/Artist/Artist';
import Album from '../../api/Album/Album';
import TrackList from '../../api/TrackList/TrackList';
import Track from '../../api/Track/Track';
import ProgressMonitor from '../../api/ProgressMonitor/ProgressMonitor';

/**
 * Functions to retrieve the metadata for music items, such as tracks,
 * artists, and albums, as well as track lists and the compilers thereof.
 * Metadata is represented by and stored in documents in Meteor/mongo Collections.
 * Most functions can accept several id types, including the _id field of a
 * Meteor/mongo document or Spotify id(s). If the item can't be found in the
 * local DB (by any of the given ids) then Spotify will be queried if possible
 * and a new document created and returned.
 */

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});

// For matching names ignoring case, punctuation, multiple and start/end white space characters.
const normalise = s => s.trim().toLowerCase().replace(/[^a-z0-9\s]*/g, '').replace(/\s+/g, ' ');
const normaliseMatch = (s1, s2) => normalise(s1) == normalise(s2);


/**
 * @summary Get a spotify web API object from spotify-web-api-node package.
 */
const getSpotifyAPI = async () => {
  // Get/refresh access token if necessary.
  if (!spotifyApi.getAccessToken()) {
    try {
      let data = await spotifyApi.clientCredentialsGrant();

      // Reset the stored access token when it expires.
      Meteor.setTimeout(
        () => {
          console.log("Resetting Spotify access token.");
          spotifyApi.resetAccessToken();
        },
        data.body['expires_in'] * 1000
      );

      spotifyApi.setAccessToken(data.body['access_token']);
    }
    catch (err) {
      console.error("Error retrieving Spotify access token:", err);
      throw "Error retrieving Spotify access token.";
    }
  }

  return spotifyApi;
}

// Find and return document in given collection with 'name' field matching given
// name (case insensitive but otherwise exact).
const findByName = (collection, name) => {
  if (name) {
    item = collection.findOne({ $text: { $search: name } });
    if (item && item.name.toLowerCase() == name.toLowerCase()) {
      return item;
    }
  }
}


/**
 * @summary Get/create a Compiler (for a track list). Either by ids or by name.
 * @param {Object} ids One or more id fields, such as _id or spotifyId. May be empty.
 * @param {String} name The name of the Compiler.
 */
const getCompiler = async (ids, name) => {
  let compiler = ids && Object.keys(ids).length && Compiler.findOne(ids) || findByName(Compiler, name);
  if (!!compiler) return compiler;

  if (ids.spotifyId) {
    console.log("loading compiler data from spotify by id");
    try {
      const spotifyAPI = await getSpotifyAPI();
      const { body } = await spotifyApi.getUser(ids.spotifyId);
      compiler = {
        name: body.display_name ? body.display_name : "spotify:" + body.id,
        spotifyId: body.id,
      };
      if (body.images && body.images.length) {
        // Users only have one image, it seems
        compiler.imageURL = body.images[0].url;
      }
      const id = Compiler.insert(compiler);
      return Compiler.findOne(id);
    }
    catch (err) {
      console.error("Error retrieving user info from Spotify:", err);
      throw "Error retrieving user info from Spotify."
    }
  }
}


/**
 * @summary Get/create an Artist.
 * @param {Object} ids One or more id fields, such as _id or spotifyId.
 * @param {Object} details Artist details (not implemented yet, see TODO in getTrack),
    or a full artist description from a music service, eg {spotifyArtist}. May be empty.
 */
const getArtist = async (ids, details) => {
  let artist = ids && Object.keys(ids).length && Artist.findOne(ids)
  if (!!artist) return artist;

  if (ids.spotifyId || details && details.spotifyArtist) {
    try {
      let spotifyArtist;
      if (details && details.spotifyArtist) {
        console.log("using preloaded artist data");
        spotifyArtist = details.spotifyArtist;
      }
      else {
        console.log("loading artist data from spotify by id");

        const spotifyAPI = await getSpotifyAPI();
        const response = await spotifyApi.getArtist(ids.spotifyId);
        spotifyArtist = response.body;
      }

      artist = {
        name: spotifyArtist.name,
        spotifyId: spotifyArtist.id,
      };
      if (spotifyArtist.images && spotifyArtist.images.length) {
        // default images sizes seem to be 640, 300, and 64, in that order.
        artist.imageURLs = {};
        for (let image of spotifyArtist.images) {
          if (image.height == 640) {
            artist.imageURLs.large = image.url;
          } else if (image.height == 320) {
            artist.imageURLs.medium = image.url;
          } else if (image.height == 160) {
            artist.imageURLs.small = image.url;
          }
        }
      }
      const id = Artist.insert(artist);
      return Artist.findOne(id);
    }
    catch (err) {
      console.error("Error retrieving artist info from Spotify:", err);
      throw "Error retrieving artist info from Spotify."
    }
  }
}


/**
 * @summary Get/create an Album. Either by ids or by artist (ids) and name.
 * @param {Object} ids One or more id fields, such as _id or spotifyId. May be empty.
 * @param {Object} details Album details including {artistIds (internal), name},
    or a full album description from a music service, eg {spotifyAlbum}. May be empty.
 */
const getAlbum = async (ids, details) => {
  let album = ids && Object.keys(ids).length && Album.findOne(ids);
  if (!!album) return album;

  if (ids.spotifyId || details && (details.artistIds && details.name || details.spotifyAlbum)) {
    try {
      const spotifyAPI = await getSpotifyAPI();

      let spotifyAlbum;
      if (details.spotifyAlbum) {
        console.log("using preloaded album data");
        spotifyAlbum = details.spotifyAlbum;
      }
      else if (ids.spotifyId) {
        console.log("loading album data from spotify by id");

        const { body } = await spotifyApi.getAlbum(ids.spotifyId);
        spotifyAlbum = body;
      }
      else {
        console.log("searching for album data from spotify");

        // Get (first/one of the) artists spotify id.
        let artistSpotifyId;
        for (let i = 0; i < details.artistIds.length && !artistSpotifyId; i++)
          artistSpotifyId = Artist.findOne(aid).spotifyId;

        if (artistSpotifyId) {
          // TODO replace with search when not broken for albums https://github.com/thelinmichael/spotify-web-api-node/issues/178
          for (let albumType of ['album', 'compilation', 'appears_on', 'single']) {
            const { body } = await spotifyApi.getArtistAlbums(artistSpotifyId, {album_type: albumType, limit:50});
            // Only consider exact (but case insensitive) match against album name.
            const nameLC = details.name.toLowerCase();
            spotifyAlbum = body.items.find(album => album.name.toLowerCase() == nameLC);
            if (spotifyAlbum) {
              break;
            }
          }
        }
      }

      if (spotifyAlbum) {
        album = {
          name: spotifyAlbum.name,
          spotifyId: spotifyAlbum.id,
          artistIds: (await Promise.all(spotifyAlbum.artists.map(async (sa) => {
            let artist = await getArtist({spotifyId: sa.id});
            return artist ? artist._id : null;
          }))).filter(id=>!!id),
        };
        if (spotifyAlbum.images && spotifyAlbum.images.length) {
          album.imageURLs = {};
          for (let image of spotifyAlbum.images) {
            if (image.height == 640) {
              album.imageURLs.large = image.url;
            } else if (image.height == 300) {
              album.imageURLs.medium = image.url;
            } else if (image.height == 64) {
              album.imageURLs.small = image.url;
            }
          }
        }
        const id = Album.insert(album);
        return Album.findOne(id);
      }
    }
    catch (err) {
      console.error("Error retrieving album info from Spotify:", err);
      throw "Error retrieving album info from Spotify."
    }
  }
}


/**
 * @summary Get/create a Track. Either by ids or with the given track details.
 * @param {Object} ids One or more id fields, such as _id or spotifyId. May be empty.
 * @param {Object} details Basic track details {trackName, artistNames (array), albumName, duration},
    or a full track description from a music service, eg {spotifyTrack}. May be empty.
 * TODO Handle adding tracks (and associated artists and album) when can't find on Spotify.
 */
const getTrack = async (ids, details) => {
  // First see if we already have this track in our DB.
  let track = ids && Object.keys(ids).length && Track.findOne(ids);
  if (!!track) return track;

  // If this is a spotify track or we can search for it on spotify.
  if (ids.spotifyId || details.spotifyTrack || details.trackName && details.artistNames && details.albumName && details.duration) {
    try {
      const spotifyAPI = await getSpotifyAPI();
      let spotifyTrack;

      if (details.spotifyTrack) {
        console.log("using preloaded spotify track data");
        spotifyTrack = details.spotifyTrack;
      }
      else if (ids.spotifyId) {
        console.log("loading track data from spotify by id");
        const { body } = await spotifyApi.getTrack(ids.spotifyId);
        spotifyTrack = body;
      }
      else {
        console.log("searching for track data from spotify", ids, details);
        const query = `track:"${normalise(details.trackName)}" artist:"${normalise(details.artistNames[0])}" album:"${normalise(details.albumName)}"`;
        const { body } = await spotifyApi.search(query, ['track'], { limit: 50 });

        // See if any results match across track name, (first) artist name,
        // album name and are within 1 second duration.
        spotifyTrack = body.tracks.items.find(track => {
          return normaliseMatch(track.name, details.trackName) &&
                  normaliseMatch(track.album.name, details.albumName) &&
                  track.artists.find(artist => normaliseMatch(artist.name, details.artistNames[0])) &&
                  (Math.abs(track.duration_ms / 1000 - details.duration) < 1);
        });
      }

      if (spotifyTrack) {
        const track = {
          name: spotifyTrack.name,
          artistIds: (await Promise.all(spotifyTrack.artists.map(async (sa) => {
            let artist = await getArtist({spotifyId: sa.id});
            return artist ? artist._id : null;
          }))).filter(id=>!!id),
          albumId: (await getAlbum({spotifyId: spotifyTrack.album.id}))._id,
          duration: spotifyTrack.duration_ms / 1000,
          spotifyId: spotifyTrack.id,
        };

        // TODO a lot of spotify tracks don't seem to have audio features?
        // TODO should run this as a background job.
        // try {
        //   const featuresResult = await spotifyApi.getAudioFeaturesForTrack(spotifyTrack.id);
        //   console.log(featuresResult);
        //   if (featuresResult.body.id) {
        //     track.features = featuresResult.body;
        //   }
        // }
        // catch (err) {
        //   console.warn("Could not retrieve audio features for " + spotifyTrack.id);
        // }

        const id = Track.insert(track);
        return Track.findOne(id);
      }
      else {
        // TODO Add track, but need to determine artist, which almost
        // certainly will be on Spotify and so should be linked, but how to
        // reliably unambiguously determine artist? Many artists have same name.
        // Can't use album to disambiguate otherwise we would have found the
        // track in the above spotify search. A few possibilities:
        // - search for artist name on spotify and if only one result then it's probably the right one.
        // - search spotify by track and artist name, if we find a result where both names match exactly it's probably the right artist (but not track because different album)
        // - add every matching artist from spotify and mark the track as needing review.
        // - integrate other services so we can check them.

        // Also need to/should add album, similar issues as above but
        // potentially even worse (how many "best of" albums are there...)
      }
    }
    catch (err) {
      console.error("Error retrieving track info from Spotify:", err);
      throw "Error retrieving track info from Spotify."
    }
  }
}


/**
 * @summary Get/create a TrackList.
 * @param {Object} ids One or more id fields, such as _id or spotifyUserId and spotifyListId.
 * @param {Object} insertMetadata If inserting the TrackList, additional metadata to add.
 */
const getTrackList = async (ids, insertMetadata) => {
  let list = ids && Object.keys(ids).length && TrackList.findOne(ids);
  let tracksNotFound = [];

  console.log('getTrackList', ids);

  if (!list) {
    if (ids.spotifyListId) {
      try {
        let spotifyAPI = await getSpotifyAPI();
        let response = await spotifyApi.getPlaylist(ids.spotifyUserId, ids.spotifyListId);

        //console.log(response.statusCode, response.headers);

        const listDetails = response.body;

        response = await spotifyApi.getPlaylistTracks(ids.spotifyUserId, ids.spotifyListId);
        const listTracks = response.body.items;

        const owner = await getCompiler({spotifyId: listDetails.owner.id});
        const compilerIds = [owner._id];


        // First get all the artists and albums for all tracks in one spotify request
        // per type. Avoids requesting many single artists and albums during track loading.
        let artistSpotifyIds = [];
        let albumSpotifyIds = [];
        // Collate ids.
        for (spotifyTrack of listTracks) {
          if (!spotifyTrack.track.id) continue; // If not a spotify track.
          for (artist of spotifyTrack.track.artists) artistSpotifyIds.push(artist.id);
          for (artist of spotifyTrack.track.album.artists) artistSpotifyIds.push(artist.id);
          albumSpotifyIds.push(spotifyTrack.track.album.id);
        }
        // Remove duplicates.
        artistSpotifyIds = [ ...new Set(artistSpotifyIds) ];
        albumSpotifyIds = [ ...new Set(albumSpotifyIds) ];
        // Filter out those for which we already have a record.
        artistSpotifyIds = artistSpotifyIds.filter(spotifyId => !Artist.findOne({spotifyId}));
        albumSpotifyIds = albumSpotifyIds.filter(spotifyId => !Album.findOne({spotifyId}))

        // Limit of 50 artists per request.
        while (artistSpotifyIds.length) {
          response = await spotifyApi.getArtists(artistSpotifyIds.splice(0, 50));
          for (artist of response.body.artists) {
            await getArtist(
              {spotifyId: artist.id},
              {spotifyArtist: artist}
            );
          }
        }

        // Limit of 20 albums per request.
        while (albumSpotifyIds.length) {
          response = await spotifyApi.getAlbums(albumSpotifyIds.splice(0, 20));
          for (album of response.body.albums) {
            await getAlbum(
              {spotifyId: album.id},
              {spotifyAlbum: album}
            );
          }
        }

        // Then create track documents.
        const trackIds = [];
        let duration = 0;
        for (let spotifyTrack of listTracks) {
          if (spotifyTrack.added_by && spotifyTrack.added_by.id != owner.spotifyId) {
            let comp = await getCompiler({spotifyId: spotifyTrack.added_by.id});
            // We remove duplicates below, don't worry about it here.
            if (comp) compilerIds.push(comp._id);
          }

          let track;
          if (spotifyTrack.track.id) {
            track = await getTrack({spotifyId: spotifyTrack.track.id}, {spotifyTrack: spotifyTrack.track});
          }
          else {
            // For local (non-spotify) tracks.
            track = await getTrack(
              {},
              {
                trackName: spotifyTrack.track.name,
                artistNames:  spotifyTrack.track.artists.map(a=>a.name),
                albumName: spotifyTrack.track.album.name,
                duration: spotifyTrack.track.duration_ms / 1000,
              });
          }

          if (track) {
            trackIds.push(track._id);
            duration += track.duration;
          }
          else {
            tracksNotFound.push({
              name: spotifyTrack.track.name,
              artists: spotifyTrack.track.artists.map(a=>a.name),
              album: spotifyTrack.track.album.name,
            });
          }
        }

        insertMetadata = insertMetadata || {};

        // Get all compilerIds, with duplicates removed.
        const allCompilerIds = insertMetadata.compilerIds ? insertMetadata.compilerIds.concat(compilerIds) : compilerIds;
        insertMetadata.compilerIds = [ ...new Set(allCompilerIds) ]
        if (!insertMetadata.name) insertMetadata.name = listDetails.name;

        const id = TrackList.insert({
          trackIds,
          duration,
          spotifyUserId: listDetails.owner.id,
          spotifyListId: listDetails.id,
          ...insertMetadata,
        });
        list = TrackList.findOne(id);
      }
      catch (err) {
        const message = "Error retrieving list info from Spotify.";
        console.error(message, err);
        throw message;
      }
    }
  }

  return { list, tracksNotFound };
}


export { getSpotifyAPI, getCompiler, getArtist, getAlbum, getTrack, getTrackList };
