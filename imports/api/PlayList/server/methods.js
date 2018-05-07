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
import { normaliseString, normaliseStringMatch } from '../../../modules/util';
import MusicService from '../../../modules/server/music/music_service_class';


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


  'PlayList.addTrackFromSearch': async function PlayListAddTracks(playListId, trackData) {
    check(playListId, String);
    check(trackData, {
      track: String,
      artist: String,
      album: Match.Maybe(String),
      duration: Match.Maybe(Number),
    });

    const trackNameNorm = normaliseString(trackData.track);
    const artistNameNorm = normaliseString(trackData.artist);
    const albumNameNorm = trackData.album ? normaliseString(trackData.album) : null;
    const duration = trackData.duration;

    try {
      const playList = PlayList.findOne(playListId);
      if (!playList) throw "Play list does not exist.";
      if (!Access.allowed({accessRules: PlayList.access, op: 'update', item: playList, user: this.userId})) throw "Not allowed.";

      const limit = 25;

      let track;
      let tracks = [];
      // Two passes, one search over existing records, another after querying
      // music service(s) if the track couldn't be found in existing records.
      for (let i = 0; i < 2; i++) {
        // Filter by artist and album if given (we redo this after service search
        // if necessary because the available artists and albums may change).
        tracks = Track.findByName(trackData.track, trackData.artist, trackData.album);
        if (tracks.length) {
          // Get first match (filtered by duration if given).
          if (duration) track = tracks.find(t => Math.abs(t.duration - duration) < MusicService.durationMatchMargin);
          else track = tracks[0];
        }

        if (i == 1) {
          console.log("don't do search again", trackData.track);
          break;
        }

        if (track) {
          console.log("found enough/exact", trackData.track);
          break;
        }
        console.log("do search", trackData.track);
        await importFromSearch('spotify', 'track', {
          trackName: trackData.track,
          artistNames: [trackData.artist],
          albumName: trackData.album,
        });
        console.log("search done", trackData.track);
      }

      // If we didn't find an exact match.
      if (!track) {
        console.log('not found', trackData.track);
        throw "Not found."
      }

      PlayList.update(playListId, {
        $push: { trackIds: track._id },
        $inc: { duration: track.duration },
      });

      PlayList._handleTrackAdditions(playList, [track._id]);
    } catch (exception) {
      throwMethodException(exception);
    }
  },
});


rateLimit({
  methods: [
    'PlayList.import',
  ],
  limit: 5,
  timeRange: 1000,
});
