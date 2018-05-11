import React from 'react';
import PropTypes from 'prop-types';
import autoBind from 'react-autobind';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button, FormControl, FormGroup } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';
import _ from 'lodash';

import { soundex, doubleMetaphone, findBySoundexOrDoubleMetaphone, levenshteinScore } from '../../../modules/util';
import { musicCollection } from '../../../api/Music/collections';
import ArtistList from '../Artist/ArtistList';
import CompilerList from '../Compiler/CompilerList';
import PlayListList from '../PlayList/PlayListList';
import Loading from '../../misc/Loading/Loading';

import './Search.scss';


const typeComponent = {
  artist: ArtistList,
  compiler: CompilerList,
  playlist: PlayListList,
}


class SearchResults extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);
  }


  render() {
    const { loading, type, name, items, limit } = this.props;

    if (loading) return (<div className="SearchResults"><Loading /></div>);

    const itemsScored = items.map(i => {
      const score = levenshteinScore(name, i.name);
      return { ...i, score};
    });
    const itemsSorted = _.sortBy(itemsScored, ['score']).slice(0, Math.min(itemsScored.length, limit));

    return (
      <div className="SearchResults">
        { (name && items.length == 0) ?
          <div className="no-results">Nada.</div>
          :
          <div className="items-wrapper">
            { React.createElement(typeComponent[type], {
              items: itemsSorted,
              noMenu: true,
              compactView: true,
              viewType: "list",
            })}
          </div>
        }
      </div>
    );
  }
}


export default withTracker(({ type, name, limit }) => {
  name = name ? name.trim() : '';

  // We can't use Levenshtein score to order the search server-side, so collect more
  // than we'll show and then sort by Levenshtein and then truncate to desired limit.
  const searchLimit = 100;

  subscription = name && Meteor.subscribe('search', type, name, limit: searchLimit);

  return {
    loading: subscription && !subscription.ready(),
    name,
    limit,
    items: subscription ? findBySoundexOrDoubleMetaphone(musicCollection[type], soundex(name), doubleMetaphone(name), null, limit: searchLimit).fetch() : [],
  };
})(SearchResults);
