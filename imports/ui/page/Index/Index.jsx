import { Meteor } from 'meteor/meteor'
import React from 'react';
import { Button } from 'react-bootstrap';
import ReactMarkdown from 'react-markdown';

import Group from '../../music/Group/Group';

import './Index.scss';

const Index = () => (
  <div className="Index">
    <h1>{Meteor.settings.public.appName}</h1>
    <ReactMarkdown className="description" source={Meteor.settings.public.appDescription} />

    <div className="previous-set-lists">
      <h3>Previous Set Lists</h3>
      <Group group={Meteor.groups.findOne({name: "JD"})} />
    </div>
  </div>
);

export default Index;
