import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Jobs } from 'meteor/msavin:sjobs';
import _ from 'lodash';

import rateLimit from '../../../modules/rate-limit';
import Access from '../../../modules/access';
import PlayList from '../PlayList';
import Track from '../../Track/Track';
import { importFromURL, importFromSearch } from '../../../modules/server/music/music_service';
import { getSchemaFieldTypes, throwMethodException } from '../../Utility/methodutils';
import { normaliseString, normaliseStringMatch, convertHHMMSSToSeconds } from '../../../modules/util';
import MusicService from '../../../modules/server/music/music_service_class';
import { searchQuery } from '../../Music/search';


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

      trackData.duration = trackData.duration ? convertHHMMSSToSeconds(trackData.duration) : null;

      const findTrack = ({track, artist, album, duration}) => {
        // Filter by artist and album if given (we redo this after service search
        // if necessary because the available artists and albums may change).
        const tracks = Track.findByName(track, artist, album);
        if (tracks.length) {
          // Get first match (filtered by duration if given).
          if (duration) return tracks.find(t => Math.abs(t.duration - duration) < MusicService.durationMatchMargin);
          return tracks[0];
        }
      }

      let track, tracks;
      // Three passes, one search over existing records, two over search services.
      for (let i = 0; i < 2; i++) {
        track = findTrack(trackData);

        // If we didn't find a match and the artist text contains a comma it
        // might be the case that multiple artists have been specified.
        if (!track && trackData.artist.includes(',')) {
          track = findTrack({
            ... trackData,
            artist: trackData.artist.split(',')[0]
          });
        }

        if (i == 2 || track) {
          break;
        }
        // Search a service for it. Spotify first because it's faster.
        await importFromSearch(i == 0 ? 'spotify' : 'musicbrainz', 'track', {
          trackName: trackData.track,
          artistNames: [trackData.artist],
          albumName: trackData.album,
        });
      }

      if (track) {
        return {
          matchTrackId: track._id,
        }
      }

      const searchTerms = trackData.track + trackData.artist + (trackData.album ? trackData.album : '');
      tracks = searchQuery({
        type: 'track',
        terms: searchTerms,
      }).fetch();
      if (tracks.length) {
        const searchScoreKey = 'searchscore_' + normaliseString(searchTerms);
        tracks = _.sortBy(tracks, t => -t[searchScoreKey]);
        return {
          closestTrackIds: tracks.slice(0, 3).map(t => t._id)
        }
      }

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
