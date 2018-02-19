/* eslint-disable jsx-a11y/no-href */

import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from "react-helmet";
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { Grid } from 'react-bootstrap';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import { Roles } from 'meteor/alanning:roles';

import Navigation from '../../nav/Navigation/Navigation';
import Authenticated from '../../nav/Authenticated/Authenticated';
import Public from '../../nav/Public/Public';
import Index from '../Index/Index';
import Signup from '../../account/Signup/Signup';
import Login from '../../account/Login/Login';
import Logout from '../../account/Logout/Logout';
import VerifyEmail from '../../account/VerifyEmail/VerifyEmail';
import RecoverPassword from '../../account/RecoverPassword/RecoverPassword';
import ResetPassword from '../../account/ResetPassword/ResetPassword';
import Profile from '../../account/Profile/Profile';
import NotFound from '../../nav/NotFound/NotFound';
import Footer from '../Footer/Footer';
import VerifyEmailAlert from '../../account/VerifyEmailAlert/VerifyEmailAlert';
import getUserName from '../../../modules/get-user-name';
import Track from '../../music/Track/Track';
import PlayList from '../../music/PlayList/PlayList';
import Tag from '../../music/Tag/Tag';
import Artist from '../../music/Artist/Artist';
import Album from '../../music/Album/Album';
import Compiler from '../../music/Compiler/Compiler';
import Import from '../../music/Import/Import';

import './App.scss';


const App = props => (
  <Router>
    {!props.loading ? (
      <div className="App">

        <Helmet>
          <title>{Meteor.settings.public.appName}</title>
          <meta name="description" content={Meteor.settings.public.appDescription} />
        </Helmet>

        <Navigation {...props} />
        <Grid>
          <Switch>
            <Route exact name="index" path="/" component={Index} />

            {/*<Route exact path="/lists/:tagId" component={Tag} {...props} />*/}
            <Route exact path="/tag/:tagId" component={Tag} {...props} />
            <Route exact path="/list/:playListId" component={PlayList} {...props} />
            <Route exact path="/track/:trackId" component={Track} {...props} />
            <Route exact path="/artist/:artistId" component={Artist} {...props} />
            <Route exact path="/album/:albumId" component={Album} {...props} />
            <Route exact path="/compiler/:compilerId" component={Compiler} {...props} />

            <Authenticated exact path="/import" component={Import} {...props} />

            <Authenticated exact path="/profile" component={Profile} {...props} />
            <Public path="/signup" component={Signup} {...props} />
            <Public path="/login" component={Login} {...props} />
            <Route path="/logout" component={Logout} {...props} />
            <Route component={NotFound} />
          </Switch>
        </Grid>
        {/*<Footer />*/}
      </div>
    ) : ''}
  </Router>
);

App.defaultProps = {
  userId: '',
  emailAddress: '',
};

App.propTypes = {
  loading: PropTypes.bool.isRequired,
  userId: PropTypes.string,
  emailAddress: PropTypes.string,
  emailVerified: PropTypes.bool.isRequired,
  authenticated: PropTypes.bool.isRequired,
};

export default withTracker(() => {
  const loggingIn = Meteor.loggingIn();
  const user = Meteor.user();
  const userId = Meteor.userId();
  const loadingRoles = !Roles.subscription.ready();
  const name = user && user.profile && user.profile.name && getUserName(user.profile.name);
  const emailAddress = user && user.emails && user.emails[0].address;

  const tagSub = Meteor.subscribe('Tag.all');

  return {
    loading: loadingRoles || !tagSub.ready(),
    loggingIn,
    authenticated: !loggingIn && !!userId,
    name: name || emailAddress,
    roles: !loadingRoles && Roles.getRolesForUser(userId),
    userId,
    emailAddress,
    emailVerified: user && user.emails ? user && user.emails && user.emails[0].verified : true,
  };
})(App);
