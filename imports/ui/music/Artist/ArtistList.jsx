import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button, Label } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';

import ArtistCollection from '../../../api/Artist/Artist';
import Artist from '../Artist/Artist';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';

import './Artist.scss';


class ArtistArtist extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { loadingArtists, artists } = this.props;

    if (loadingArtists) return ( <Loading /> );

    return (
      <div className={"ArtistList"}>
        {/*<div className="header-row">
          { ["Name", "Icons"].map(h => (
            <div className={"header-cell header-" + h} key={h}>{h}</div>
          ))}
        </div>*/}

        { artists.map(artist => (
          <Artist artist={artist} viewType="list" key={artist._id} />
        ))}
      </div>
    );
  }
}


export default withTracker(({loadingArtists, selector, items}) => {
  const sortOptions = {
    number: -1,
    date: -1,
    name: 1,
  };

  return {
    loadingArtists,
    artists: items ? items : (!loadingArtists && ArtistCollection.find(selector, {sort: sortOptions}).fetch()),
  };
})(ArtistArtist);
