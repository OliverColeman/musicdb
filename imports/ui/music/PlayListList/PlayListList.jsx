import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button, Label } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';

import PlayListCollection from '../../../api/PlayList/PlayList';
import { convertSecondsToHHMMSS } from '../../../modules/util';
import PlayList from '../PlayList/PlayList';
import Compiler from '../Compiler/Compiler';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';

import './PlayListList.scss';


class PlayListList extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { loadingLists, playLists, viewType, noLinks } = this.props;

    if (loadingLists) return ( <Loading /> );

    if (viewType == 'inline') {
      return (
        <div className={"PlayListList inline-viewtype inline-list"}>
          { playLists.map(playList => (
            <PlayList playList={playList} viewType="inline" noLinks={noLinks} key={playList._id} />
          ))}
        </div>
      );
    }

    const hasDates = playLists && playLists.find(tl => !!tl.date);
    const headers = hasDates ? ["Name", "Date", "Compiler(s)", "Length", "Icons"] : ["Name", "Compiler(s)", "Length", "Icons"];

    return (
      <div className={"PlayListList " + viewType + "-viewtype"}>
        <div className="header-row">
          { headers.map(h => (
            <div className={"header-cell header-" + h} key={h}>{h}</div>
          ))}
        </div>

        { playLists.map(playList => (
          <PlayList playList={playList} viewType="list" showDate={hasDates} key={playList._id} />
        ))}
      </div>
    );
  }
}


export default withTracker(({loadingLists, selector, items, viewType, noLinks}) => {
  viewType = viewType || 'page';

  const sortOptions = {
    number: -1,
    date: -1,
    name: 1,
  };

  return {
    loadingLists,
    playLists: items ? items : (!loadingLists && PlayListCollection.find(selector, {sort: sortOptions}).fetch()),
    viewType,
    noLinks,
  };
})(PlayListList);
