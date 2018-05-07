
import Access from '../modules/access';
import PlayListCollection from '../api/PlayList/PlayList';

import { Route } from 'react-router-dom';
import Authenticated from './nav/Authenticated/Authenticated';
import Public from './nav/Public/Public';

import Signup from './account/Signup/Signup';
import Login from './account/Login/Login';
import Logout from './account/Logout/Logout';
import Profile from './account/Profile/Profile';
import NotFound from './nav/NotFound/NotFound';
import User from './music/User/User';
import ImportFromURL from './music/Import/ImportFromURL';
import ImportFromText from './music/Import/ImportFromText';
import NeedsReview from './music/NeedsReview/NeedsReview';
import SearchTracks from './music/Track/SearchTracks';

export default [
  {
    url: "/search/tracks",
    menu: 'left',
    title: "Search tracks",
    renderComponent: SearchTracks,
    routerComponent: Route,
  },
  {
    menu: 'left',
    title: "Import playlist",
    access: {accessRules: PlayListCollection.access, op: 'create'},
    children: [
      {
        title: "From URLs",
        url: "/import/url",
        access: {accessRules: PlayListCollection.access, op: 'create'},
        renderComponent: ImportFromURL,
        routerComponent: Authenticated
      },
      {
        title: "From track list",
        url: "/import/text",
        access: {accessRules: PlayListCollection.access, op: 'create'},
        renderComponent: ImportFromText,
        routerComponent: Authenticated
      },
    ]
  },
  {
    url: "/library",
    menu: 'left',
    title: "Library",
    access: {role: Access.AUTHENTICATED},
    renderComponent: User,
    routerComponent: Authenticated
  },

  {
    menu: 'left',
    title: "Review",
    access: {role: 'admin'},
    children: [
      {
        url: "/review/tracks",
        title: "Tracks",
        access: {role: 'admin'},
        renderComponent: NeedsReview,
        routerComponent: Authenticated
      },
      {
        url: "/review/playlists",
        title: "Playlists",
        access: {role: 'admin'},
        renderComponent: NeedsReview,
        routerComponent: Authenticated
      },
      {
        url: "/review/artists",
        title: "Artists",
        access: {role: 'admin'},
        renderComponent: NeedsReview,
        routerComponent: Authenticated
      },
    ],
  },

  {
    url: "/signup",
    menu: 'right',
    title: "Sign up",
    access: {role: Access.UNAUTHENTICATED},
    renderComponent: Signup,
    routerComponent: Public
  },
  {
    url: "/login",
    menu: 'right',
    title: "Log in",
    access: {role: Access.UNAUTHENTICATED},
    renderComponent: Login,
    routerComponent: Public
  },

  {
    url: "/profile",
    menu: 'right',
    title: "My profile",
    access: {role: Access.AUTHENTICATED},
    renderComponent: Profile,
    routerComponent: Authenticated
  },
  {
    url: "/logout",
    menu: 'right',
    title: "Log out",
    access: {role: Access.AUTHENTICATED},
    renderComponent: Logout,
    routerComponent: Route
  },
];
