import React from 'react';
import PropTypes from 'prop-types';
import autoBind from 'react-autobind';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button, FormControl, FormGroup } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';
import _ from 'lodash';

import { normaliseString } from '../../../modules/util';
import { searchScore, searchQuery } from '../../../api/Music/search';
import { musicSearchCollection } from '../../../api/Music/collections';
import ArtistList from '../Artist/ArtistList';
import CompilerList from '../Compiler/CompilerList';
import PlayListList from '../PlayList/PlayListList';
import TrackList from '../Track/TrackList';
import Loading from '../../misc/Loading/Loading';

import './Search.scss';


const typeComponent = {
  artist: ArtistList,
  compiler: CompilerList,
  playlist: PlayListList,
  track: TrackList,
}


class SearchResults extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);
  }


  render() {
    const { loading, type, terms, items, limit, onSelect } = this.props;

    if (loading) return (<div className="SearchResults"><Loading /></div>);

    // The items will already have a score, but if multiple searches are open
    // the scores may be for different search terms.
    const searchScoreKey = 'searchscore_' + normaliseString(terms);
    const itemsSorted = _.sortBy(items, [searchScoreKey]).slice(0, Math.min(items.length, limit));

    return (
      <div className="SearchResults">
        { (terms && items.length == 0) ?
          <div className="no-results">Nada.</div>
          :
          <div className={"items-wrapper" + (!!onSelect && ' selectable')}>
            { React.createElement(typeComponent[type], {
              items: itemsSorted,
              noMenu: true,
              compactView: true,
              viewType: "list",
              showMostRecentPlayList: true,
              noLinks: !!onSelect,
              onClick: onSelect,
            })}
          </div>
        }
      </div>
    );
  }
}


export default withTracker(({ type, terms, limit, inPlayListsWithGroupId, importFromServices, onSelect }) => {
  terms = terms ? terms.trim() : '';

  if (type == 'track') {
    if (typeof inPlayListsWithGroupId == 'undefined') {
    	// TODO get group from logged in user or something.
    	const group = Meteor.groups.findOne({name: "JD"});
      inPlayListsWithGroupId = group._id;
    }
    else {
      // publication function only accepts strings or undefined, but allow passing truthy values to this component.
      inPlayListsWithGroupId = inPlayListsWithGroupId ? inPlayListsWithGroupId : undefined;
    }
  }

  const subscription = terms && Meteor.subscribe('search', {type, terms, limit, inPlayListsWithGroupId, importFromServices});

  return {
    loading: subscription && !subscription.ready(),
    terms,
    limit,
    items: subscription ? searchQuery({type, terms, inPlayListsWithGroupId}).fetch() : [],
    onSelect,
    //items: subscription ? musicSearchCollection[type].find().fetch() : [],
  };
})(SearchResults);
