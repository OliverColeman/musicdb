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


// TODO REMOVE market specification in searches when this is resolved: https://github.com/spotify/web-api/issues/813


const durationMatchMargin = 4;


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
  async importFromSearch(type, names) {
    switch (type) {
      // TODO should be returning multiple but this isn't actually used at the moment.
      case 'album': return getAlbum(null, names);

      case 'track':
        //console.log(" s search");
        let query = `track:"${normaliseString(names.trackName)}"`;
        if (names.artistNames && names.artistNames.length) {
          query += ` artist:"${normaliseString(names.artistNames[0])}"`;
        }
        if (names.albumName) {
          query += ` album:"${normaliseString(names.albumName)}"`;
        }
        const spotifyAPI = await getSpotifyAPI();
        //console.log("s" + query);
        const response = await spotifyAPI.search(query, ['track'], {market: 'AU', limit: 50});

        //console.log("s found " + response.body.tracks.items.length);

        const tracks = [];
        for (let spotifyTrack of response.body.tracks.items) {
          tracks.push(await getTrack({spotifyId: spotifyTrack.id}, {spotifyTrack}));
        }
        //console.log("s imported " + tracks.length);
        return tracks;

    }
    throw "Unsupported music item type: " + type;
  }

  /**
   * @see MusicService
   */
  linkToService(type, item) {
    switch (type) {
      case 'album':
        return getAlbum({_id: item._id}, {
          albumName: item.name,
          artistIds: item.artistIds,
        });
      case 'track':
        //console.log("link ", item);
        // All spotify tracks have an album, don't search on spotify if no album defined.
        if (!item.albumId) return null;
        const details = {
          trackName: item.name,
          artistNames: Artist.find({_id: {$in: item.artistIds}}).fetch().map(a => a.name),
          albumName: Album.findOne(item.albumId).name,
          duration: item.duration,
        };
        //console.log("details ", details);

        return getTrack({_id: item._id}, details);
    }
    throw "Unsupported music item type: " + type;
  }
}


const spotifyAPIGlobal = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
});


/**
 * @summary Get a spotify web API object from spotify-web-api-node package.
 */
const getSpotifyAPI = async () => {
  // Get/refresh access token if necessary.
  if (!spotifyAPIGlobal.getAccessToken()) {
    try {
      let data = await spotifyAPIGlobal.clientCredentialsGrant();

      // Reset the stored access token when it expires.
      Meteor.setTimeout(
        () => {
          //console.log("Resetting Spotify access token.");
          spotifyAPIGlobal.resetAccessToken();
        },
        data.body['expires_in'] * 1000
      );

      spotifyAPIGlobal.setAccessToken(data.body['access_token']);
    }
    catch (err) {
      console.error("Error retrieving Spotify access token:", err);
      throw "Error retrieving Spotify access token.";
    }
  }

  return spotifyAPIGlobal;
}


/**
 * @summary Get/create a Compiler (for a track list).
 * @param {Object} ids - An id field, such as _id or spotifyId.
 */
const getCompiler = async (ids, insertMetadata) => {
  ids = ids || {};
  insertMetadata = insertMetadata || {};

  let compiler = ids && Object.keys(ids).length && Compiler.findOne(ids);
  if (!!compiler) return compiler;

  if (ids.spotifyId) {
    //console.log("loading compiler data from spotify by id");
    try {
      const spotifyAPI = await getSpotifyAPI();
      const { body } = await spotifyAPI.getUser(ids.spotifyId);
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
 * @param {Object} ids An id field, such as _id or spotifyId.
 * @param {Object} details Artist details (not implemented yet, see TODO in getTrack),
    or a full artist description from a music service, eg {spotifyArtist}. May be empty.
 */
const getArtist = async (ids, details, insertMetadata) => {
  ids = ids || {};
  details = details || {};
  insertMetadata = insertMetadata || {};

  let spotifyArtist = details.spotifyArtist || null;
  let spotifyId = ids.spotifyId || spotifyArtist && spotifyArtist.id;
  let artist = ids && Object.keys(ids).length && Artist.findOne(ids)

  if (spotifyId && (!artist || !artist.spotifyId)) {
    try {
      if (!spotifyArtist || !spotifyArtist.images) {
        //console.log("loading artist data from spotify by id");
        const spotifyAPI = await getSpotifyAPI();
        const response = await spotifyAPI.getArtist(spotifyId);
        spotifyArtist = response.body;
      }

      if (artist) {
        getImages(artist, spotifyArtist);
        Artist.update(artist._id,  {$set :{
          spotifyId,
          imageURLs: artist.imageURLs,
        }});
        return Artist.findOne(artist._id);
      }

      artist = {
        name: spotifyArtist.name,
        spotifyId,
        ...insertMetadata,
      };
      getImages(artist, spotifyArtist);
      const id = Artist.insert(artist);
      return Artist.findOne(id);
    }
    catch (err) {
      console.error("Error retrieving artist info from Spotify:", err);
      throw "Error retrieving artist info from Spotify."
    }
  }

  return artist;
}


/**
 * @summary Get/create an Album. Either by ids or by artist (ids) and name.
 * @param {Object} ids An id field, such as _id or spotifyId. May be empty.
 * @param {Object} details Album details including {albumName, artistIds (internal)
 *   or artistNames}, or a full album description {spotifyAlbum}. May be empty.
 */
const getAlbum = async (ids, details, insertMetadata) => {
  details = details || {};
  if ((details.albumName || details.artistIds || details.artistNames) &&
        (!details.albumName || !(details.artistIds || details.artistNames))) {
    console.error('sp', details);
    console.error("!details.trackName", !details.trackName)
    console.error("!!details.artistIds", !!details.artistIds)
    console.error("!!details.artistNames", !!details.artistNames)

    throw "Invalid arguments: if any one of 'albumName', 'artistIds', 'artistNames' is provided in the details argument then albumName and one of artistIds or artistNames must also be provided.";
  }

  ids = ids || {};
  insertMetadata = insertMetadata || {};

  let spotifyAlbum = details.spotifyAlbum || null;
  let spotifyId = ids.spotifyId || spotifyAlbum && spotifyAlbum.id;
  let spotifyArtists, spotifyArtist;
  let name, artist, artists;

  // First see if we already have this album in our DB...
  // ...by id
  let album = ids && Object.keys(ids).length && Album.findOne(ids);

  // ...or by matching from a spotifyAlbum object or names.
  if (!album && (spotifyAlbum || details.albumName)) {
    // Get artist and album document if possible, otherwise use names.
    if (spotifyAlbum) {
      name = spotifyAlbum.name;
      artist = spotifyAlbum.artists[0];
      artist = Album.findOne({spotifyId: artist.id}) || artist.name;
    }
    else {
      name = details.albumName;
      artist = details.artistNames ? details.artistNames[0] : Artist.findOne(details.artistIds[0]);
    }

    album = Album.findByName(name, artist).find(a=>!!a);
  }
  const spotifyAPI = await getSpotifyAPI();

  // If we haven't matched the album or we don't have an associated spotifyId for it.
  if (!album || !album.spotifyId) {
    // Make sure we have a Spotify album object, with images.
    if ((!spotifyAlbum || !spotifyAlbum.images) && (spotifyId || details.albumName)) {
      try {
        if (spotifyId || (spotifyAlbum && !spotifyAlbum.images)) {
          //console.log("loading album data from spotify by id");
          const { body } = await spotifyAPI.getAlbum(spotifyId);
          spotifyAlbum = body;
        }
        else {
          //console.log("searching for album data from spotify", details);
          // Get first artist name
          artist = details.artistNames ? normaliseString(details.artistNames[0]) : Artist.findOne(details.artistIds[0]).nameNormalised;
          const query = `artist:"${artist}" album:"${normaliseString(details.albumName)}"`;
          response = await spotifyAPI.search(query, ['album'], { market: 'AU' });

          // See if any results match across artist and album name.
          spotifyAlbum = response.body.albums.items.find(sa =>
            normaliseStringMatch(sa.name, details.albumName) &&
            album.artists.find(sa => normaliseString(sa.name) == artist)
          );
        }
      }
      catch (err) {
        console.error("Error retrieving album info from Spotify:", err);
        throw "Error retrieving album info from Spotify."
      }
    }

    if (spotifyAlbum) {
      spotifyId = spotifyAlbum.id;

      /////// If there's already a matching album object in the DB, update it. /////////
      if (album) {
        // Set the spotifyId (and images) for the album and associated artists as necessary.
        getImages(album, spotifyAlbum);
        Album.update(album._id, {$set: {
          spotifyId,
          imageURLs: album.imageURLs,
        }});

        spotifyArtists = spotifyAlbum.artists;
        for (artist of Artist.find({_id: {$in: album.artistIds}}).fetch()) {
          if (!artist.spotifyId) {
            // See if this artist appears in the artists listed for the recording on Spotify.
            spotifyArtist = spotifyArtists.find(sa => normaliseStringMatch(sa.name, artist.name));
            if (spotifyArtist) {
              await getArtist({_id: artist._id}, { spotifyArtist });
              spotifyArtists = spotifyArtists.filter(sa => sa.id != spotifyArtist.id);
            }
          }
          else {
            spotifyArtists = spotifyArtists.filter(sa => sa.id != artist.spotifyId);
          }
        }
        // Add remaining artists listed by Spotify that didn't appear in the album artist list.
        if (spotifyArtists.length) {
          let newArtists = [];
          for (let sa of spotifyArtists) {
            newArtists.push(await getArtist({spotifyId: sa.id}, {spotifyArtist: sa}));
          }

          if (album) {
            Album.update(album._id, {
              $push: {artistIds: { $each: newArtists.map(a => a._id)}},
              $set: {needsReview: true}
            });
          }
        }

        // Return the updated Album.
        return Album.findOne(album._id);
      }

      /////// We have a spotifyAlbum but no matching Album. Create the Album. ////////
      // Get Artists and Album.
      let spotifyArtistIds = spotifyAlbum.artists.map(sa => sa.id);
      await ensureArtistsBySpotifyId(spotifyArtistIds);
      artists = Artist.find({spotifyId: {$in: spotifyArtistIds}});

      // Create the Album.
      album = {
        name: spotifyAlbum.name,
        artistIds: artists.map(artist => artist._id),
        spotifyId: spotifyAlbum.id,
        ...insertMetadata,
      }

      getImages(album, spotifyAlbum);

      const albumId = Album.insert(album);
      return Album.findOne(albumId);
    }
  }

  //////// We could not find a matching Spotify album. ////////
  // If we found a matching Album in our DB just return it.
  if (album) return album;

  // Otherwise create an Album from details if given.
  if (details.albumName) {
    artistIds = details.artistIds || [];
    // TODO Add artists from names if artistIds not given?

    const id = Album.insert({
      name: details.albumName,
      artistIds,
      ...insertMetadata,
    });
    return Album.findOne(id);
  }
}


/**
 * @summary Get/create a Track. Either by ids or with the given track details.
 * @param {Object} ids One or more id fields, such as _id or spotifyId. May be empty.
 * @param {Object} details Basic track details {'trackName', 'artistNames' (array), 'albumName', 'duration'},
    or a full track description from Spotify {'spotifyTrack'}. May be empty.
 */
const getTrack = async (ids, details, insertMetadata) => {
  // We use the below logic to find and match up an Spotify track.
  //  Attempt to load an existing Track by given ids (either internal or Spotify id).
  //  If that fails attempt to load an existing Track by the track, artist and album names and track duration.
  //  If we couldn't find an existing track or it doesn't have an asssociated Spotify id:
  //    Load or search for the track/recording on Spotify (spotifyTrack).
  //    If it was found on Spotify:
  //      If we found an existing track in our DB then:
  //        Update it and its associated artists and album with their corresponding Spotify ids.
  //        Return the track.
  //      Else
  //        Create and return a new Track using the Spotify recording/track data.
  //    Else (it was not found on Spotify):
  //      If we found an existing track in our DB then:
  //        Return it.
  //      Else
  //        Create a new Track if the track, artist and album names and track duration were provided.

  details = details || {};
  if ((details.trackName || details.artistNames || details.albumName || details.duration) &&
        (!details.trackName || !details.artistNames || !details.albumName || !details.duration))
      throw "Invalid arguments: if any one of 'trackName', 'artistNames', 'albumName', or 'duration' is provided in the details argument then all must also be provided.";

  ids = ids || {};
  insertMetadata = insertMetadata || {};

  let spotifyTrack = details.spotifyTrack || null; //Spotify recording/track object.
  let spotifyId = ids.spotifyId || spotifyTrack && spotifyTrack.id;
  let spotifyAlbums, spotifyArtists, spotifyArtist, spotifyAlbum;
  let name, artist, artists, album, duration;
  const spotifyAPI = await getSpotifyAPI();
  let response;

  // First see if we already have this track in our DB...
  // ...by id
  let track = Object.keys(ids).length && Track.findOne(ids);

  // ...or by matching from a spotifyTrack object or names and duration.
  if (!track && (spotifyId || spotifyTrack || details.trackName)) {
    // If we have a spotifyId but no spotifyTrack then fetch the spotifyTrack.
    if (spotifyId && !spotifyTrack) {
      //console.log("loading track data from Spotify by id");
      response = await spotifyAPI.getTrack(spotifyId);
      spotifyTrack = response.body;
    }

    // Get artist and album document if possible, otherwise use names.
    if (spotifyTrack) {
      name = spotifyTrack.name;
      artist = spotifyTrack.artists[0];
      artist = Artist.findOne({spotifyId: artist.id}) || artist.name;
      album = spotifyTrack.album;
      album = Album.findOne({spotifyId: album.id}) || album.name;
      duration = spotifyTrack.duration_ms / 1000;
    }
    else {
      name = details.trackName;
      artist = details.artistNames[0];
      album = details.albumName;
      duration = details.duration;
    }

    track = Track.findByName(name, artist, album)
      .filter(t => Math.abs(t.duration - duration) < durationMatchMargin)
      .find(t=>!!t);
  }

  // If we haven't matched the track or we don't have an associated spotifyId for it.
  if (!track || !track.spotifyId) {
    // Make sure we have a Spotify recording/track object.
    if (!spotifyTrack && (spotifyId || details.trackName)) {
      if (spotifyId) {
        //console.log("loading track data from Spotify by id");
        response = await spotifyAPI.getTrack(spotifyId);
        spotifyTrack = response.body;
      }
      else {

        //console.log("searching for track data from spotify", details);
        const query = `track:"${normaliseString(details.trackName)}" artist:"${normaliseString(details.artistNames[0])}" album:"${normaliseString(details.albumName)}"`;
        response = await spotifyAPI.search(query, ['track'], {market: 'AU'});

        // See if any results match across track name, (first) artist name,
        // album name and are within 1 second duration.
        spotifyTrack = response.body.tracks.items.find(track =>
          normaliseStringMatch(track.name, details.trackName) &&
          normaliseStringMatch(track.album.name, details.albumName) &&
          track.artists.find(artist => normaliseStringMatch(artist.name, details.artistNames[0])) &&
          (Math.abs(track.duration_ms / 1000 - details.duration) < durationMatchMargin)
        );

        // If we didn't find an exact matching track, see if we can find one with different duration.
        // This at least allows us to unaspotifyiguously match artists and album.
        if (!spotifyTrack) {
          spotifyTrack = response.body.tracks.items.find(track =>
            normaliseStringMatch(track.name, details.trackName) &&
            normaliseStringMatch(track.album.name, details.albumName) &&
            track.artists.find(artist => normaliseStringMatch(artist.name, details.artistNames[0]))
          );
          //if (spotifyTrack) console.log("found diff duration: " + details.duration + " : " + (spotifyTrack.duration_ms / 1000));
        }
      }
    }

    // If a Spotify track object was provided or found, then create or update a/the Track.
    if (spotifyTrack) {
      spotifyId = spotifyTrack.id;

      /////// If there's already a matching track object in the DB, update it. /////////
      if (track) {
        // Set the spotifyId for the track and associated artists and albums as necessary.
        Track.update(track._id, {$set: { spotifyId }});

        album = Album.findOne(track.albumId);
        if (!album.spotifyId) {
          // If our recorded album name and the spotify album name match.
          if (normaliseStringMatch(album.name, spotifyTrack.album.name)) {
            album = await getAlbum({_id: album._id}, {spotifyAlbum: spotifyTrack.album});
          }
        }

        spotifyArtists = spotifyTrack.artists;
        for (artist of Artist.find({_id: {$in: track.artistIds}}).fetch()) {
          if (!artist.spotifyId) {
            // See if this artist appears in the artists listed for the recording on Spotify.
            spotifyArtist = spotifyArtists.find(sa => normaliseStringMatch(sa.name, artist.name));
            if (spotifyArtist) {
              await getArtist({_id: artist._id}, { spotifyArtist });
              spotifyArtists = spotifyArtists.filter(sa => sa.id != spotifyArtist.id);
            }
          }
          else {
            spotifyArtists = spotifyArtists.filter(sa => sa.id != artist.spotifyId);
          }
        }
        // Add remaining artists listed by Spotify that didn't appear in the track artist list.
        if (spotifyArtists.length) {
          let newArtists = [];
          for (let sa of spotifyArtists) {
            newArtists.push(await getArtist({spotifyId: sa.id}, {spotifyArtist: sa}));
          }
          try {
            Track.update(track._id, {
              $push: { artistIds: { $each: newArtists.map(a => a._id) } },
              $set: {needsReview: true}
            });
          } catch (e) {
            console.error(e.message, newArtists);
          }
        }

        // Return the updated Track.
        return Track.findOne(track._id);
      }

      /////// We have a spotifyTrack but no matching Track. Create the Track. ////////
      // Get Artists and Album.
      album = await getAlbum({spotifyId: spotifyTrack.album.id}, {spotifyAlbum: spotifyTrack.album});
      let spotifyArtistIds = spotifyTrack.artists.map(sa => sa.id);
      await ensureArtistsBySpotifyId(spotifyArtistIds);
      artists = Artist.find({spotifyId: {$in: spotifyArtistIds}});

      // Determine if the specified duration matches the duration of the Spotify track.
      const durationMatch = !details.duration || (Math.abs(spotifyTrack.duration_ms / 1000 - details.duration) < durationMatchMargin);
      // Create the Track.
      track = {
        name: spotifyTrack.name,
        artistIds: artists.map(artist => artist._id),
        albumId: album._id,
        duration: durationMatch ? spotifyTrack.duration_ms / 1000 : details.duration,
        ...insertMetadata,
      }
      // If we found the exact track, set the spotifyId.
      if (durationMatch) {
        track.spotifyId = spotifyTrack.id;
      }

      const trackId = Track.insert(track);

      return Track.findOne(trackId);
    }
  }

  //////// We could not find a matching Spotify track/recording. ////////
  // If we found a matching Track in our DB just return it.
  if (track) return track;

  // Otherwise create a Track from details if given.
  if (details.trackName) {
    // We can't find an exact match for the track+artist+album names in Spotify. We need to determine artists,
    // which almost certainly will be on MusicBrainz and so should be linked to, but we need to
    // reliably unaspotifyiguously determine the artists. Many artists have same name. We can't use
    // album to disambiguate otherwise we would have found the track in the above Spotify search.
    const spotifyArtistIds = [];
    for (let artistName of details.artistNames) {
      // First search by track and artist name,
      // if we find a result where both names match exactly it's probably the right artist.
      response = await spotifyAPI.search(`track:"${normaliseString(details.trackName)}" artist:"${normaliseString(artistName)}"`, ['track']);
      let spotTrack = response.body.tracks.items.find(st =>
        normaliseStringMatch(details.trackName, st.name) &&
        st.artists.find(sta => normaliseStringMatch(artistName, sta.name)));
      if (spotTrack) {
        spotifyArtistIds.push(spotTrack.artists.find(ta => normaliseStringMatch(artistName, ta.name)).id);
        continue;
      }

      // Otherwise just add every matching artist from spotify, a human will have to disambiguate.
      response = await spotifyAPI.search(`artist:"${normaliseString(artistName)}"`, ['artist']);
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
  ids = ids || {};
  insertMetadata = insertMetadata || {};

  let list = ids && Object.keys(ids).length && PlayList.findOne(ids);
  if (list) return list;

  const spotifyAPI = await getSpotifyAPI();

  if (ids.spotifyId) {
    try {
      let response = await spotifyAPI.getPlaylist(ids.spotifyUserId, ids.spotifyId);

      const listDetails = response.body;

      response = await spotifyAPI.getPlaylistTracks(ids.spotifyUserId, ids.spotifyId);
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
      }

      insertMetadata = insertMetadata || {};

      // Get all compilerIds, with duplicates removed.
      const allCompilerIds = insertMetadata.compilerIds ? insertMetadata.compilerIds.concat(compilerIds) : compilerIds;
      insertMetadata.compilerIds = [ ...new Set(allCompilerIds) ]
      if (!insertMetadata.name) insertMetadata.name = listDetails.name;

      const tl = {
        ...insertMetadata,
        trackIds,
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
// Uses minimum nuspotifyer of Spotify API requests.
const ensureArtistsBySpotifyId = async (spotifyArtistIds) => {
  // Remove duplicates.
  spotifyArtistIds = [ ...new Set(spotifyArtistIds) ];
  // Filter out those for which we already have a record.
  spotifyArtistIds = spotifyArtistIds.filter(spotifyId => !Artist.findOne({spotifyId}));
  // Get artist records from Spotify, respecting limit of 50 per request.
  while (spotifyArtistIds.length) {
    const spotifyAPI = await getSpotifyAPI();
    response = await spotifyAPI.getArtists(spotifyArtistIds.splice(0, 50));
    for (artist of response.body.artists) {
      await getArtist(
        {spotifyId: artist.id},
        {spotifyArtist: artist}
      );
    }
  }
}

// Utility method to ensure we have records for the given spotify album IDs.
// Uses minimum nuspotifyer of Spotify API requests.
const ensureAlbumsBySpotifyId = async (spotifyAlbumIds) => {
  // Remove duplicates.
  spotifyAlbumIds = [ ...new Set(spotifyAlbumIds) ];
  // Filter out those for which we already have a record.
  spotifyAlbumIds = spotifyAlbumIds.filter(spotifyId => !Album.findOne({spotifyId}));
  // Get album records from Spotify, respecting limit of 50 per request.
  while (spotifyAlbumIds.length) {
    const spotifyAPI = await getSpotifyAPI();
    response = await spotifyAPI.getAlbums(spotifyAlbumIds.splice(0, 20));
    for (album of response.body.albums) {
      await getAlbum(
        {spotifyId: album.id},
        {spotifyAlbum: album}
      );
    }
  }
};


// If the item doesn't yet have the imageURLs field set and the given
// spotifyItem provides images, set the imageURLs field in the item.
const getImages = (item, spotifyItem) => {
  if ((!item.imageURLs || !item.imageURLs.length) && spotifyItem.images && spotifyItem.images.length) {
    item.imageURLs = {};
    for (let image of spotifyItem.images) {
      let maxD = Math.max(image.height, image.width);
      if (maxD >= 640) {
        item.imageURLs.large = image.url;
      } else if (maxD <= 160) {
        item.imageURLs.small = image.url;
      } else {
        item.imageURLs.medium = image.url;
      }
    }
  }
}
