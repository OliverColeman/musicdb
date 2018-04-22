import React from 'react';
import PropTypes from 'prop-types';
import { ButtonToolbar, ButtonGroup, Button } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';

import Access from '../../../modules/access';
import EditInline from '../../misc/EditInline/EditInline.jsx';
import AlbumCollection from '../../../api/Album/Album';
import Artist from '../Artist/Artist';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';
import LinkOrNot from '../../misc/LinkOrNot/LinkOrNot';
import IconsAndLinks from '../IconsAndLinks/IconsAndLinks';

import './Album.scss';


class Album extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { loading, album, viewType, noLinks } = this.props;

    if (loading) return (<Loading />);
    if (!album) return (<NotFound />);

    const editable = !album.spotifyId && !album.mbId;

    if (viewType == 'inline') return (
      <LinkOrNot link={!noLinks} to={`/album/${album._id}`} title={album.name} className={"Album inline-viewtype name"}>
        {album.name}
      </LinkOrNot>);

    if (viewType == 'image-medium') return (
      <LinkOrNot link={!noLinks} to={`/album/${album._id}`} title={album.name} className={"Album inline-viewtype name"}>
        { !album.imageURLs || !album.imageURLs.medium ?
          '?' :
          <img src={album.imageURLs.medium} className={"Album image-viewtype image"} height={"300"} width={"300"} />
        }
      </LinkOrNot>);

    if (viewType == 'image-small') return (
      <LinkOrNot link={!noLinks} to={`/album/${album._id}`} title={album.name} className={"Album inline-viewtype name"}>
        { !album.imageURLs || !album.imageURLs.medium ?
          '' :
          <img src={album.imageURLs.small} className={"Album image-viewtype image"} />
        }
      </LinkOrNot>);


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
              <LinkOrNot link={!noLinks && viewType != "page"} className="name" to={`/album/${album._id}`}>
                {viewType == 'page' && editable ?
                  <EditInline doc={album} field="name" updateMethod="album.update" inputType={EditInline.types.textfield} />
                  :
                  album.name
                }
              </LinkOrNot>

              {viewType == 'page' && <IconsAndLinks type='album' item={album} />}
            </div>

            <div className="artists inline-list">
              { album.artistIds.map(artistId => (<Artist artistId={artistId} key={artistId} viewType="inline" noLinks={noLinks} />)) }
            </div>
          </div>
        }
      </div>
    );
  }
}


export default withTracker(({match, album, albumId, viewType, noLinks}) => {
  viewType = viewType || "page";
  const subAlbum = album ? null : Meteor.subscribe('Album.withId', albumId || match.params.albumId);

  return {
    loading: subAlbum && !subAlbum.ready(),
    album: album || AlbumCollection.findOne(albumId || match.params.albumId),
    viewType,
    noLinks,
  };
})(Album);
