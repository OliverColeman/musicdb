import _ from 'lodash';
import { levenshteinScore, soundex, doubleMetaphone, findBySoundexOrDoubleMetaphone, normaliseString } from '../../modules/util';
import Track from '../Track/Track';
import Artist from '../Artist/Artist';
import Album from '../Album/Album';
import Compiler from '../Compiler/Compiler';
import { musicCollection, musicSearchCollection } from './collections';


const searchScore = (search, name) => {
  name = _.uniq(name.split(/\s+/)).filter(t => t != '');
  search = _.uniq(search.split(/\s+/)).filter(t => t != '');
  const totalSearchChars = _.sum(search.map(t => t.length));

  // Find score for best matching name element for each search term, weight by term length.
  const scores = search.map(term => (1 - Math.min(...name.map(n => levenshteinScore(n, term)))) * term.length);

  // Components of score are: mean of term scores and a penalty for extraneous
  // terms (for sorting purposes). Note: in the past there was a product term
  // but this doesn't work well when terms are very short and have, say, a single
  // different character.
  //const product = scores.reduce((a,b) => a*b);
  const average = _.mean(scores) / totalSearchChars;
  const extraneousPenalty = Math.max(0, name.length - search.length) * 0.00001;
  //return (product + average) / 2 - extraneousPenalty;
  return average - extraneousPenalty;
}


// Get Levenshtein scores for document name and possibly other
// associated names or combinations thereof, return the lowest score.
const searchScoreDoc = (type, terms, doc, skipFieldsInScoring) => {
  let names = [doc.name];
  skipFieldsInScoring = skipFieldsInScoring || [];

  if (type == 'playlist') {
    if (!skipFieldsInScoring.includes('compiler')) {
      Compiler.find({_id: {$in: doc.compilerIds}})
        .forEach(compiler => names.push(compiler.name));
    }
  }
  else if (type == 'track') {
    if (!skipFieldsInScoring.includes('artist')) {
      Artist.find({_id: {$in: doc.artistIds}})
        .forEach(artist => names.push(artist.name));
    }
    if (doc.albumId && !skipFieldsInScoring.includes('album')) {
      names.push(Album.findOne(doc.albumId).name);
    }
  }

  return searchScore(terms, names.join(' '));
}


const searchQuery = (args) => {
  const { type, terms, inPlayListsWithGroupId, skipFieldsInScoring } = args;

  const searchScoreKey = 'searchscore_' + normaliseString(terms);

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

  const transform = (doc) => {
    doc[searchScoreKey] = searchScoreDoc(type, terms, doc, skipFieldsInScoring);
    return doc;
  }

  return findBySoundexOrDoubleMetaphone(musicCollection[type.toLowerCase()], terms, andSelectors, orSelectors, { transform });
}


const searchScoreThreshold = 0.7;


export { searchScore, searchScoreDoc, searchQuery, searchScoreThreshold };
