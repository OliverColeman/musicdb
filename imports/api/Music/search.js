import { normaliseString, normaliseStringMatch, soundex, doubleMetaphone, findBySoundexOrDoubleMetaphone } from '../../modules/util';
import Track from '../Track/Track';
import Artist from '../Artist/Artist';
import Album from '../Album/Album';

const trackSearch = ({mixedNames, artistName, albumName, trackName, limit, inPlayListsWithGroupId}) => {
    const additionalSelectors = {};
    if (inPlayListsWithGroupId) {
      additionalSelectors.appearsInPlayListGroups = inPlayListsWithGroupId;
    }

    // Filter/search by artist and album if given.
    let artistIds, albumIds;
    if (artistName || mixedNames) {
      artistIds = findBySoundexOrDoubleMetaphone(Artist, soundex(artistName || mixedNames), doubleMetaphone(artistName || mixedNames)).map(a => a._id);
      if (artistIds.length) additionalSelectors.artistIds = {$in: artistIds};
    }
    if (albumName) {
      albumIds = findBySoundexOrDoubleMetaphone(Album, soundex(albumName), doubleMetaphone(albumName)).map(a => a._id);
      if (albumIds.length) additionalSelectors.albumId = {$in: albumIds};
    }

    // If this is a generic search.
    if (mixedNames) {
    // For a mixed names search we include tracks by name OR artist name (not filtering by artist like findBySoundexOrDoubleMetaphone does).
    const query = {
      $or: [
        { soundex: { $in: soundex(mixedNames) } },
        { doubleMetaphone: {$in: doubleMetaphone(mixedNames) } },
      ]
    }
    if (additionalSelectors.artistIds) query.$or.push({artistIds: additionalSelectors.artistIds});
    if (additionalSelectors.appearsInPlayListGroups) query.appearsInPlayListGroups = additionalSelectors.appearsInPlayListGroups;
    return Track.find(query, { limit });
  }
  // If this is a search by track name.
  else if (trackName) {
    return findBySoundexOrDoubleMetaphone(Track, soundex(trackName), doubleMetaphone(trackName), additionalSelectors, limit);
  }
  // This is a search by artist name.
  else {
    if (!artistIds || !artistIds.length) return null;
    return Track.find(additionalSelectors, {limit});
  }
}


export { trackSearch };
