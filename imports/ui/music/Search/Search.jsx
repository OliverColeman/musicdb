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
import SearchResults from './SearchResults';

import './Search.scss';


class Search extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);

    const search = this.extractSearchText(this.props);
    this.state = {
      formText: search,
      searchText: search,
    }
  }


  extractSearchText(props) {
    return !props.location.hash ? '' : props.location.hash.replace(/(#|%20)/g, ' ').trim();
  }


  componentWillReceiveProps(props) {
    const search = this.extractSearchText(props);
    this.setState({
      formText: search,
      searchText: search,
    })
  }


  handleChange(event) {
    this.setState({formText: event.target.value});

    if (this.updateSearchTimeoutHandle) Meteor.clearTimeout(this.updateSearchTimeoutHandle);
    this.updateSearchTimeoutHandle = Meteor.setTimeout(this.updateSearchFromForm, 500);
  }


  updateSearchFromForm() {
    const { history, location } = this.props;
    history.push({
      pathname: location.pathName,
      hash: this.state.formText,
    });
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

        { searchText && <div className="results">
          <div className="track-results">
            <h4>Tracks</h4>
            <SearchTrackResults
              mixedNames={searchText}
              limit={10}
              importFromServices={false}
              inPlayListsWithGroupId={inPlayListsWithGroupId}
            />
          </div>

          { ['Artist', 'Compiler', 'Playlist'].map(type => (
            <div className={type.toLowerCase() + "-results"} key={type}>
              <h4>{type}s</h4>
              <SearchResults
                type={type.toLowerCase()}
                name={searchText}
                limit={10}
              />
            </div>
          ))}
        </div> }
      </div>
    );
  }
}


export default withTracker(({ history, location, importFromServices, inPlayListsWithGroupId, onSelect }) => {
  return {
    history,
    location,
    importFromServices,
    inPlayListsWithGroupId,
    onSelect,
  };
})(Search);
