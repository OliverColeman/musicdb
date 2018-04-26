import Track from '../../Track/Track';
import LinkedTrack from '../LinkedTrack';
import _ from 'lodash';


Track.after.insert(function(userId, doc) {
  updateLinks(null, doc);
});

Track.after.update(function(userId, doc) {
  updateLinks(this.previous, doc);
});

Track.after.remove(function(userId, doc) {
  updateLinks(doc, null);
});


const updateLinks = (previousTrack, currentTrack) => {
  if (previousTrack && currentTrack) {
    if (previousTrack.nameNormalised == currentTrack.nameNormalised
        && previousTrack.artistIds.length == currentTrack.artistIds.length
          && _.difference(previousTrack.artistIds, currentTrack.artistIds).length == 0) {
      // Nothing to do if name and artists have not changed.
      return;
    }
  }

  const trackId = previousTrack && previousTrack._id || currentTrack._id;

  const previousTrackLTRecord = previousTrack && LinkedTrack.findOne({
    trackNameNormalised: previousTrack.nameNormalised,
    artistIds: {$in: previousTrack.artistIds},
  });

  const currentTrackLTRecord = currentTrack && LinkedTrack.findOne({
    trackNameNormalised: currentTrack.nameNormalised,
    artistIds: {$in: currentTrack.artistIds},
  });

  // console.log(previousTrack);
  // console.log(previousTrackLTRecord);

  // If the track no longer matches the previous LT record.
  if (previousTrackLTRecord && (!currentTrackLTRecord || previousTrackLTRecord._id != currentTrackLTRecord._id)) {
    // Remove if there would only be one (or less) tracks listed in the record.
    if (previousTrackLTRecord.trackIds.length <= 2) {
      LinkedTrack.remove(previousTrackLTRecord._id);
    }
    else {
      // Remove track from LT record and rebuild list of artist ids if necessary.
      let newTrackIds = _.without(previousTrackLTRecord.trackIds, [trackId]);
      let artistIds = previousTrackLTRecord.artistIds.length == 1 ? previousTrackLTRecord.artistIds :
        _.uniq(_.flatten(Track.find({_id: {$in: newTrackIds}}).map(t => t.artistIds)));
      LinkedTrack.update(previousTrackLTRecord._id, {
        $pull: {trackIds: trackId},
        $set: {artistIds},
      });
    }
  }

  // If the track was inserted/updated (not removed).
  if (currentTrack) {
    // If there's an existing record matching the current track details.
    if (currentTrackLTRecord) {
      LinkedTrack.update({_id: currentTrackLTRecord._id}, {
        $addToSet: {
          trackIds: trackId, // Use addToSet instead of push in case the only thing that changed was artist list.
          artistIds: {$each: currentTrack.artistIds},
        },
      });
    }
    else {
      // Only add if there is more than one matching track.
      const matchingTracks = Track.find({
        nameNormalised: currentTrack.nameNormalised,
        artistIds: {$in: currentTrack.artistIds},
      }).fetch();
      if (matchingTracks.length > 1) {
        LinkedTrack.insert({
          trackNameNormalised: currentTrack.nameNormalised,
          trackIds: matchingTracks.map(t => t._id),
          artistIds: _.uniq(_.flatten(matchingTracks.map(t => t.artistIds))),
        });
      }
    }
  }
}
