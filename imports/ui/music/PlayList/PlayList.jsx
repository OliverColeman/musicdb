import React from 'react';
import PropTypes from 'prop-types';
import autoBind from 'react-autobind';
import { ButtonToolbar, ButtonGroup, Button, Label, Modal } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';
import moment from 'moment';
import update from 'immutability-helper';

import Access from '../../../modules/access';
import EditInline from '../../misc/EditInline/EditInline.jsx';
import PlayListCollection from '../../../api/PlayList/PlayList';
import TrackCollection from '../../../api/Track/Track';
import CompilerCollection from '../../../api/Compiler/Compiler';
import { convertSecondsToHHMMSS } from '../../../modules/util';
import TrackList from '../Track/TrackList';
import CompilerList from '../Compiler/CompilerList';
import Group from '../Group/Group';
import Tag from '../Tag/Tag';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';
import LinkOrNot from '../../misc/LinkOrNot/LinkOrNot';
import SearchTracks from '../Search/SearchTracks';
import IconsAndLinks from '../IconsAndLinks/IconsAndLinks';

import './PlayList.scss';


class PlayList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showSearchTracks: false,
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


  handleTrackRemove(track) {
    Meteor.call('PlayList.removeTrack', this.props.playList._id, track.indexInList, (error, list) => {
      if (error) {
        Bert.alert(error.reason ? error.reason : error.message, 'danger');
      }
    });
  }


  handleTrackDrop(draggedTrackIndex, insertIndex) {
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
    const { loading, playList, viewType, showDate, noLinks, user, tracks, compilers } = this.props;
    const { showSearchTracks } = this.state;

    if (loading) return (<Loading />);
    if (!playList && viewType == 'page') return (  <NotFound /> );
    if (!playList) return ( <div className="PlayList not-found" /> );

    const editable = Access.allowed({accessRules: PlayListCollection.access, op: 'update', item: playList, user});

    if (viewType == 'inline') {
      const title = playList.name + (showDate ? " (" + moment.unix(playList.date).format('YYYY-MM-DD') + ")" : '');
      return (
        <LinkOrNot link={!noLinks} to={`/list/${playList._id}`} title={title} className={"PlayList inline-viewtype name"}>
          {title}
        </LinkOrNot>
      );
    }

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
            <CompilerList items={compilers} viewType='inline' noLinks={noLinks} />
          </span>
        </div>

        <div className="duration">
          <span className="data">{convertSecondsToHHMMSS(playList.duration)}, {playList.trackIds.length}&nbsp;tracks</span>
        </div>

        <IconsAndLinks type='playlist' item={playList} />
      </div>
    );


    const showTracks = tracks.length > 0;
    // Get Tracks in order (when/if available and applicable).
    const tracksMod = showTracks && playList.trackIds
      .map(trackId => tracks.find(t => t._id == trackId))
      .filter(t => !!t);

    return (
      <div className={"PlayList " + viewType + "-viewtype"}>
        <div className="item-details">
          <div className="item-header">
            <LinkOrNot link={!noLinks && viewType != 'page'} className="name" to={`/list/${playList._id}`}>
              {viewType == 'page' && editable ?
                <EditInline doc={playList} field="name" updateMethod="playlist.update" inputType={EditInline.types.textfield} />
                :
                playList.name
              }
            </LinkOrNot>
            <IconsAndLinks type='playlist' item={playList} showPlayer={true} />
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
              <CompilerList items={compilers} viewType='inline' noLinks={noLinks} />
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
          <div className="tracks-wrapper">
            <TrackList
              items={tracksMod}
              noLinks={noLinks}
              onDrop={editable && this.handleTrackDrop}
              onRemove={editable && this.handleTrackRemove}
              showMostRecentPlayList={viewType == 'page'}
            />
          </div>
        }

        <Modal className="playlist-add-track" show={showSearchTracks}>
          <Modal.Header><Modal.Title>
            <span>Add track to { playList.name }</span>
            <Button className='btn btn-default' onClick={() => this.setState({showSearchTracks: false})}>Cancel</Button>
          </Modal.Title></Modal.Header>
          <Modal.Body>
            <SearchTracks
              importFromServices={true}
              inPlayListsWithGroupId={false}
              onSelect={this.handleTrackAdd}
              onCancel={() => this.setState({showSearchTracks: false})}
            />
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
  const showCompilers = viewType == "page" || viewType == 'list';

  const subList = playList ? null : Meteor.subscribe('PlayList', playListId, showTracks, showCompilers);

  playList = playList || PlayListCollection.findOne(playListId);

  return {
    loading: subList && !subList.ready(),
    playList,
    tracks: (!playList || !showTracks) ? [] : TrackCollection.find({_id: {$in: playList.trackIds}}).fetch(),
    compilers: (!playList || !showCompilers) ? [] : CompilerCollection.find({_id: {$in: playList.compilerIds}}).fetch(),
    viewType,
    showDate,
    noLinks,
    user: Meteor.user(),
  };
}) (PlayList);
