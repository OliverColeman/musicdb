import React from 'react';
import PropTypes from 'prop-types';
import { ButtonToolbar, ButtonGroup, Button } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';

import Access from '../../../modules/access';
import EditInline from '../../misc/EditInline/EditInline.jsx';
import ArtistCollection from '../../../api/Artist/Artist';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';
import LinkOrNot from '../../misc/LinkOrNot/LinkOrNot';
import IconsAndLinks from '../IconsAndLinks/IconsAndLinks';

import './Artist.scss';


class Artist extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { loading, artist, viewType, noLinks } = this.props;

    if (loading) return (<Loading />);
    if (!artist) return (<NotFound />);

    const editable = !artist.spotifyId && !artist.mbId;

    // TODO list of (known) albums, tracks, and playlists.

    if (viewType == 'inline') {
      return (
        <LinkOrNot link={!noLinks} to={`/artist/${artist._id}`} title={artist.name} className={"Artist inline-viewtype name"}>
          {artist.name}
        </LinkOrNot>
      );
    }

    if (viewType == 'list') {
      return (
        <div className={"Artist " + viewType + "-viewtype"}>
          <LinkOrNot link={!noLinks} to={`/artist/${artist._id}`} title={artist.name} className={"Artist inline-viewtype name"}>
            {artist.name}
          </LinkOrNot>

          <IconsAndLinks type='artist' item={artist} />
        </div>
      );
    }

    return (
      <div className={"Artist " + viewType + "-viewtype"}>
        {(viewType == "page" && artist.imageURLs && artist.imageURLs.medium) &&
          <div className="artist artist-image image">
            <img src={artist.imageURLs.medium} className={"Artist image-viewtype image"} />
          </div>
        }

        <div className="item-header">
          <LinkOrNot link={!noLinks && viewType != "page"} className="name" to={`/artist/${artist._id}`}>
            {viewType == 'page' && editable ?
              <EditInline doc={artist} field="name" updateMethod="artist.update" inputType={EditInline.types.textfield} />
              :
              artist.name
            }
          </LinkOrNot>

          {viewType == 'page' && <IconsAndLinks type='artist' item={artist} />}
        </div>
      </div>
    );
  }
}


export default withTracker(({match, artist, artistId, viewType, noLinks}) => {
  viewType = viewType || "page";
  const subArtist = artist ? null : Meteor.subscribe('Artist.withId', artistId || match.params.artistId);

  return {
    loading: subArtist && !subArtist.ready(),
    artist: artist || ArtistCollection.findOne(artistId || match.params.artistId),
    viewType,
    noLinks,
  };
})(Artist);
