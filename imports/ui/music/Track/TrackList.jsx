import React from 'react';
import PropTypes from 'prop-types';
import autoBind from 'react-autobind';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { DropdownButton, MenuItem, Checkbox } from 'react-bootstrap';

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


  updateCompactView() {
    const { user, compactView } = this.props;
    if (user) {
      user.profile.settings.ui.compactView = !compactView;
      Meteor.call('users.updateProfile', user.profile);
    }
    else {
      Session.set('TrackList-compactView', !compactView)
    }
  }


  render() {
    const { tracks, noLinks, noMenu, compactView, onDrop, onRemove, onClick } = this.props;
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

    const headers = (compactView ? [] : ["Cover"]).concat(["Title", "Artist", "Album", "Length", "Icons"]);

    return (
      <div className="TrackList">
        <div className="header-row">
          { headers.map(h => (
            <div className={"header-cell header-" + h} key={h}>{h}</div>
          ))}

          { !noMenu && <div className={"header-cell header-Menu context-menu"}>
            <DropdownButton title="☰" id="menu-tracklist" noCaret={true}>
    					<MenuItem eventKey="1">
  							<Checkbox checked={compactView} onChange={this.updateCompactView}>
                  Compact view
  							</Checkbox>
  						</MenuItem>
  					</DropdownButton>
    			</div> }
        </div>

        { tracksMod.map((track, index) => (
          <Track
            track={track}
            viewType={"list" + (compactView ? '-compact' : '')}
            noLinks={noLinks}
            showIconsAndLinks={true}
            onDrag={this.handleTrackDrag}
            onDrop={this.handleTrackDrop}
            dropAllowed={!!onDrop}
            key={track._id + track.keyUniquifier}
            hoveredTop={index==insertIndex}
            hoveredBottom={index==insertIndex-1}
            onRemove={onRemove}
            onClick={() => onClick && onClick(track)}
          />
        ))}
      </div>
    );
  }
}

export default withTracker(({items, noLinks, noMenu, compactView, onDrop, onRemove, onClick}) => {
  const user = Meteor.user();

  if (typeof compactView == 'undefined') {
    if (user) {
      compactView = user.profile.settings.ui.compactView;
    }
    else {
      Session.setDefault('TrackList-compactView', false);
      compactView = Session.get('TrackList-compactView');
    }
  }

  return {
    user,
    tracks: items,
    noLinks,
    noMenu,
    compactView,
    onDrop,
    onRemove
  };
}) (TrackList);
