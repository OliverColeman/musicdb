import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';

import ArtistCollection from '../../../api/Artist/Artist';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';

import './Artist.scss';


class Artist extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { loading, artist, viewContext } = this.props;

    if (loading) return (<Loading />);
    if (!artist) return (<NotFound />);

    // TODO list of (known) albums, tracks, and playlists.

    if (viewContext == 'inline') return (
      <Link to={`/artist/${artist._id}`} title={artist.name} className={"Artist inline-context name"}>
        {artist.name}
      </Link>);

    return (
      <div className={"Artist " + viewContext + "-context"}>
        {viewContext != "page" ? "" :
        <div className="artist artist-image image">
          <img src={artist.imageURLs.medium} className={"Artist image-context image"} />
        </div>
        }

        <div className="item-header">
          <Link className="name" to={`/artist/${artist._id}`}>{artist.name}</Link>
          
          {viewContext != 'page' || !artist.spotifyId ? '' :
            <a className="link spotify" title="Show in Spotify" target="_blank" href={`https://open.spotify.com/artist/${artist.spotifyId}`} />
          }
        </div>
      </div>
    );
  }
}


export default withTracker(({match, artist, artistId, viewContext}) => {
  viewContext = viewContext || "page";
  const subArtist = artist ? null : Meteor.subscribe('Artist.withId', artistId || match.params.artistId);

  return {
    loading: subArtist && !subArtist.ready(),
    artist: artist || ArtistCollection.findOne(artistId || match.params.artistId),
    viewContext,
  };
})(Artist);
