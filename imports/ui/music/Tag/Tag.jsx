import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button, Label } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';

import TagCollection from '../../../api/Tag/Tag';
import PlayListCollection from '../../../api/PlayList/PlayList';
import { convertSecondsToHHMMSS } from '../../../modules/util';
import PlayList from '../PlayList/PlayList';
import Compiler from '../Compiler/Compiler';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';

import './Tag.scss';


class Tag extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { loading, loadingLists, tag, playLists, viewType } = this.props;

    if (loading) return (<Loading />);
    if (!tag) return (<NotFound />);

    if (viewType == 'inline') return (
      <Link to={`/tag/${tag._id}`} title={tag.name} className={"Tag inline-viewtype name"}>
        {tag.name}
      </Link>);

    const showLists = viewType == "page";
    const hasDates = playLists && playLists.find(tl => !!tl.date);

    const headers = hasDates ? ["Name", "Date", "Compiler(s)", "Length"] : ["Name", "Compiler(s)", "Length"];

    return (
      <div className={"Tag " + viewType + "-viewtype"}>
        <div className="item-header">
          <Link className="name" to={`/tag/${tag._id}`}>{tag.name}</Link>
        </div>

        { !showLists ? '' :
          <div className="playlists">
            <div className="header-row">
              { headers.map(h => (
                <div className={"header-cell header-" + h} key={h}>{h}</div>
              ))}
            </div>

            { loadingLists ? (<Loading />) : playLists.map(playList => (
              <PlayList playList={playList} viewType="list" showDate={hasDates} key={playList._id} />
            ))}
          </div>
        }
      </div>
    );
  }
}


export default withTracker(({match, tag, tagId, viewType}) => {
  viewType = viewType || "page";
  const id = tagId || (tag && tag._id) || match.params.tagId;

  const sub = tag ? false : Meteor.subscribe('Tag.withId', id);
  const subLists = viewType == 'page' && Meteor.subscribe('PlayList.withTagId', id);

  const sortOptions = {
    number: -1,
    date: -1,
    name: 1,
  };

  return {
    loading: sub && !sub.ready(),
    loadingLists: subLists && !subLists.ready(),
    tag: tag || TagCollection.findOne(id),
    playLists: subLists && PlayListCollection.find({tagIds: id}, {sort: sortOptions}).fetch(),
    viewType,
  };
})(Tag);
