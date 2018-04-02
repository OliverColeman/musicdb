import React from 'react';
import PropTypes from 'prop-types';
import autoBind from 'react-autobind';
import { ButtonToolbar, ButtonGroup, Button, Label, Modal } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';
import moment from 'moment';
import update from 'immutability-helper';
import ScrollArea from 'react-scrollbar';

import Access from '../../../modules/access';
import PlayListCollection from '../../../api/PlayList/PlayList';
import TrackCollection from '../../../api/Track/Track';
import { convertSecondsToHHMMSS } from '../../../modules/util';
import Track from '../Track/Track';
import Compiler from '../Compiler/Compiler';
import Group from '../Group/Group';
import Tag from '../Tag/Tag';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';
import LinkOrNot from '../../misc/LinkOrNot/LinkOrNot';
import SearchTracks from '../Track/SearchTracks';
import ServiceLinks from '../ServiceLinks/ServiceLinks';

import './PlayList.scss';


class PlayList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showSearchTracks: false,
      draggedTrackIndex: -1,
      insertIndex: -1,
    }
    autoBind(this);
  }


  handleTrackAdd(track) {
    const { playList } = this.props;
    Meteor.call('PlayList.addTracks', playList._id, [track._id], (error, list) => {
      if (error) {
        Bert.alert(error.reason ? error.reason : error.message, 'danger');
      }
    });
    this.setState({showSearchTracks: false});
  }


  handleTrackDrag(draggedTrackIndex, insertIndex) {
    this.setState({draggedTrackIndex, insertIndex});
  }
  handleTrackDrop() {
    const { draggedTrackIndex, insertIndex } = this.state;

    this.setState({draggedTrackIndex: -1, insertIndex: -1});

    if (draggedTrackIndex != insertIndex && draggedTrackIndex + 1 != insertIndex) {
      const trackId = this.props.playList.trackIds[draggedTrackIndex];
      Meteor.call('PlayList.moveTrack', this.props.playList._id, trackId, insertIndex, (error, list) => {
        if (error) {
          Bert.alert(error.reason ? error.reason : error.message, 'danger');
        }
      });
    }
  }


  render() {
    const { loading, playList, viewType, showDate, noLinks, user, tracks } = this.props;
    const { showSearchTracks, draggedTrackIndex, insertIndex } = this.state;

    if (loading) return (<Loading />);
    if (!playList && viewType == 'page') return (  <NotFound /> );
    if (!playList) return ( <div className="PlayList not-found" /> );

    const editable = Access.allowed(PlayListCollection, 'update', playList, user);


    if (viewType == 'inline') return (
      <LinkOrNot link={!noLinks} to={`/list/${playList._id}`} title={playList.name} className={"PlayList inline-viewtype name"}>
        {playList.name}
      </LinkOrNot>);


    if (viewType != 'page') return (
      <div className={"PlayList " + viewType + "-viewtype"}>
        <div className="item-header">
          <LinkOrNot link={!noLinks} className="name" to={`/list/${playList._id}`}>{playList.name}</LinkOrNot>
        </div>

        { showDate &&
          <div className="date">
            <span className="data">{moment.unix(playList.date).format('YYYY-MM-DD')}</span>
          </div>
        }

        <div className="compilers inline-list">
          <span className="data">
            { playList.compilerIds.map(compilerId => (<Compiler compilerId={compilerId} viewType="inline" noLinks={noLinks} key={compilerId} />)) }
          </span>
        </div>

        <div className="duration">
          <span className="data">{convertSecondsToHHMMSS(playList.duration)}, {playList.trackIds.length}&nbsp;tracks</span>
        </div>
      </div>
    );


    const showTracks = tracks.length > 0;
    // Get Tracks in order (when/if available and applicable).
    const coveredTracks = [];
    const tracksMod = showTracks && playList.trackIds.map((trackId, idx) => {
      // We keep track of when tracks are duplicated, so we can make sure to provide a unique key for the React map below.
      let isRepeat = coveredTracks.includes(trackId);
      if (!isRepeat) coveredTracks.push(trackId);
      let track = tracks.find(t => t._id == trackId);
      if (!track) return null;
      return {
        indexInPlaylist: idx,
        keyUniquifier: isRepeat ? idx : '',
        ...track
      }
    }).filter(t => !!t);

    return (
      <div className={"PlayList " + viewType + "-viewtype"}>
        <div className="playlist-details">
          <div className="item-header">
            <LinkOrNot link={!noLinks} className="name" to={`/list/${playList._id}`}>{playList.name}</LinkOrNot>
            <ServiceLinks type='playlist' item={playList} />
          </div>

          { showDate &&
            <div className="date">
              <Label>Date:</Label>
              <span className="data">{moment.unix(playList.date).format('YYYY-MM-DD')}</span>
            </div>
          }

          <div className="compilers inline-list">
            <Label>Created by:</Label>
            <span className="data">
              { playList.compilerIds.map(compilerId => (<Compiler compilerId={compilerId} viewType="inline" noLinks={noLinks} key={compilerId} />)) }
            </span>
          </div>

          <div className="duration">
            <Label>Duration:</Label>
            <span className="data">{convertSecondsToHHMMSS(playList.duration)}, {playList.trackIds.length}&nbsp;tracks</span>
          </div>

          { playList.groupId &&
            <div className="group">
              <Label>Group:</Label>
              <span className="data">
                <Group groupId={playList.groupId} viewType="inline" />
              </span>
            </div>
          }

          <div className="tags inline-list">
            <Label>Tags:</Label>
            <span className="data">
              { playList.tagIds && playList.tagIds.map(tagId => (<Tag tagId={tagId} viewType="inline" key={tagId} />)) }
            </span>
          </div>

          { editable &&
            <Button className='btn btn-success' onClick={() => this.setState({showSearchTracks: true})}>Add track</Button>
          }
        </div>

        { showTracks &&
          <ScrollArea speed={0.8} horizontal={false} className="tracks-wrapper">
            <div className="tracks">
              <div className="header-row">
                { ["Cover", "Title", "Artist", "Album", "Length", "Links"].map(h => (
                  <div className={"header-cell header-" + h} key={h}>{h}</div>
                ))}
              </div>

              { tracksMod.map((track, index) => (
                <Track
                  track={track}
                  viewType="list"
                  noLinks={noLinks}
                  showServiceLinks={true}
                  onDrag={this.handleTrackDrag}
                  onDrop={this.handleTrackDrop}
                  dropAllowed={editable}
                  key={track._id + track.keyUniquifier}
                  hoveredTop={index==insertIndex}
                  hoveredBottom={index==insertIndex-1}
                />
              ))}
            </div>
          </ScrollArea>
        }

        <Modal className="playlist-add-track" show={showSearchTracks}>
          <Modal.Header><Modal.Title>
            <span>Add track to { playList.name }</span>
            <Button className='btn btn-default' onClick={() => this.setState({showSearchTracks: false})}>Cancel</Button>
          </Modal.Title></Modal.Header>
          <Modal.Body>
            <SearchTracks onSelect={this.handleTrackAdd} onCancel={() => this.setState({showSearchTracks: false})} />
          </Modal.Body>
        </Modal>
      </div>
    );
  }
}

export default withTracker(({match, playList, playListId, viewType, showDate, noLinks}) => {
  viewType = viewType || "page";
  playListId = playListId || (playList && playList._id) || (match && match.params && match.params.playListId);

  if (typeof showDate == 'undefined') showDate = viewType == 'page';
  const showTracks = viewType == "page";

  const subList = playList ? null : Meteor.subscribe('PlayList.withId', playListId, showTracks);

  playList = playList || PlayListCollection.findOne(playListId);

  return {
    loading: subList && !subList.ready(),
    playList,
    tracks: (!playList || !showTracks) ? [] : TrackCollection.find({_id: {$in: playList.trackIds}}).fetch(),
    viewType,
    showDate,
    noLinks,
    user: Meteor.user(),
  };
}) (PlayList);
