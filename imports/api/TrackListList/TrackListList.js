/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';

const TrackListList = new Mongo.Collection('TrackListList');

TrackListList.allow({
  insert: () => false,
  update: () => false,
  remove: () => false,
});

TrackListList.deny({
  insert: () => true,
  update: () => true,
  remove: () => true,
});

TrackListList.schema = {
  name: String,
};
TrackListList.attachSchema(new SimpleSchema(TrackListList.schema));

export default TrackListList;
