import React from 'react';
import PropTypes from 'prop-types';
import autoBind from 'react-autobind';
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button, Label } from 'react-bootstrap';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';

import PlayListCollection from '../../../api/PlayList/PlayList';
import { convertSecondsToHHMMSS } from '../../../modules/util';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';
import PlayListList from '../PlayListList/PlayListList';

import './User.scss';


class User extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);
  }

  handleNewList() {
    Meteor.call('PlayList.new', (error, list) => {
      if (error) {
        Bert.alert(error.reason ? error.reason : error.message, 'danger');
      }
    });
  }

  render() {
    const { loading, loadingLists, user, viewType } = this.props;

    if (loading) return (<Loading />);
    if (!user) return (<NotFound />);

    const name = user.profile.name.first + ' ' + user.profile.name.last;

    if (viewType == 'inline') return (
      <Link to={`/user/${user._id}`} title={name} className={"User inline-viewtype name"}>
        {name}
      </Link>);

    const showLists = viewType == "page";

    return (
      <div className={"User " + viewType + "-viewtype"}>
        <div className="item-header">
          <Link className="name" to={`/user/${user._id}`}>{name}</Link>
        </div>

        { !showLists ? '' :
          <div>
            <div className="playlists-header">
              <h4>Playlists</h4>
              <Button className='btn btn-success new-playlist' onClick={this.handleNewList}>New Playlist</Button>
            </div>

            <PlayListList loadingLists={loadingLists} selector={{userId: user._id}} />
          </div>
        }
      </div>
    );
  }
}


export default withTracker(({match, user, userId, viewType}) => {
  viewType = viewType || "page";
  //const id = userId || (user && user._id) || match && match.params.userId || Meteor.userId();
  const id = Meteor.userId();

  //const sub = user ? false : Meteor.subscribe('User.withId', id);
  const subLists = viewType == 'page' && Meteor.subscribe('PlayList.withUserId', id);

  return {
    loading: false, //sub && !sub.ready(),
    loadingLists: subLists && !subLists.ready(),
    user: Meteor.users.findOne(id),
    viewType,
  };
})(User);
