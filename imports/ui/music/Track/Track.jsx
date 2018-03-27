import React from 'react';
import PropTypes from 'prop-types';
import autoBind from 'react-autobind';
import { ButtonToolbar, ButtonGroup, Button } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';
import { findDOMNode } from 'react-dom';
import { DragSource, DropTarget } from 'react-dnd';
import flow from 'lodash/flow';
import classNames from 'classnames';

import { convertSecondsToHHMMSS } from '../../../modules/util';
import TrackCollection from '../../../api/Track/Track';
import PlayList from '../PlayList/PlayList';
import PlayListCollection from '../../../api/PlayList/PlayList';
import Album from '../Album/Album';
import Artist from '../Artist/Artist';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';
import LinkOrNot from '../../misc/LinkOrNot/LinkOrNot';
import dndTypes from '../DnDTypes';

import './Track.scss';



const dragSource = {
	beginDrag(props) {
		return {
			id: props.track._id,
			indexInPlaylist: props.track.indexInPlaylist,
		}
	},
}

const dragTarget = {
	hover(props, monitor, component) {
    const draggedTrackIndex = monitor.getItem().indexInPlaylist;
		const hoveredTrackIndex = props.track.indexInPlaylist;
		// Determine rectangle on screen.
		const hoverBoundingRect = findDOMNode(component).getBoundingClientRect();
		// Get vertical middle.
		const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
		// Determine mouse position.
		const clientOffset = monitor.getClientOffset();
		// Get pixels to the top.
		const hoverClientY = clientOffset.y - hoverBoundingRect.top;
		// insert index depends on position of mouse cursor relative to hovered track.
    const insertIndex = hoveredTrackIndex + (hoverClientY > hoverMiddleY ? 1 : 0);
		props.onDrag(draggedTrackIndex, insertIndex);
	},
	drop(props, monitor, component) {
		props.onDrop();
	}
}


class Track extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);
  }

  render() {
    const { loading, loadingPlayLists, playLists, track, viewType, noImage, noLinks, onClick,
            isDragging, hoveredTop, hoveredBottom, connectDragSource, connectDropTarget, } = this.props;

    if (loading) return (<Loading />);
    if (!track) return (<NotFound />);

    // Note that connectDragSource and connectDropTarget are inluded in all contexts even though
    // not all contexts support drag and drop, because otherwise react-dnd gets sad.

    if (viewType == 'inline') return connectDragSource(connectDropTarget(
      <LinkOrNot link={!noLinks} to={`/track/${track._id}`} title={track.name} className="Track inline-viewtype name">
        {track.name}
      </LinkOrNot>
    ));

    if (viewType == 'list') return connectDragSource(connectDropTarget(
      <div
        className={classNames("Track", viewType + "-viewtype", {"dragging": isDragging}, {"hovered-top": hoveredTop}, {"hovered-bottom": hoveredBottom})}
        onClick={(e) => { if (onClick) onClick(e, track)}}
      >
        { noImage ? '' :
          <div className="album album-image image">
            { !track.albumId ? '' : <Album albumId={track.albumId} viewType="track" viewType="image-small" /> }
          </div>
        }

        <LinkOrNot link={!noLinks} to={`/track/${track._id}`} title={track.name} className={"Track inline-viewtype name"}>
          {track.name}
        </LinkOrNot>

        <div className="artists inline-list">
          { track.artistIds.map(artistId => (<Artist artistId={artistId} key={artistId} viewType="inline" noLinks={noLinks} />)) }
        </div>

        { !track.albumId ?
          <div>[unknown]</div>[unknown] :
          <Album albumId={track.albumId} viewType="track" viewType="inline" noLinks={noLinks} />
        }

        <div className="duration" title="Duration">{convertSecondsToHHMMSS(track.duration, true)}</div>
      </div>
    ));

    // viewType == 'page'
    return connectDragSource(connectDropTarget(
      <div className={"Track " + viewType + "-viewtype"}>
        <div className="item-header">
          <LinkOrNot link={!noLinks} className="name" to={`/track/${track._id}`}>{track.name}</LinkOrNot>
        </div>

        <div className="album album-image image">
          { !track.albumId ? '' : <Album albumId={track.albumId} viewType="track" viewType="image-medium" /> }
        </div>

        <div className="artists inline-list">
          { track.artistIds.map(artistId => (<Artist artistId={artistId} key={artistId} viewType="inline" noLinks={noLinks} />)) }
        </div>

        <Album albumId={track.albumId} viewType="inline" noLinks={noLinks} />

        <div className="duration" title="Duration">{convertSecondsToHHMMSS(track.duration, true)}</div>

        <div className="playLists">
          <div className="header-row">
            { ["Name", "Date", "Compiler", "Length"].map(h => (
              <div className={"header-cell header-" + h} key={h}>{h}</div>
            ))}
          </div>

          { loadingPlayLists ? (<Loading />) : playLists.map(playlist => (
            <PlayList playList={playlist} viewType="list" key={playlist._id} showDate={true} noLinks={noLinks} />
          ))}
        </div>
      </div>
    ));
  }
}

export default flow(
  DragSource(dndTypes.TRACK, dragSource, (connect, monitor) => ({
  	connectDragSource: connect.dragSource(),
  	isDragging: monitor.isDragging(),
  })),
  DropTarget(dndTypes.TRACK, dragTarget, connect => ({
  	connectDropTarget: connect.dropTarget(),
  })),
  withTracker(({ match, trackId, track, viewType, noImage, noLinks, onClick, onDrag, onDrop, hoveredTop, hoveredBottom }) => {
    trackId = trackId || track && track._id || match.params.trackId

    viewType = viewType || "page";
    const subscription = track ? null : Meteor.subscribe('Track.withId', trackId);

    const subPlayLists = viewType == 'page' && Meteor.subscribe('Track.playLists', trackId);

    return {
      loading: subscription && !subscription.ready(),
      track: track || TrackCollection.findOne(trackId),
      loadingPlayLists: subPlayLists && !subPlayLists.ready(),
      playLists: subPlayLists && PlayListCollection.find({ trackIds: trackId}).fetch(),
      viewType,
      noImage,
      noLinks,
      onDrag, onDrop,
      hoveredTop, hoveredBottom,
    };
  })
) (Track);
