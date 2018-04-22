import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button, Label } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';

import { musicCollection } from '../../../api/Music/collections';

import PlayListList from '../PlayListList/PlayListList';
import TrackList from '../Track/TrackList';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';

import './NeedsReview.scss';


const typeMap = {
  // album: Album,
  // artist: Artist,
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

    return (
      <div className={"NeedsReview"}>
        <h4>{type.charAt(0).toUpperCase() + type.slice(1)}s needing review</h4>
        { React.createElement(typeMap[type], {items}) }
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
    items: collection.find({$or: [
      {needsReview: true},
      {dataMaybeMissing: {$exists: true, $ne: []}}
    ]}).fetch()
  };
})(NeedsReview);
