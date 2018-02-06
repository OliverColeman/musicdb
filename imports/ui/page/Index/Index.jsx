import { Meteor } from 'meteor/meteor'
import React from 'react';
import { Button } from 'react-bootstrap';
import ReactMarkdown from 'react-markdown';

import TrackListListCollection from '../../../api/TrackListList/TrackListList';
import TrackListList from '../../music/TrackListList/TrackListList';

import './Index.scss';

const Index = () => (
  <div className="Index">
    <h1>{Meteor.settings.public.appName}</h1>
    <ReactMarkdown className="description" source={Meteor.settings.public.appDescription} />

    <div className="previous-set-lists">
      <h3>Previous Set Lists</h3>
      <TrackListList trackListList={TrackListListCollection.findOne({name: "JD"})} />
    </div>
  </div>
);

export default Index;
