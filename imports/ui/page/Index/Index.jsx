import { Meteor } from 'meteor/meteor'
import React from 'react';
import { Button } from 'react-bootstrap';
import ReactMarkdown from 'react-markdown';

import TagCollection from '../../../api/Tag/Tag';
import Tag from '../../music/Tag/Tag';

import './Index.scss';

const Index = () => (
  <div className="Index">
    <h1>{Meteor.settings.public.appName}</h1>
    <ReactMarkdown className="description" source={Meteor.settings.public.appDescription} />

    <div className="previous-set-lists">
      <h3>Previous Set Lists</h3>
      <Tag tag={TagCollection.findOne({name: "JD"})} />
    </div>
  </div>
);

export default Index;
