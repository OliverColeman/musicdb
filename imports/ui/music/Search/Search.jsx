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

import './Track.scss';


class Search extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      formText: '',
      searchText: '',
    }

    autoBind(this);
  }


  handleChange(event) {
    this.setState({formText: event.target.value});

    if (this.updateSearchTimeoutHandle) Meteor.clearTimeout(this.updateSearchTimeoutHandle);
    this.updateSearchTimeoutHandle = Meteor.setTimeout(this.updateSearch, 500);
  }


  updateSearch() {
    this.setState({searchText: this.state.formText});
  }


  render() {
    const { inPlayListsWithGroupId } = this.props;
    const { formText, searchText } = this.state;

    return (
      <div className="Search">
        <form>
          <FormGroup className="search-fields">
            <FormControl type="text" value={formText} placeholder="Search" onChange={e => this.handleChange(e)} />
          </FormGroup>
        </form>

        <SearchTrackResults
          mixedNames={searchText}
          limit={10}
          importFromServices={false}
          inPlayListsWithGroupId={inPlayListsWithGroupId}
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
})(Search);
