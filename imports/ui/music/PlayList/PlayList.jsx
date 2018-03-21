import React from 'react';
import PropTypes from 'prop-types';
import autoBind from 'react-autobind';
import { ButtonToolbar, ButtonGroup, Button, Label, Modal } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';
import moment from 'moment';

import PlayListCollection from '../../../api/PlayList/PlayList';
import TrackCollection from '../../../api/Track/Track';
import { convertSecondsToHHMMSS } from '../../../modules/util';
import Track from '../Track/Track';
import Compiler from '../Compiler/Compiler';
import Tag from '../Tag/Tag';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';
import LinkOrNot from '../../misc/LinkOrNot/LinkOrNot';
import SearchTracks from '../Track/SearchTracks';

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
    console.log(track);
    const { playList } = this.props;
    Meteor.call('PlayList.addTracks', playList._id, [track._id], (error, list) => {
      if (error) {
        Bert.alert(error.reason ? error.reason : error.message, 'danger');
      }
    });
    this.setState({showSearchTracks: false});
  }


  render() {
    const { loading, loadingTracks, playList, viewType, showDate, noLinks } = this.props;
    const { showSearchTracks } = this.state;

    if (loading) return (<Loading />);
    if (!playList && viewType == 'page') return (  <NotFound /> );
    if (!playList) return ( <div className="PlayList not-found" /> );

    if (viewType == 'inline') return (
      <LinkOrNot link={!noLinks} to={`/list/${playList._id}`} title={playList.name} className={"PlayList inline-viewtype name"}>
        {playList.name}
      </LinkOrNot>);

    const showTracks = viewType == "page";
    // Get Tracks in order (when/if available and applicable).
    const tracks = !loadingTracks && showTracks && playList.trackIds.map(trackId => TrackCollection.findOne(trackId)).filter(t => t);

    return (
      <div className={"PlayList " + viewType + "-viewtype"}>
        <div className="item-header">
          <LinkOrNot link={!noLinks} className="name" to={`/list/${playList._id}`}>{playList.name}</LinkOrNot>

          {viewType != 'page' || !playList.spotifyUserId || !playList.spotifyId ? '' :
            <a className="link spotify" title="Show in Spotify" target="_blank" href={`https://open.spotify.com/user/${playList.spotifyUserId}/playlist/${playList.spotifyId}`} />
          }
        </div>

        { !showDate ? '' :
          <div className="date">
            { viewType == 'page' ? <Label>Date:</Label> : '' }
            <span className="data">{moment.unix(playList.date).format('YYYY-MM-DD')}</span>
          </div>
        }

        <div className="compilers inline-list">
          { viewType == 'page' ? <Label>Created by:</Label> : '' }
          <span className="data">
            { playList.compilerIds.map(compilerId => (<Compiler compilerId={compilerId} viewType="inline" noLinks={noLinks} key={compilerId} />)) }
          </span>
        </div>

        <div className="duration">
          { viewType == 'page' ? <Label>Duration:</Label> : '' }
          <span className="data">{convertSecondsToHHMMSS(playList.duration)}, {playList.trackIds.length}&nbsp;tracks</span>
        </div>

        { viewType != 'page' ? '' : <div className="tags inline-list">
          <Label>Tags:</Label>
          <span className="data">
            { playList.tagIds.map(tagId => (<Tag tagId={tagId} viewType="inline" key={tagId} />)) }
          </span>
        </div>}

        { viewType != 'page' ? '' :
          <Button className='btn btn-success' onClick={() => this.setState({showSearchTracks: true})}>Add track</Button>
        }

        { !showTracks ? '' :
          <div className="tracks-wrapper">
            <div className="tracks">
              <div className="header-row">
                { ["Cover", "Title", "Artist", "Album", "Length"].map(h => (
                  <div className={"header-cell header-" + h} key={h}>{h}</div>
                ))}
              </div>

              { loadingTracks ? (<Loading />) : tracks.map(track => (
                <Track track={track} viewType="list" noLinks={noLinks} key={track._id} />
              ))}
            </div>
          </div>
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


export default withTracker(({match, playList, playListId, spotifyId, viewType, showDate, noLinks}) => {
  viewType = viewType || "page";
  playListId = playListId || (playList && playList._id) || (match && match.params && match.params.playListId);

  if (typeof showDate == 'undefined') showDate = viewType == 'page';

  const subList = playList ? null : Meteor.subscribe('PlayList.withId', playListId, spotifyId);
  const subTracks = viewType == 'page' && Meteor.subscribe('PlayList.tracks', playListId, spotifyId);

  const listSelector = spotifyId ? { spotifyId } : { _id: playListId };

  return {
    loading: subList && !subList.ready(),
    loadingTracks: subTracks && !subTracks.ready(),
    playList: playList || PlayListCollection.findOne(listSelector),
    viewType,
    showDate,
    noLinks,
  };
})(PlayList);
