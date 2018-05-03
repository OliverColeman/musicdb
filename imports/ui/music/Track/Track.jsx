import React from 'react';
import PropTypes from 'prop-types';
import autoBind from 'react-autobind';
import { ButtonToolbar, ButtonGroup, Button, DropdownButton, MenuItem } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';
import { findDOMNode } from 'react-dom';
import { DragSource, DropTarget } from 'react-dnd';
import flow from 'lodash/flow';
import classNames from 'classnames';

import { convertSecondsToHHMMSS } from '../../../modules/util';
import PlayListCollection from '../../../api/PlayList/PlayList';
import LinkedTrackCollection from '../../../api/LinkedTrack/LinkedTrack';
import TrackCollection from '../../../api/Track/Track';

import EditInline from '../../misc/EditInline/EditInline.jsx';
import PlayList from '../PlayList/PlayList';
import Album from '../Album/Album';
import Artist from '../Artist/Artist';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';
import LinkOrNot from '../../misc/LinkOrNot/LinkOrNot';
import dndTypes from '../DnDTypes';
import IconsAndLinks from '../IconsAndLinks/IconsAndLinks';
import PlayListList from '../PlayListList/PlayListList';
import TrackList from '../Track/TrackList';

import './Track.scss';



const dragSource = {
	beginDrag(props) {
		return {
			id: props.track._id,
			indexInList: props.track.indexInList,
		}
	}
}

const dragTarget = {
	canDrop(props) {
		return props.dropAllowed;
	},
	hover(props, monitor, component) {
		if (!props.dropAllowed) return;
    const draggedTrackIndex = monitor.getItem().indexInList;
		const hoveredTrackIndex = props.track.indexInList;
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
    const { group, loading, track, loadingPlayLists, playLists, loadingLinkedTracks, linkedTracks,
						viewType, noLinks, showIconsAndLinks, onClick, isDragging, hoveredTop,
						hoveredBottom, connectDragSource, connectDropTarget} = this.props;

    if (loading) return (<Loading />);
    if (!track) return (<NotFound />);

    const editable = !track.spotifyId && !track.mbId;

		const iconsAndLinks = showIconsAndLinks && viewType != 'list' ? (
			<div className="header-right">
				<IconsAndLinks type='track' item={track} showPlayer={viewType=='page'} />
				{this.renderMenu()}
			</div>
		) : '';

		const isCompactView = viewType.includes('compact');
		const isListView = viewType.includes('list');

    // Note that connectDragSource and connectDropTarget are inluded in all contexts even though
    // not all contexts support drag and drop, because otherwise react-dnd gets sad.

    if (viewType == 'inline') return connectDragSource(connectDropTarget(
      <LinkOrNot link={!noLinks} to={`/track/${track._id}`} title={track.name} className="Track inline-viewtype name">
        {track.name}
				{iconsAndLinks}
      </LinkOrNot>
    ));

    if (isListView) return connectDragSource(connectDropTarget(
      <div
        className={classNames("Track", viewType + "-viewtype", {"dragging": isDragging}, {"hovered-top": hoveredTop}, {"hovered-bottom": hoveredBottom})}
        onClick={(e) => { if (onClick) onClick(e, track)}}
      >
        { isCompactView ? '' :
          <div className="album album-image image">
            { track.albumId && <Album albumId={track.albumId} viewType="track" viewType="image-small" /> }
          </div>
        }

        <LinkOrNot link={!noLinks} to={`/track/${track._id}`} title={track.name} className={"Track inline-viewtype name"}>
          {track.name}
        </LinkOrNot>

        <div className="artists inline-list">
          { track.artistIds && track.artistIds.map(artistId => (<Artist artistId={artistId} key={artistId} viewType="inline" noLinks={noLinks} />)) }
        </div>

        { track.albumId ? <Album albumId={track.albumId} viewType="inline" noLinks={noLinks} /> : <div /> }

        <div className="duration" title="Duration">{convertSecondsToHHMMSS(track.duration, true)}</div>

				{showIconsAndLinks ? <IconsAndLinks type='track' item={track} showPlayer={false} /> : <div />}

				{this.renderMenu()}
      </div>
    ));


    // viewType == 'page'
		return connectDragSource(connectDropTarget(
      <div className={"Track " + viewType + "-viewtype"}>
        <div className="item-header">
          <LinkOrNot link={!noLinks && viewType != "page"} className="name" to={`/track/${track._id}`}>
            {viewType == 'page' && editable ?
              <EditInline doc={track} field="name" updateMethod="track.update" inputType={EditInline.types.textfield} />
              :
              track.name
            }
          </LinkOrNot>
					{iconsAndLinks}
        </div>

        <div className="album album-image image">
          { track.albumId && <Album albumId={track.albumId} viewType="track" viewType="image-medium" /> }
        </div>

        <div className="artists inline-list">
          { track.artistIds.map(artistId => (<Artist artistId={artistId} key={artistId} viewType="inline" noLinks={noLinks} />)) }
        </div>

        { track.albumId ? <Album albumId={track.albumId} viewType="inline" noLinks={noLinks} /> : <div /> }

        <div className="duration" title="Duration">{convertSecondsToHHMMSS(track.duration, true)}</div>

        <div className="play-lists">
					<h4>Appears in {group.name} play lists:</h4>
					<PlayListList items={playLists} loadingLists={loadingPlayLists} />
				</div>

				{ !loadingLinkedTracks && linkedTracks &&
					<div className="linked-tracks">
						<h4>Other versions of this track:</h4>
						{ loadingLinkedTracks ? <Loading /> : <TrackList items={linkedTracks} /> }
					</div>
				}
      </div>
    ));
  }


	renderMenu() {
		const {track, onRemove} = this.props;

		// Only action at the moment is remove from playlist.
		// TODO add stuff like "add to (other) playlist".
		if (!onRemove) return '';

		return (
			<div className="context-menu">
		    <DropdownButton title="☰" id={"menu-" + track._id} noCaret={true}>
					{ onRemove && <MenuItem eventKey="1" onClick={() => onRemove(track)}>
							Remove from playlist
						</MenuItem>
					}
		    </DropdownButton>
			</div>
	  );
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
  withTracker(({ match, trackId, track, viewType, noImage, noLinks, showIconsAndLinks, onClick, onDrag, onDrop, dropAllowed, hoveredTop, hoveredBottom, onRemove }) => {
		trackId = trackId || track && track._id || match && match.params.trackId

    viewType = viewType || "page";
		if (typeof showIconsAndLinks == 'undefined') showIconsAndLinks = viewType == "page";
    const subscription = track ? null : Meteor.subscribe('Track.withId', trackId);

		// TODO get group from logged in user or something.
		const group = Meteor.groups.findOne({name: "JD"});
    const subPlayLists = viewType == 'page' && Meteor.subscribe('Track.playLists', trackId, group._id);
		const playLists = subPlayLists && subPlayLists.ready() &&
											PlayListCollection.find({trackIds: trackId, groupId: group._id}).fetch();

		const subLinkedTracks = viewType == 'page' && Meteor.subscribe('LinkedTracks.forTrackId', trackId);
		const linkedTrackRecord = subLinkedTracks && LinkedTrackCollection.findOne({ trackIds: trackId });
		const linkedTrackIds = linkedTrackRecord && linkedTrackRecord.trackIds.filter(id => id != trackId);

    return {
			group,
      loading: subscription && !subscription.ready(),
      track: track || TrackCollection.findOne(trackId),
      loadingPlayLists: subPlayLists && !subPlayLists.ready(),
			playLists,
			loadingLinkedTracks: subLinkedTracks && !subLinkedTracks.ready(),
			linkedTracks: linkedTrackIds && TrackCollection.find({_id: {$in: linkedTrackIds}}).fetch(),
      viewType,
      noLinks,
			showIconsAndLinks,
      onDrag, onDrop, dropAllowed,
      hoveredTop, hoveredBottom,
			onRemove,
    };
  })
) (Track);
