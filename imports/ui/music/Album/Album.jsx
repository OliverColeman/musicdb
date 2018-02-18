import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';

import AlbumCollection from '../../../api/Album/Album';
import Artist from '../Artist/Artist';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';

import './Album.scss';


class Album extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { loading, album, viewContext } = this.props;

    if (loading) return (<Loading />);
    if (!album) return (<NotFound />);

    if (viewContext == 'inline') return (
      <Link to={`/album/${album._id}`} title={album.name} className={"Album inline-context name"}>
        {album.name}
      </Link>);

    if (viewContext == 'image-medium') return (
      <Link to={`/album/${album._id}`} title={album.name} className={"Album inline-context name"}>
        <img src={album.imageURLs.medium} className={"Album image-context image"} height={"300"} width={"300"} />
      </Link>);

    if (viewContext == 'image-small') return (
      <Link to={`/album/${album._id}`} title={album.name} className={"Album inline-context name"}>
        <img src={album.imageURLs.small} className={"Album image-context image"} />
      </Link>);

    return (
      <div className={"Album " + viewContext + "-context"}>
        {loading ? <Loading /> :
          <div>
            {viewContext != "page" ? "" :
            <div className="album album-image image">
              <img src={album.imageURLs.medium} className={"Album image-context image"} />
            </div>
            }

            <div className="item-header">
              <Link className="name" to={`/album/${album._id}`}>{album.name}</Link>
              
              {viewContext != 'page' || !album.spotifyId ? '' :
                <a className="link spotify" title="Show in Spotify" target="_blank" href={`https://open.spotify.com/album/${album.spotifyId}`} />
              }
            </div>

            <div className="artists inline-list">
              { album.artistIds.map(artistId => (<Artist artistId={artistId} key={artistId} viewContext="inline" />)) }
            </div>
          </div>
        }
      </div>
    );
  }
}


export default withTracker(({match, album, albumId, viewContext}) => {
  viewContext = viewContext || "page";
  const subAlbum = album ? null : Meteor.subscribe('Album.withId', albumId || match.params.albumId);

  return {
    loading: subAlbum && !subAlbum.ready(),
    album: album || AlbumCollection.findOne(albumId || match.params.albumId),
    viewContext,
  };
})(Album);
