import React from 'react';
import PropTypes from 'prop-types';

import './IconsAndLinks.scss';


const spotifyTypeMap = {compiler: 'user'};
const mbTypeMap = { compiler: 'user', album: 'release-group', track: 'recording' };

const IconsAndLinks = ({type, item}) => {
  let spotifyLink;
  if (item.spotifyId) {
    if (type == 'playlist') {
      spotifyLink = `https://open.spotify.com/user/${item.spotifyUserId}/playlist/${item.spotifyId}`;
    } else {
      spotifyLink = `https://open.spotify.com/${spotifyTypeMap[type] || type}/${item.spotifyId}`;
    }
  }

  let mbLink = item.mbId && `https://musicbrainz.org/${mbTypeMap[type] || type}/${item.mbId}`;

  const needsReview = item.needsReview || item.dataMaybeMissing && item.dataMaybeMissing.length;

  return (
    <div className="IconsAndLinks">
      <div className="wrapper">
        { spotifyLink &&
          <a className="service-link spotify" title="Show in Spotify" target="_blank" href={spotifyLink} />
        }

        { mbLink &&
          <a className="service-link musicbrainz" title="Show in MusicBrainz" target="_blank" href={mbLink} />
        }

        { needsReview && <div className="service-link needsreview">🔧</div> }
      </div>
    </div>
  )
}

IconsAndLinks.propTypes = {
  type: PropTypes.string.isRequired,
  item: PropTypes.object.isRequired,
};

export default IconsAndLinks;
