/* eslint-disable jsx-a11y/no-href */

import React from 'react';
import PropTypes from 'prop-types';
import { Helmet } from "react-helmet";
import { BrowserRouter as Router, Switch, Route } from 'react-router-dom';
import { Grid } from 'react-bootstrap';
import { Meteor } from 'meteor/meteor';
import { withTracker } from 'meteor/react-meteor-data';
import { Roles } from 'meteor/alanning:roles';
import { DragDropContext } from 'react-dnd'
import HTML5Backend from 'react-dnd-html5-backend'
import flow from 'lodash/flow';
import _ from 'lodash';

import Navigation from '../../nav/Navigation/Navigation';
import Authenticated from '../../nav/Authenticated/Authenticated';
import Public from '../../nav/Public/Public';
import Index from '../Index/Index';
import VerifyEmail from '../../account/VerifyEmail/VerifyEmail';
import NotFound from '../../nav/NotFound/NotFound';
import Footer from '../Footer/Footer';
import getUserName from '../../../modules/get-user-name';
import Track from '../../music/Track/Track';
import PlayList from '../../music/PlayList/PlayList';
import Group from '../../music/Group/Group';
import Tag from '../../music/Tag/Tag';
import Artist from '../../music/Artist/Artist';
import Album from '../../music/Album/Album';
import Compiler from '../../music/Compiler/Compiler';
import SearchTracks from '../../music/Search/SearchTracks';
import Access from '../../../modules/access';
import routes from '../../routes';

import './App.scss';


class App extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    const props = this.props;

    return (
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

                <Route exact path="/group/:groupId" component={Group} {...props} />
                <Route exact path="/tag/:tagId" component={Tag} {...props} />
                <Route exact path="/list/:playListId" component={PlayList} {...props} />
                <Route exact path="/track/:trackId" component={Track} {...props} />
                <Route exact path="/artist/:artistId" component={Artist} {...props} />
                <Route exact path="/album/:albumId" component={Album} {...props} />
                <Route exact path="/compiler/:compilerId" component={Compiler} {...props} />

                { _.flatMap(routes, route => route.children || route)
                  .filter(route => !route.access || Access.allowed(route.access))
                  .map(route =>
                    React.createElement(route.routerComponent, {
                      exact: true,
                      path: route.url,
                      component: route.renderComponent,
                      key: route.url,
                      ...props
                    })
                  )
                }

                <Route component={NotFound} />
              </Switch>
            </Grid>
            {/*<Footer />*/}
          </div>
        ) : ''}
      </Router>
    );
  }
}


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


export default flow(
  DragDropContext(HTML5Backend),
  withTracker(() => {
    const loggingIn = Meteor.loggingIn();
    const user = Meteor.user();
    const userId = Meteor.userId();
    const loadingRoles = !Roles.subscription.ready();
    const name = user && user.profile && user.profile.name && getUserName(user.profile.name);
    const emailAddress = user && user.emails && user.emails[0].address;
    const groupSub = Meteor.subscribe('Access.groups');
    const tagSub = Meteor.subscribe('Tag.all');

    return {
      loading: loadingRoles || !tagSub.ready() || !groupSub.ready(),
      loggingIn,
      authenticated: !loggingIn && !!userId,
      name: name || emailAddress,
      roles: !loadingRoles && Roles.getRolesForUser(userId),
      userId,
      emailAddress,
      emailVerified: user && user.emails ? user && user.emails && user.emails[0].verified : true,
    };
  })
) (App);
