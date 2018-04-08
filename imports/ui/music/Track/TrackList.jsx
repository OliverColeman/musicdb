import React from 'react';
import PropTypes from 'prop-types';
import autoBind from 'react-autobind';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';

import Access from '../../../modules/access';
import { convertSecondsToHHMMSS } from '../../../modules/util';
import Track from '../Track/Track';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';

import './Track.scss';


class TrackList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      draggedTrackIndex: -1,
      insertIndex: -1,
    }
    autoBind(this);
  }


  handleTrackDrag(draggedTrackIndex, insertIndex) {
    if (!this.props.onDrop) return;
    this.setState({draggedTrackIndex, insertIndex});
  }
  handleTrackDrop() {
    if (!this.props.onDrop) return;
    const { draggedTrackIndex, insertIndex } = this.state;
    this.setState({draggedTrackIndex: -1, insertIndex: -1});
    this.props.onDrop(draggedTrackIndex, insertIndex);
  }


  render() {
    const { tracks, noLinks, onDrop } = this.props;
    const { draggedTrackIndex, insertIndex } = this.state;

    // We keep track of when tracks are duplicated, so we can make sure to
    // provide a unique key for the React map below.
    const coveredTracks = [];
    const tracksMod = tracks.map((track, idx) => {
      let isRepeat = coveredTracks.includes(track._id);
      if (!isRepeat) coveredTracks.push(track._id);
      return {
        indexInList: idx, // used in drag and drop.
        keyUniquifier: isRepeat ? idx : '',
        ...track
      }
    });

    return (
      <div className="TrackList">
        <div className="header-row">
          { ["Cover", "Title", "Artist", "Album", "Length", "Icons"].map(h => (
            <div className={"header-cell header-" + h} key={h}>{h}</div>
          ))}
        </div>

        { tracksMod.map((track, index) => (
          <Track
            track={track}
            viewType="list"
            noLinks={noLinks}
            showIconsAndLinks={true}
            onDrag={this.handleTrackDrag}
            onDrop={this.handleTrackDrop}
            dropAllowed={!!onDrop}
            key={track._id + track.keyUniquifier}
            hoveredTop={index==insertIndex}
            hoveredBottom={index==insertIndex-1}
          />
        ))}
      </div>
    );
  }
}

export default withTracker(({items, noLinks, onDrop}) => {
  return {
    tracks: items,
    noLinks,
    onDrop
  };
}) (TrackList);
