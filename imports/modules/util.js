import dblmp from 'double-metaphone';
import sdx from 'soundex-code';
import stemmer from 'lancaster-stemmer';
import levenshtein from 'levenshtein-edit-distance';
import _ from 'lodash';

const padTime = x => x.toString().padStart(2, '0');

const convertSecondsToHHMMSS = (time, omitHoursIfZero) => {
  const h = Math.floor(time / 3600);
  const m = Math.floor((time - h*3600) / 60);
  const s = Math.round(time - h*3600 - m*60);
  if (omitHoursIfZero && h == 0) return `${padTime(m)}:${padTime(s)}`;
  return `${padTime(h)}:${padTime(m)}:${padTime(s)}`;
}

// For matching names ignoring case, punctuation, multiple and start/end white space characters.
const normaliseString = s => s.toLowerCase()
                              .replace(/\(.*\)/g, '') // remove anything in brackets
                              .replace(/[^a-z0-9\s]*/g, '') // alphanumeric only
                              .replace(/\s+/g, ' ') // remove multiple spaces
                              .replace(/(\s\d{4,4})?\sremaster(ed)?(\sversion)?(\s\d{4,4})?/g, '') //remove "remastered" and variants.
                              .trim();
const normaliseStringMatch = (s1, s2) => normaliseString(s1) == normaliseString(s2);

/**
 * Returns an array containing the SoundEx codes for each word in the given string.
 * The words are stemmed using the Porter stemmer first.
 */
const soundex = (str) => _.uniqBy(str.split(/\s+/).map(w => sdx(stemmer(w))));

/**
 * Returns an array containing the primary and secondary Double Metaphone codes for each word in the given string.
 * The words are stemmed using the Porter stemmer first.
 */
const doubleMetaphone = (str) => _.uniqBy(_.flatten(str.split(/\s+/).map(w => dblmp(stemmer(w)))));

/**
 * Returns a Levenshtein "score": the Levenshtein edit distance (case insensitive) divided by the length of the longest string.
 */
const levenshteinScore = (str1, str2) => levenshtein(str1, str2, true) / Math.max(str1.length, str2.length);

/**
 * Used by fuzzy matching/search. Query the specified collection for the given soundex and double metaphone codes.
 * Optionally provide additional selectors. Default limit is 25.
 */
const findBySoundexOrDoubleMetaphone = (collection, soundexCodes, doubleMetaphoneCodes, additionalSelectors, limit) => {
  additionalSelectors = additionalSelectors || {};
  limit = limit || 50;

  return collection.find({
    $or: [
      { soundex: { $in: soundexCodes } },
      { doubleMetaphone: {$in: doubleMetaphoneCodes } },
    ],
    ...additionalSelectors
  },
  {
    limit
  });
}


export { convertSecondsToHHMMSS, normaliseString, normaliseStringMatch, soundex, doubleMetaphone, levenshteinScore, findBySoundexOrDoubleMetaphone }
