import { Meteor } from 'meteor/meteor';
import { Random } from 'meteor/random';
import SpotifyWebApi from 'spotify-web-api-node';
import _ from 'lodash';

import { normaliseString, normaliseStringMatch } from '../../util';
import MusicService from './music_service_class';
import Compiler from '../../../api/Compiler/Compiler';
import Artist from '../../../api/Artist/Artist';
import Album from '../../../api/Album/Album';
import PlayList from '../../../api/PlayList/PlayList';
import Track from '/imports/api/Track/Track';


/**
 * Functions to import items from spotify.
 * @see MusicService
 */
export default class Spotify extends MusicService {
  constructor() {
    super("Spotify", "spotify", "https://spotify.com");
  }

  /**
   * @see MusicService
   */
  importFromURL(type, url, insertMetadata) {
    const urlRE = /^.*spotify\.com\/([a-zA-Z]+)\/(\w+)(?:\/playlist\/(\w+))?\s*$/i;
    //https://open.spotify.com/track/6GElvNcpLw9RSAov7lQeGm
    //https://open.spotify.com/user/1270621250
    //https://open.spotify.com/user/1270621250/playlist/7pLbIUXjN2ttj64BSi0bwB
    //https://open.spotify.com/artist/0auxGqduSBWubpKjjSNKLr
    //https://open.spotify.com/album/5tE3xEb1F7BO7MZ2uGIYZe

    const matches = url.match(urlRE);
    if (!matches) throw "Malformed Spotify URL: " + url;
    let [ , urlType, id1, id2] = matches;
    if (urlType == 'user' && id2) urlType = 'playlist';
    if (type != urlType) throw `Invalid Spotify URL for importing ${type}: ${url}`;
    const ids = type != 'playlist' ? { spotifyId: id1 } : { spotifyUserId: id1, spotifyId: id2 };
    return this.importFromIds(type, ids, insertMetadata);
  }

  /**
   * @see MusicService
   */
  importFromIds(type, ids, insertMetadata) {
    switch (type) {
      case 'user':      return getCompiler(ids, insertMetadata);
      case 'artist':    return getArtist(ids, null, insertMetadata);
      case 'album':     return getAlbum(ids, null, insertMetadata);
      case 'track':     return getTrack(ids, null, insertMetadata);
      case 'playlist':  return getPlayList(ids, insertMetadata);
    }
    throw "Unrecognised music item type: " + type;
  }

  /**
   * @see MusicService
   */
  importFromSearch(type, names) {
    throw `Match from names not supported by ${this.name}.`;
  }
}


const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});


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


/**
 * @summary Get/create a Compiler (for a track list).
 * @param {Object} ids - 'spotifyId' is the only accepted id field.
 */
const getCompiler = async (ids, insertMetadata) => {
  insertMetadata = insertMetadata || {};
  let compiler = ids && Object.keys(ids).length && Compiler.findOne(ids);
  if (!!compiler) return compiler;

  if (ids.spotifyId) {
    //console.log("loading compiler data from spotify by id");
    try {
      const spotifyAPI = await getSpotifyAPI();
      const { body } = await spotifyApi.getUser(ids.spotifyId);
      compiler = {
        name: body.display_name ? body.display_name : "spotify:" + body.id,
        spotifyId: body.id,
        ...insertMetadata,
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
const getArtist = async (ids, details, insertMetadata) => {
  insertMetadata = insertMetadata || {};
  let artist = ids && Object.keys(ids).length && Artist.findOne(ids)
  if (!!artist) return artist;

  if (ids.spotifyId || details && details.spotifyArtist) {
    try {
      let spotifyArtist;
      if (details && details.spotifyArtist) {
        //console.log("using preloaded artist data");
        spotifyArtist = details.spotifyArtist;
      }
      else {
        //console.log("loading artist data from spotify by id");
        const spotifyAPI = await getSpotifyAPI();
        const response = await spotifyApi.getArtist(ids.spotifyId);
        spotifyArtist = response.body;
      }

      artist = {
        name: spotifyArtist.name,
        spotifyId: spotifyArtist.id,
        ...insertMetadata,
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
 * @param {Object} details Album details including {artistIds (internal), albumName},
    or a full album description from a music service, eg {spotifyAlbum}. May be empty.
 */
const getAlbum = async (ids, details, insertMetadata) => {
  insertMetadata = insertMetadata || {};
  let album = ids && Object.keys(ids).length && Album.findOne(ids);
  if (!!album) return album;

  if (ids.spotifyId || details && (details.artistIds && details.albumName || details.spotifyAlbum)) {
    try {
      const spotifyAPI = await getSpotifyAPI();

      let spotifyAlbum;
      if (details.spotifyAlbum) {
        //console.log("using preloaded album data");
        spotifyAlbum = details.spotifyAlbum;
      }
      else if (ids.spotifyId) {
        //console.log("loading album data from spotify by id");
        const { body } = await spotifyApi.getAlbum(ids.spotifyId);
        spotifyAlbum = body;
      }
      else {
        //console.log("searching for album data from spotify", details);
        // Get (first/one of the) artists spotify id.
        const artist = details.artistIds.find(aid => !!Artist.findOne(aid).spotifyId);
        const artistSpotifyId = artist ? artist.spotifyId : null;

        if (artistSpotifyId) {
          // TODO replace with search when not broken for albums https://github.com/thelinmichael/spotify-web-api-node/issues/178
          for (let albumType of ['album', 'compilation', 'appears_on', 'single']) {
            const { body } = await spotifyApi.getArtistAlbums(artistSpotifyId, {album_type: albumType, limit:50});
            // Only consider exact (but case insensitive) match against album name.
            const nameLC = details.albumName.toLowerCase();
            spotifyAlbum = body.items.find(album => album.name.toLowerCase() == nameLC);
            if (spotifyAlbum) {
              break;
            }
          }
        }
      }

      if (spotifyAlbum) {
        // Collate list of artists.
        const artists = (await Promise.all(
          spotifyAlbum.artists.map(sa => getArtist({spotifyId: sa.id}))
        )).filter(artist => !!artist);

        const existingAlbums = Album.findByName(spotifyAlbum.name, artists);
        let album;
        if (existingAlbums.length == 1) {
          album = existingAlbums[0];
        }
        else {
          album = {
            name: spotifyAlbum.name,
            artistIds: artists.map(a => a._id),
            ...insertMetadata,
          };
        }
        album.spotifyId = spotifyAlbum.id;

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

        if (existingAlbums.length == 1) {
          Album.update(album._id, {$set: album});
          return album;
        }
        else {
          const id = Album.insert(album);
          return Album.findOne(id);
        }
      }
    }
    catch (err) {
      console.error("Error retrieving album info from Spotify:", err);
      throw "Error retrieving album info from Spotify."
    }
  }

  // If we get to to here the album wasn't found on Spotify.
  if (details.albumName) {
    artistIds = details.artistIds || [];

    // See if we already have an album with same name and artists.
    const existingAlbums = Album.findByName(details.albumName, artistIds);
    if (existingAlbums.length) return existingAlbums[0];

    const id = Album.insert({
      name: details.albumName,
      artistIds: artistIds,
      ...insertMetadata,
    });
    return Album.findOne(id);
  }
}


/**
 * @summary Get/create a Track. Either by ids or with the given track details.
 * @param {Object} ids One or more id fields, such as _id or spotifyId. May be empty.
 * @param {Object} details Basic track details {'trackName', 'artistNames' (array), 'albumName', 'duration'},
    or a full track description from a music service, eg {'spotifyTrack'}. May be empty.
 * TODO Handle adding tracks (and associated artists and album) when can't find on Spotify.
 */
const getTrack = async (ids, details, insertMetadata) => {
  insertMetadata = insertMetadata || {};
  // First see if we already have this track in our DB.
  let track = ids && Object.keys(ids).length && Track.findOne(ids);
  if (!!track) return track;

  // If this is a spotify track or we can search for it on spotify.
  if (ids.spotifyId || details.spotifyTrack || details.trackName && details.artistNames && details.albumName && details.duration) {
    try {
      const spotifyAPI = await getSpotifyAPI();
      let spotifyTrack;

      if (details.spotifyTrack) {
        //console.log("using preloaded spotify track data");
        spotifyTrack = details.spotifyTrack;
      }
      else if (ids.spotifyId) {
        //console.log("loading track data from spotify by id");
        const { body } = await spotifyApi.getTrack(ids.spotifyId);
        spotifyTrack = body;
      }
      else {
        //console.log("searching for track data from spotify", ids, details);
        const query = `track:"${normaliseString(details.trackName)}" artist:"${normaliseString(details.artistNames[0])}" album:"${normaliseString(details.albumName)}"`;
        const { body } = await spotifyApi.search(query, ['track'], { limit: 50 });

        // See if any results match across track name, (first) artist name,
        // album name and are within 1 second duration.
        spotifyTrack = body.tracks.items.find(track => {
          return normaliseStringMatch(track.name, details.trackName) &&
                  normaliseStringMatch(track.album.name, details.albumName) &&
                  track.artists.find(artist => normaliseStringMatch(artist.name, details.artistNames[0])) &&
                  (Math.abs(track.duration_ms / 1000 - details.duration) < 1);
        });
      }

      if (spotifyTrack) {
        const spotifyArtistIds = spotifyTrack.artists.map(sa => sa.id);
        await ensureArtistsBySpotifyId(spotifyArtistIds);
        const artists = Artist.find({spotifyId: {$in: spotifyArtistIds}});
        const album = await getAlbum({spotifyId: spotifyTrack.album.id});
        const existingTracks = Track.findByName(spotifyTrack.name, artists, album);

        if (existingTracks.length == 1) {
          Track.update(existingTracks[0]._id, {$set: {spotifyId: spotifyTrack.id}});
          return Track.findOne(existingTracks[0]._id);
        }
        else {
          const trackId = Track.insert({
            name: spotifyTrack.name,
            artistIds: artists.map(artist => artist._id),
            albumId: album._id,
            duration: spotifyTrack.duration_ms / 1000,
            spotifyId: spotifyTrack.id,
            ...insertMetadata,
          });
          return Track.findOne(trackId);
        }

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
      }
    }
    catch (err) {
      console.error("Error retrieving track info from Spotify:", err);
      throw "Error retrieving track info from Spotify."
    }
  }

  // We didn't find it in Spotify...
  if (details.trackName && details.artistNames && details.albumName) {
    // ...if we can find a name match in DB return that.
    let existingTracks = Track.findByName(details.trackName, details.artistNames, details.albumName);
    if (existingTracks.length) return existingTracks[0];

    // We can't find an exact match for the track+artist+album. We need to determine artists,
    // which almost certainly will be on Spotify and so should be linked to, but we need to
    // reliably unambiguously determine the artists. Many artists have same name. We can't use
    // album to disambiguate otherwise we would have found the track in the above spotify search.

    const spotifyArtistIds = [];
    for (artistName of details.artistNames) {
      // First search by track and artist name,
      // if we find a result where both names match exactly it's probably the right artist.
      let response = await spotifyApi.search(`track:"${normaliseString(details.trackName)}" artist:"${normaliseString(artistName)}"`, ['track']);
      let spotTrack = response.body.tracks.items.find(st =>
        normaliseStringMatch(details.trackName, st.name) &&
        st.artists.find(sta => normaliseStringMatch(artistName, sta.name)));
      if (spotTrack) {
        spotifyArtistIds.push(spotTrack.artists.find(ta => normaliseStringMatch(artistName, ta.name)).id);
        continue;
      }

      // Otherwise just add every matching artist from spotify, a human will have to disambiguate.
      response = await spotifyApi.search(`artist:"${normaliseString(artistName)}"`, ['artist']);
      let filteredArtists = response.body.artists.items.filter(artist => normaliseStringMatch(artistName, artist.name));
      for (spotArtist of filteredArtists) {
        spotifyArtistIds.push(spotArtist.id);
      }
    }
    await ensureArtistsBySpotifyId(spotifyArtistIds);
    const artists = Artist.find({spotifyId: {$in: spotifyArtistIds}});
    const artistIds = artists.map(artist => artist._id);

    const album = await getAlbum({},
      {
        albumName: details.albumName,
        artistIds,
      }, {
        // This isn't necessarily a complete list of artists for this album.
        dataMaybeMissing: ['artistIds'],
      });

    const dataMaybeMissing = ['artistIds'];
    if (!details.duration) dataMaybeMissing.push('duration');
    if (!album) dataMaybeMissing.push('albumId');

    const track = {
      name: details.trackName,
      artistIds,
      duration: details.duration,
      dataMaybeMissing,
    };
    if (album) track.albumId = album._id;

    const id = Track.insert(track);
    return Track.findOne(id);
  }
}


/**
 * @summary Get/create a PlayList.
 * @param {Object} ids One or more id fields, such as _id or spotifyUserId and spotifyId.
 * @param {Object} insertMetadata If inserting the PlayList, additional metadata to add.
 */
const getPlayList = async (ids, insertMetadata) => {
  insertMetadata = insertMetadata || {};
  let list = ids && Object.keys(ids).length && PlayList.findOne(ids);
  if (list) return list;

  if (ids.spotifyId) {
    try {
      let spotifyAPI = await getSpotifyAPI();
      let response = await spotifyApi.getPlaylist(ids.spotifyUserId, ids.spotifyId);

      const listDetails = response.body;

      response = await spotifyApi.getPlaylistTracks(ids.spotifyUserId, ids.spotifyId);
      const listTracks = response.body.items;

      const owner = await getCompiler({spotifyId: listDetails.owner.id});
      const compilerIds = [owner._id];

      // First get all the artists and albums for all tracks.
      // Avoids requesting many single artists and albums during track import.
      let artistSpotifyIds = [];
      let albumSpotifyIds = [];
      // Collate ids.
      for (spotifyTrack of listTracks) {
        if (!spotifyTrack.track.id) continue; // If not a spotify track.
        for (artist of spotifyTrack.track.artists) artistSpotifyIds.push(artist.id);
        for (artist of spotifyTrack.track.album.artists) artistSpotifyIds.push(artist.id);
        albumSpotifyIds.push(spotifyTrack.track.album.id);
      }
      await ensureArtistsBySpotifyId(artistSpotifyIds);
      await ensureAlbumsBySpotifyId(albumSpotifyIds);

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

        trackIds.push(track._id);
        duration += track.duration;
      }

      insertMetadata = insertMetadata || {};

      // Get all compilerIds, with duplicates removed.
      const allCompilerIds = insertMetadata.compilerIds ? insertMetadata.compilerIds.concat(compilerIds) : compilerIds;
      insertMetadata.compilerIds = [ ...new Set(allCompilerIds) ]
      if (!insertMetadata.name) insertMetadata.name = listDetails.name;

      const tl = {
        ...insertMetadata,
        trackIds,
        duration,
        spotifyUserId: listDetails.owner.id,
        spotifyId: listDetails.id,
      };

      const id = PlayList.insert(tl);

      return PlayList.findOne(id);
    }
    catch (err) {
      const message = "Error retrieving list info from Spotify.";
      console.error(message, err);
      throw message;
    }
  }
}


// Utility method to ensure we have records for the given spotify artist IDs.
// Uses minimum number of Spotify API requests.
const ensureArtistsBySpotifyId = async (spotifyArtistIds) => {
  // Remove duplicates.
  spotifyArtistIds = [ ...new Set(spotifyArtistIds) ];
  // Filter out those for which we already have a record.
  spotifyArtistIds = spotifyArtistIds.filter(spotifyId => !Artist.findOne({spotifyId}));
  // Get artist records from Spotify, respecting limit of 50 per request.
  while (spotifyArtistIds.length) {
    response = await spotifyApi.getArtists(spotifyArtistIds.splice(0, 50));
    for (artist of response.body.artists) {
      await getArtist(
        {spotifyId: artist.id},
        {spotifyArtist: artist}
      );
    }
  }
}

// Utility method to ensure we have records for the given spotify album IDs.
// Uses minimum number of Spotify API requests.
const ensureAlbumsBySpotifyId = async (spotifyAlbumIds) => {
  // Remove duplicates.
  spotifyAlbumIds = [ ...new Set(spotifyAlbumIds) ];
  // Filter out those for which we already have a record.
  spotifyAlbumIds = spotifyAlbumIds.filter(spotifyId => !Album.findOne({spotifyId}));
  // Get album records from Spotify, respecting limit of 50 per request.
  while (spotifyAlbumIds.length) {
    response = await spotifyApi.getAlbums(spotifyAlbumIds.splice(0, 20));
    for (album of response.body.albums) {
      await getAlbum(
        {spotifyId: album.id},
        {spotifyAlbum: album}
      );
    }
  }
};
