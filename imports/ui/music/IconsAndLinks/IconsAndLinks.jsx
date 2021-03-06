import React from 'react';
import PropTypes from 'prop-types';
import SpotifyPlayer from 'react-spotify-player';

import ArtistCollection from '../../../api/Artist/Artist';

import './IconsAndLinks.scss';


const spotifyTypeMap = {compiler: 'user'};
const mbTypeMap = { compiler: 'user', album: 'release-group', track: 'recording' };

const IconsAndLinks = ({type, item, showPlayer}) => {
  let spotifyLink;
  if (item.spotifyId) {
    if (type == 'playlist') {
      spotifyLink = `https://open.spotify.com/user/${item.spotifyUserId}/playlist/${item.spotifyId}`;
    } else {
      spotifyLink = `https://open.spotify.com/${spotifyTypeMap[type] || type}/${item.spotifyId}`;
    }
  }

  let mbLink = item.mbId && `https://musicbrainz.org/${mbTypeMap[type] || type}/${item.mbId}`;

  let youTubeLink = false;
  if (type == 'track') {
    let artist = ArtistCollection.findOne(item.artistIds[0]);
    artist = artist && artist.nameNormalised.replace(' ', '+');
    youTubeLink = `https://www.youtube.com/results?search_query=${artist ? artist : ''}+${item.nameNormalised}`;
  }

  const needsReview = item.needsReview || item.dataMaybeMissing && item.dataMaybeMissing.length;

  return (
    <div className="IconsAndLinks">
      <div className="wrapper">
        { showPlayer && spotifyLink && <div className="spotify-player-wrapper">
          <SpotifyPlayer uri={spotifyLink} size={{width:250, height:80}} view="list" theme="black" />
        </div> }

        { youTubeLink &&
          <a className="service-link youtube" title="Search in YouTube" target="_blank" href={youTubeLink} />
        }

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

export default IconsAndLinks;
