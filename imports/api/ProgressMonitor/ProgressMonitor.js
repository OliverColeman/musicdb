/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import SimpleSchema from 'simpl-schema';
import moment from 'moment';

const ProgressMonitor = new Mongo.Collection('ProgressMonitor');


ProgressMonitor.allow({
  insert: () => false,
  update: () => false,
  remove: () => false,
});

ProgressMonitor.deny({
  insert: () => true,
  update: () => true,
  remove: () => true,
});


ProgressMonitor.schema = {
  name: String,
  percent: {
    type: Number,
    autoValue: function() { if (this.isInsert && !this.isSet) return 0; }
  },
  complete: {
    type: Boolean,
    autoValue: function() { if (this.isInsert && !this.isSet) return false; }
  },
  message: {
    type: String,
    optional: true,
  },
  error: {
    type: String,
    optional: true,
  },
  createdAt: {
    type: Number,
    autoValue() { if (this.isInsert) return Date.now(); },
  },
};


ProgressMonitor.attachSchema(new SimpleSchema(ProgressMonitor.schema));


ProgressMonitor.makeNew = (name, message) => ProgressMonitor.insert({name, message: message || null});

ProgressMonitor.setPercent = (id, percent, message) => ProgressMonitor.update(id, {$set: {percent: parseFloat(percent), message: message || null}});

ProgressMonitor.setComplete = (id, message) => ProgressMonitor.update(id, {$set: {percent: 100, complete: true, message: message || null}});

ProgressMonitor.setError = (id, error) => ProgressMonitor.update(id, {$set: {error}});


if (Meteor.isServer) {
  SyncedCron.add({
    name: 'Delete old ProgressMonitor entries.',
    schedule: function(parser) {
      // parser is a later.parse object
      return parser.text('every 1 days');
    },
    job: function() {
      const oneWeekAgo = moment().subtract(7, 'days').valueOf();
      const removedCount = ProgressMonitor.remove({ createdAt: { $lt: oneWeekAgo } });
      if (removedCount) console.log(`Removed ${removedCount} old ProgressMonitor entries.`);
    }
  });
}


export default ProgressMonitor;
