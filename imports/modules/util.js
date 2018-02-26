

const padTime = x => x.toString().padStart(2, '0');

const convertSecondsToHHMMSS = (time, omitHoursIfZero) => {
  const h = Math.floor(time / 3600);
  const m = Math.floor((time - h*3600) / 60);
  const s = Math.round(time - h*3600 - m*60);
  if (omitHoursIfZero && h == 0) return `${padTime(m)}:${padTime(s)}`;
  return `${padTime(h)}:${padTime(m)}:${padTime(s)}`;
}

// For matching names ignoring case, punctuation, multiple and start/end white space characters.
const normaliseString = s => s.trim().toLowerCase().replace(/[^a-z0-9\s]*/g, '').replace(/\s+/g, ' ');
const normaliseStringMatch = (s1, s2) => normaliseString(s1) == normaliseString(s2);


export { convertSecondsToHHMMSS, normaliseString, normaliseStringMatch }
