import { Meteor } from 'meteor/meteor';
import SpotifyWebApi from 'spotify-web-api-node';
import Compiler from '../../api/Compiler/Compiler';
import Artist from '../../api/Artist/Artist';
import Album from '../../api/Album/Album';
import TrackList from '../../api/TrackList/TrackList';
import Track from '../../api/Track/Track';

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

      Meteor.defer(() => spotifyApi.resetAccessToken(), data.body['expires_in'] * 1000);

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
    try {
      const spotifyAPI = await getSpotifyAPI();
      const { body } = await spotifyApi.getUser(ids.spotifyId);
      compiler = {
        name: body.display_name ? body.display_name : "spotify:" + body.id,
        spotifyId: body.id,
      };
      if (body.images && body.images.length) {
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
 */
const getArtist = async (ids) => {
  let artist = ids && Object.keys(ids).length && Artist.findOne(ids)
  if (!!artist) return artist;

  if (ids.spotifyId) {
    try {
      const spotifyAPI = await getSpotifyAPI();
      const { body } = await spotifyApi.getArtist(ids.spotifyId);
      artist = {
        name: body.name,
        spotifyId: body.id,
      };
      if (body.images && body.images.length) {
        artist.imageURL = body.images[0].url;
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
 * @param {Array} artistIds One or more artist Ids (native/internal _id only). Optional.
 * @param {String} name Album name. Optional.
 */
const getAlbum = async (ids, artistIds, name) => {
  let album = ids && Object.keys(ids).length && Album.findOne(ids);
  if (!!album) return album;

  if (ids.spotifyId || artistIds && name) {
    try {
      const spotifyAPI = await getSpotifyAPI();

      let spotifyAlbum;
      if (ids.spotifyId) {
        const { body } = await spotifyApi.getAlbum(ids.spotifyId);
        spotifyAlbum = body;
      }
      else {
        // Get (first/one of the) artists spotify id.
        let artistSpotifyId;
        for (let i = 0; i < artistIds.length && !artistSpotifyId; i++)
          artistSpotifyId = Artist.findOne(aid).spotifyId;

        if (artistSpotifyId) {
          // TODO replace with search when not broken for albums https://github.com/thelinmichael/spotify-web-api-node/issues/178
          for (let albumType of ['album', 'compilation', 'appears_on', 'single']) {
            const { body } = await spotifyApi.getArtistAlbums(artistSpotifyId, {album_type: albumType, limit:50});
            // Only consider exact (but case insensitive) match against album name.
            const nameLC = name.toLowerCase();
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
          album.imageURL = spotifyAlbum.images[0].url;
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
 * @param {Object} details Track details {trackName, artistNames (array), albumName, duration}. May be empty.
 * TODO Handle adding tracks (and associated artists and album) when can't find on Spotify.
 */
const getTrack = async (ids, details) => {
  let track = ids && Object.keys(ids).length && Track.findOne(ids);
  if (!!track) return track;

  if (ids.spotifyId || details.trackName && details.artistNames && details.albumName && details.duration) {
    try {
      const spotifyAPI = await getSpotifyAPI();
      let spotifyTrack;

      if (ids.spotifyId) {
        const { body } = await spotifyApi.getTrack(ids.spotifyId);
        spotifyTrack = body;
      }
      else {
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

        try {
          const featuresResult = await spotifyApi.getAudioFeaturesForTrack(spotifyTrack.id);
          console.log(featuresResult);
          if (featuresResult.body.id) {
            track.features = featuresResult.body;
          }
        }
        catch (err) {
          console.warn("Could not retrieve audio features for " + spotifyTrack.id);
        }

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
  if (!!list) return { list, tracksNotFound };

  if (ids.spotifyListId) {
    try {
      const spotifyAPI = await getSpotifyAPI();
      const { body } = await spotifyApi.getPlaylist(ids.spotifyUserId, ids.spotifyListId);

      const owner = await getCompiler({spotifyId: body.owner.id});
      const compilerIds = [owner._id];

      const trackIds = [];
      let duration = 0;
      for (let spotifyTrack of body.tracks.items) {
        if (spotifyTrack.added_by && spotifyTrack.added_by.id != owner.spotifyId) {
          let comp = await getCompiler({spotifyId: spotifyTrack.added_by.id});
          if (comp) compilerIds.push(comp._id);
        }

        let track = await getTrack({
          spotifyId: spotifyTrack.track.id,
        }, {
          // For local tracks.
          trackName: spotifyTrack.track.name,
          artistNames:  spotifyTrack.track.artists.map(a=>a.name),
          albumName: spotifyTrack.track.album.name,
          duration: spotifyTrack.track.duration_ms / 1000,
        });

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

      const id = TrackList.insert({
        compilerIds,
        trackIds,
        duration,
        spotifyUserId: body.owner.id,
        spotifyListId: body.id,
        ...insertMetadata,
      });
      list = TrackList.findOne(id);
    }
    catch (err) {
      console.error("Error retrieving list info from Spotify:", err);
      throw "Error retrieving list info from Spotify."
    }
  }

  return { list, tracksNotFound };
}


export { getSpotifyAPI, getCompiler, getArtist, getAlbum, getTrack, getTrackList };
