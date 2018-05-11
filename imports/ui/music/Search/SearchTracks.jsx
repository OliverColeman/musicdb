import React from 'react';
import PropTypes from 'prop-types';
import autoBind from 'react-autobind';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button, FormControl, FormGroup } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';

import TrackCollection from '../../../api/Track/Track';
import Album from '../Album/Album';
import Artist from '../Artist/Artist';
import Loading from '../../misc/Loading/Loading';
import SearchTrackResults from './SearchTrackResults';

import './Search.scss';


class SearchTracks extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      formValues: {
        artist: '',
        album: '',
        track: '',
      },
      searchValues: {
        artist: '',
        album: '',
        track: '',
      }
    }

    autoBind(this);
  }


  handleChange(type, event) {
    const { formValues } = this.state;
    formValues[type] = event.target.value;
    this.setState({formValues});

    if (this.updateSearchTimeoutHandle) Meteor.clearTimeout(this.updateSearchTimeoutHandle);
    this.updateSearchTimeoutHandle = Meteor.setTimeout(this.updateSearch, 500);
  }


  updateSearch() {
    this.setState({searchValues: {...this.state.formValues}});
  }


  render() {
    const { importFromServices, inPlayListsWithGroupId, onSelect } = this.props;
    const { formValues, searchValues } = this.state;

    return (
      <div className="SearchTracks">
        <form>
          <FormGroup className="search-fields">
            <FormControl type="text" value={formValues.album} placeholder="Album" onChange={e => this.handleChange('album', e)} />
            <FormControl type="text" value={formValues.artist} placeholder="Artist" onChange={e => this.handleChange('artist', e)} />
            <FormControl type="text" value={formValues.track} placeholder="Track" onChange={e => this.handleChange('track', e)} className="track" />
          </FormGroup>
        </form>

        <SearchTrackResults
          artistName={searchValues.artist}
          albumName={searchValues.album}
          trackName={searchValues.track}
          limit={10}
          importFromServices={importFromServices}
          inPlayListsWithGroupId={inPlayListsWithGroupId}
          onSelect={onSelect}
        />
      </div>
    );
  }
}


export default withTracker(({ importFromServices, inPlayListsWithGroupId, onSelect }) => {
  return {
    importFromServices,
    inPlayListsWithGroupId,
    onSelect,
  };
})(SearchTracks);
