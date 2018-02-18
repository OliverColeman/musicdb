import React from 'react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button, Label } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';

import TagCollection from '../../../api/Tag/Tag';
import TrackListCollection from '../../../api/TrackList/TrackList';
import { convertSecondsToHHMMSS } from '../../../modules/util';
import TrackList from '../TrackList/TrackList';
import Compiler from '../Compiler/Compiler';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';

import './Tag.scss';


class Tag extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const { loading, loadingLists, tag, trackLists, viewContext } = this.props;

    console.log(trackLists);

    if (loading) return (<Loading />);
    if (!tag) return (<NotFound />);

    if (viewContext == 'inline') return (
      <Link to={`/listlist/${tag._id}`} title={tag.name} className={"Tag inline-context name"}>
        {tag.name}
      </Link>);

    const showLists = viewContext == "page";
    const hasDates = trackLists && trackLists.find(tl => !!tl.date);

    const headers = hasDates ? ["Name", "Date", "Compiler(s)", "Length"] : ["Name", "Compiler(s)", "Length"];

    return (
      <div className={"Tag " + viewContext + "-context"}>
        <div className="item-header">
          <Link className="name" to={`/listlist/${tag._id}`}>{tag.name}</Link>
        </div>

        { !showLists ? '' :
          <div className="tracklists">
            <div className="header-row">
              { headers.map(h => (
                <div className={"header-cell header-" + h} key={h}>{h}</div>
              ))}
            </div>

            { loadingLists ? (<Loading />) : trackLists.map(trackList => (
              <TrackList trackList={trackList} viewContext="list" showDate={hasDates} key={trackList._id} />
            ))}
          </div>
        }
      </div>
    );
  }
}


export default withTracker(({match, tag, tagId, viewContext}) => {
  viewContext = viewContext || "page";
  const id = tagId || (tag && tag._id) || match.params.tagId;

  const sub = tag ? false : Meteor.subscribe('Tag.withId', id);
  const subLists = viewContext == 'page' && Meteor.subscribe('TrackList.withTagId', id);

  const sortOptions = {
    number: -1,
    date: -1,
    name: 1,
  };

  console.log(id);

  return {
    loading: sub && !sub.ready(),
    loadingLists: subLists && !subLists.ready(),
    tag: tag || TagCollection.findOne(id),
    trackLists: subLists && TrackListCollection.find({tagIds: id}, {sort: sortOptions}).fetch(),
    viewContext,
  };
})(Tag);
