import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button, Label } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';
import _ from 'lodash';

import { musicCollection } from '../../../api/Music/collections';

import PlayListList from '../PlayList/PlayListList';
import TrackList from '../Track/TrackList';
import ArtistList from '../Artist/ArtistList';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';

import './NeedsReview.scss';


const typeMap = {
  // album: Album,
  artist: ArtistList,
  // compiler: Compiler,
  playlist: PlayListList,
  track: TrackList
}

class NeedsReview extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { type, loading, items } = this.props;

    if (loading) return ( <Loading /> );

    const reviewItems = items.filter(item => item.needsReview || item.dataMaybeMissing && item.dataMaybeMissing.length);

    let dupItems = _.groupBy(items, item => item.nameNormalised);
    dupItems = _.pickBy(dupItems, groupedItems => groupedItems.length >= 2);
    dupItems = _.flatten(_.values(dupItems));
    //console.log(dupItems);

    return (
      <div className={"NeedsReview"}>
        <div className="review-items">
          <h4>{type.charAt(0).toUpperCase() + type.slice(1)}s needing review</h4>
          { React.createElement(typeMap[type], {items: reviewItems}) }
        </div>

        { dupItems.length &&
          <div className="duplicate-items">
            <h4>Potential duplicate items</h4>
            { React.createElement(typeMap[type], {items: dupItems}) }
          </div>
        }
      </div>
    );
  }
}


export default withTracker(({match}) => {
  const type = match.path.split('/').pop().replace(/s$/, '');
  const collection = musicCollection[type];
  const sub = Meteor.subscribe('NeedsReview', type);

  return {
    type,
    loading: !sub.ready(),
    items: collection.find({}).fetch(),
    // items: collection.find({$or: [
    //   {needsReview: true},
    //   {dataMaybeMissing: {$exists: true, $ne: []}}
    // ]}).fetch()
  };
})(NeedsReview);
