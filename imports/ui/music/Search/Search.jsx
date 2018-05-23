import React from 'react';
import PropTypes from 'prop-types';
import autoBind from 'react-autobind';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button, FormControl, FormGroup } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';
import classNames from 'classnames';

import TrackCollection from '../../../api/Track/Track';
import Album from '../Album/Album';
import Artist from '../Artist/Artist';
import Loading from '../../misc/Loading/Loading';
import SearchResults from './SearchResults';

import './Search.scss';


const typeLabel = {
  track: 'Track',
  artist: 'Artist',
  compiler: 'Compiler',
  playlist: 'Playlist'
}


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
    if (!props.location) return '';
    return !props.location.hash ? '' : props.location.hash.replace(/(#|%20)/g, ' ').trim();
  }


  componentWillReceiveProps(props) {
    if (props.location) {
      const search = this.extractSearchText(props);
      this.setState({
        formText: search,
        searchText: search,
      });
    }
  }


  handleChange(event) {
    const terms = event.target.value;
    this.setState({formText: terms});

    if (this.updateSearchTimeoutHandle) Meteor.clearTimeout(this.updateSearchTimeoutHandle);
    this.updateSearchTimeoutHandle = Meteor.setTimeout(this.updateSearchFromForm, terms.length < 5 ? 1000 : 500);
  }


  updateSearchFromForm() {
    const { history, location } = this.props;
    if (location) {
      history.push({
        pathname: location.pathName,
        hash: this.state.formText,
      });
    }
    else {
      this.setState({
        searchText: this.state.formText
      });
    }
  }


  render() {
    const { types, limit, inPlayListsWithGroupId, importFromServices, onSelect } = this.props;
    const { formText, searchText } = this.state;

    return (
      <div className={classNames("Search", ...types)}>
        <form>
          <FormGroup className="search-fields">
            <FormControl type="text" value={formText} placeholder="Search" onChange={e => this.handleChange(e)} />
          </FormGroup>
        </form>

        { searchText && <div className="results">
          { types.map(type => (
            <div className={type + "-results"} key={type}>
              <h4>{typeLabel[type]}s</h4>
              <SearchResults
                type={type}
                terms={searchText}
                limit={limit || (type == 'track' ? 9 : 10)}
                inPlayListsWithGroupId={inPlayListsWithGroupId}
                importFromServices={importFromServices}
                onSelect={onSelect}
              />
            </div>
          ))}
        </div> }
      </div>
    );
  }
}


export default withTracker(({ history, location, types, limit, importFromServices, inPlayListsWithGroupId, onSelect }) => {
  types = types || Object.keys(typeLabel);

  return {
    history,
    location,
    limit,
    importFromServices,
    inPlayListsWithGroupId,
    onSelect,
    types,
  };
})(Search);
