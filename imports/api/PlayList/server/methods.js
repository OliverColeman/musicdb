import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Jobs } from 'meteor/msavin:sjobs';
import _ from 'lodash';

import rateLimit from '../../../modules/rate-limit';
import Access from '../../../modules/access';
import PlayList from '../PlayList';
import Track from '../../Track/Track';
import Artist from '../../Artist/Artist';
import Album from '../../Album/Album';
import { importFromURL, importFromSearch } from '../../../modules/server/music/music_service';
import { getSchemaFieldTypes, throwMethodException } from '../../Utility/methodutils';
import { normaliseString, normaliseStringMatch, convertHHMMSSToSeconds, levenshteinScore } from '../../../modules/util';
import MusicService from '../../../modules/server/music/music_service_class';
import { searchQuery, searchScore, searchScoreThreshold } from '../../Music/search';


Meteor.methods({
  'PlayList.import': function PlayListImport(url, insertMetadata) {
    check(url, String);
    check(insertMetadata, {
      name: Match.Maybe(String),
      compilerIds: Match.Maybe([String]),
      groupId: Match.Maybe(String),
      number: Match.Maybe(Number),
      date: Match.Maybe(Number),
    });

    if (!Access.allowed({accessRules: PlayList.access, op: 'create', user: this.userId})) throwMethodException("Not allowed.");

    // Check user is allowed to put list in specified group.
    const user = Meteor.users.findOne(this.userId);
    const userGroups = (user && user.roles) ? Object.keys(user.roles) : [];
    if (insertMetadata.groupId &&
        !Roles.userIsInRole(this.userId, ['admin'], Roles.GLOBAL_GROUP) &&
        !userGroups.includes(insertMetadata.groupId)) {
      throwMethodException("Not allowed.");
    }

    try {
      const promise = importFromURL('playlist', url, insertMetadata);
      const list = promise.await();

      if (list && list._id) return list;

      throw "Unable to import list, unknown error.";
    } catch (exception) {
      throwMethodException(exception);
    }
  },


  'PlayList.trackImportSearch': async function PlayListAddTracks(trackData) {
    try {
      check(trackData, {
        track: String,
        artist: String,
        album: Match.Maybe(String),
        duration: Match.Maybe(String),
      });

      trackData = _.mapValues(trackData, value => value ? value.trim() : false);

      trackData.duration = trackData.duration ? convertHHMMSSToSeconds(trackData.duration) : null;
      // Sometimes multiple artists are listed, separated by comma, in this case get first for some searches.
      const artistSplit = trackData.artist.split(',')[0];

      const findTracks = ({track, artist, album, duration}) => {
        // Filter by artist, and album if given.
        const tracks = Track.findByName(track, artist, album);
        // Get matches (filtered by duration if given).
        if (duration) return tracks.filter(t => Math.abs(t.duration - duration) < MusicService.durationMatchMargin);
        return tracks;
      }

      // Score track, artist and album individually, use lowest score as the overall score.
      const scoreTrack = (track) => {
        let scores = [
          1 - levenshteinScore(trackData.track, track.name),
          // Use best matching artist score
          Math.max(...Artist.find({_id: {$in: track.artistIds}}).map(a => 1 - levenshteinScore(artistSplit, a.name))),
        ]
        if (trackData.album) {
          scores.push(!track.albumId ? 0 : 1 - levenshteinScore(trackData.album, Album.findOne(track.albumId).name));
        }
        return {
          ...track,
          score: Math.min(...scores),
        }
      }


      // Three passes, one search over existing records, two over search services.
      let tracks;
      // When searching services perform a generic search (single string
      // containing search terms) as this will perform a fuzzy search on the service.
      const searchTerms = `${trackData.track} ${trackData.artist} ${(trackData.album ? trackData.album : '')}`;
      // For now just search Spotify. MusicBrainz is just too slow to be
      // practical when performing requests for a list of tracks.
      for (let i = 0; i < 3; i++) {
        // Search for an exact match (after searching a service if this isn't the first pass).
        tracks = findTracks(trackData);

        // If we didn't find a match and the artist text contains a comma it
        // might be the case that multiple artists have been specified.
        if (!tracks.length && trackData.artist.includes(',')) {
          tracks = findTracks({
            ... trackData,
            artist: artistSplit
          });
        }

        // An exact match was found.
        if (tracks.length) {
          // If the track also matched against a specified album or duration then consider it the right track.
          if (trackData.album || trackData.duration) {
            return {
              matchTrackId: tracks[0]._id,
            }
          }
          // Otherwise return the name+artist matching tracks as close matches.
          return {
            closestTrackIds: tracks.map(t => t._id)
          }
        }

        // We couldn't find an exact match, do a generic keyword search.
        tracks = searchQuery({
          type: 'track',
          terms: searchTerms,
        }).fetch();
        if (tracks.length) {
          // Score track, artist and album individually, use lowest score as the overall score.
          tracks = tracks.map(scoreTrack);
          tracks = _.sortBy(tracks, t => -t.score);
          // If this looks like a very close match, return results as close matches.
          if (tracks[0].score > 0.9) {
            return {
              closestTrackIds: tracks.slice(0, 3).map(t => t._id)
            }
          }
        }

        // Last pass, no more services to search.
        if (i == 2) break;

        // Search a service for it. Spotify first because it's faster.
        let serviceSearchResult = await importFromSearch(i == 0 ? 'spotify' : 'musicbrainz', 'track', {
          trackName: trackData.track,
          artistNames: [artistSplit]
        });
        // Neither spotify nor MB do very well with search for track and artist
        // if one of them is misspelt, try just track name if no results.
        if (!serviceSearchResult.length) {
          serviceSearchResult = await importFromSearch(i == 0 ? 'spotify' : 'musicbrainz', 'track', trackData.track);
        }
      }

      // If we found any tracks at all (from generic search).
      if (tracks.length) {
        return {
          closestTrackIds: tracks.slice(0, 3).map(t => t._id)
        }
      }

      // No results.
      return {};
    } catch (exception) {
      throwMethodException(exception);
    }
  },
});


rateLimit({
  methods: [
    'PlayList.import',
    'PlayList.trackImportSearch',
  ],
  limit: 5,
  timeRange: 1000,
});
