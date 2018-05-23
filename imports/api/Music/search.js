import _ from 'lodash';
import { levenshteinScore, soundex, doubleMetaphone, findBySoundexOrDoubleMetaphone, normaliseString } from '../../modules/util';
import Track from '../Track/Track';
import Artist from '../Artist/Artist';
import Album from '../Album/Album';
import Compiler from '../Compiler/Compiler';
import { musicCollection, musicSearchCollection } from './collections';

// Get Levenshtein scores for document name and possibly other
// associated names or combinations thereof, return the lowest score.
const searchScore = (type, terms, doc) => {
  let names = [doc.name];

  if (type == 'playlist') {
    Compiler.find({_id: {$in: doc.compilerIds}})
      .forEach(compiler => names.push(compiler.name));
  }
  else if (type == 'track') {
    Artist.find({_id: {$in: doc.artistIds}})
      .forEach(artist => names.push(artist.name));
    if (doc.albumId) {
      names.push(Album.findOne(doc.albumId).name);
    }
  }

  names = _.uniq(_.flatten(names.map(n => n.split(' '))));
  terms = terms.split(' ');

  // Find score for best matching name for each search term.
  const scores = terms.map(term => Math.min(...names.map(name => levenshteinScore(name, term))));

  // Score is average of term scores plus a small penalty for extraneous names.
  return (_.sum(scores) + Math.max(0, names.length - terms.length) * 0.0001) / terms.length;
}


const searchQuery = (args) => {
  const { type, terms, inPlayListsWithGroupId } = args;

  const andSelectors = {};
  if (type == 'track' && inPlayListsWithGroupId) {
    andSelectors.appearsInPlayListGroups = inPlayListsWithGroupId;
  }

  if (Meteor.isClient) {
    // On the client we don't bother with the OR filters and in fact they'd only
    // complicate things because the related documents would need to be loaded first.
    // (we also don't need to calculate the search score because the search
    // collection documents already have the calculated score).
    return musicSearchCollection[type.toLowerCase()].find(andSelectors);
  }

  // TODO The related item inclusions here aren't reactive.
  // They probably don't need to be for search results though.
  let orSelectors = [];
  if (type == 'playlist') {
    const compilerIds = findBySoundexOrDoubleMetaphone(musicCollection['compiler'], terms).map(c => c._id);
    if (compilerIds.length) orSelectors.push( { compilerIds: { $in: compilerIds } } );
  }
  else if (type == 'track') {
    const artistIds = findBySoundexOrDoubleMetaphone(musicCollection['artist'], terms).map(a => a._id);
    if (artistIds.length) orSelectors.push({ artistIds: { $in: artistIds } });
  }

  searchScoreKey = 'searchscore_' + normaliseString(terms);
  const transform = (doc) => {
    doc[searchScoreKey] = searchScore(type, terms, doc);
    return doc;
  }

  return findBySoundexOrDoubleMetaphone(musicCollection[type.toLowerCase()], terms, andSelectors, orSelectors, { transform });
}


export { searchScore, searchQuery };
