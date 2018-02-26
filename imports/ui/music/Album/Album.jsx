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
    const { loading, album, viewType } = this.props;

    if (loading) return (<Loading />);
    if (!album) return (<NotFound />);

    if (viewType == 'inline') return (
      <Link to={`/album/${album._id}`} title={album.name} className={"Album inline-viewtype name"}>
        {album.name}
      </Link>);

    if (viewType == 'image-medium') return (
      <Link to={`/album/${album._id}`} title={album.name} className={"Album inline-viewtype name"}>
        { !album.imageURLs || !album.imageURLs.medium ?
          '?' :
          <img src={album.imageURLs.medium} className={"Album image-viewtype image"} height={"300"} width={"300"} />
        }
      </Link>);

    if (viewType == 'image-small') return (
      <Link to={`/album/${album._id}`} title={album.name} className={"Album inline-viewtype name"}>
        { !album.imageURLs || !album.imageURLs.medium ?
          '' :
          <img src={album.imageURLs.small} className={"Album image-viewtype image"} />
        }
      </Link>);


    // viewType == 'page'
    return (
      <div className={"Album " + viewType + "-viewtype"}>
        {loading ? <Loading /> :
          <div>
            {viewType != "page" || !album.imageURLs || !album.imageURLs.medium
              ? "" :
              <div className="album album-image image">
                <img src={album.imageURLs.medium} className={"Album image-viewtype image"} />
              </div>
            }

            <div className="item-header">
              <Link className="name" to={`/album/${album._id}`}>{album.name}</Link>

              {viewType != 'page' || !album.spotifyId ? '' :
                <a className="link spotify" title="Show in Spotify" target="_blank" href={`https://open.spotify.com/album/${album.spotifyId}`} />
              }
            </div>

            <div className="artists inline-list">
              { album.artistIds.map(artistId => (<Artist artistId={artistId} key={artistId} viewType="inline" />)) }
            </div>
          </div>
        }
      </div>
    );
  }
}


export default withTracker(({match, album, albumId, viewType}) => {
  viewType = viewType || "page";
  const subAlbum = album ? null : Meteor.subscribe('Album.withId', albumId || match.params.albumId);

  return {
    loading: subAlbum && !subAlbum.ready(),
    album: album || AlbumCollection.findOne(albumId || match.params.albumId),
    viewType,
  };
})(Album);
