import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button, Label } from 'react-bootstrap';
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

import './PlayList.scss';


class PlayList extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { loading, loadingTracks, playList, viewContext, showDate } = this.props;

    if (loading) return (<Loading />);
    if (!playList && viewContext == 'page') return (  <NotFound /> );
    if (!playList) return ( <div className="PlayList not-found" /> );

    if (viewContext == 'inline') return (
      <Link to={`/list/${playList._id}`} title={playList.name} className={"PlayList inline-context name"}>
        {playList.name}
      </Link>);

    const showTracks = viewContext == "page";
    // Get Tracks in order (when/if available and applicable).
    const tracks = !loadingTracks && showTracks && playList.trackIds.map(trackId => TrackCollection.findOne(trackId)).filter(t => t);

    return (
      <div className={"PlayList " + viewContext + "-context"}>
        <div className="item-header">
          <Link className="name" to={`/list/${playList._id}`}>{playList.name}</Link>

          {viewContext != 'page' || !playList.spotifyUserId || !playList.spotifyId ? '' :
            <a className="link spotify" title="Show in Spotify" target="_blank" href={`https://open.spotify.com/user/${playList.spotifyUserId}/playlist/${playList.spotifyId}`} />
          }
        </div>

        { showDate ? <div className="date">{moment.unix(playList.date).format('YYYY-MM-DD')}</div> : '' }

        <div className="compilers inline-list">
          { viewContext == 'page' ? <Label>Created by:</Label> : '' }
          { playList.compilerIds.map(compilerId => (<Compiler compilerId={compilerId} viewContext="inline" key={compilerId} />)) }
        </div>

        <div className="duration">
          { viewContext == 'page' ? <Label>Duration:</Label> : '' }
          {convertSecondsToHHMMSS(playList.duration)}, {playList.trackIds.length} tracks
        </div>

        { viewContext != 'page' ? '' : <div className="tags inline-list">
          <Label>Tags:</Label>
          { playList.tagIds.map(tagId => (<Tag tagId={tagId} viewContext="inline" key={tagId} />)) }
        </div>}

        { !showTracks ? '' :
          <div className="tracks">
            <div className="header-row">
              { ["Cover", "Title", "Artist", "Album", "Length"].map(h => (
                <div className={"header-cell header-" + h} key={h}>{h}</div>
              ))}
            </div>

            { loadingTracks ? (<Loading />) : tracks.map(track => (
              <Track track={track} viewContext="list" key={track._id} />
            ))}
          </div>
        }
      </div>
    );
  }
}


export default withTracker(({match, playList, playListId, spotifyId, viewContext, showDate}) => {
  viewContext = viewContext || "page";
  playListId = playListId || (playList && playList._id) || (match && match.params && match.params.playListId);

  const subList = playList ? null : Meteor.subscribe('PlayList.withId', playListId, spotifyId);
  const subTracks = viewContext == 'page' && Meteor.subscribe('PlayList.tracks', playListId, spotifyId);

  const listSelector = spotifyId ? { spotifyId } : { _id: playListId };

  return {
    loading: subList && !subList.ready(),
    loadingTracks: subTracks && !subTracks.ready(),
    playList: playList || PlayListCollection.findOne(listSelector),
    viewContext,
    showDate,
  };
})(PlayList);
