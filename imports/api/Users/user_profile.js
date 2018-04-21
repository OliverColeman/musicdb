/* eslint-disable consistent-return */

import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';
import SimpleSchema from 'simpl-schema';


const userProfileSchema = {
  name: Object,
  'name.first': String,
  'name.last': String,

  settings: { type: Object, defaultValue: {} },
  'settings.ui': { type: Object, defaultValue: {} },
  'settings.ui.compactView': {type: Boolean, defaultValue: false },
};

const userProfileSchemaInstance = new SimpleSchema(userProfileSchema, { check });


Meteor.users.before.insert((userId, doc) => {
  doc.profile = userProfileSchemaInstance.clean(doc.profile);
  userProfileSchemaInstance.validate(doc.profile);
});

Meteor.users.before.update((userId, doc, fieldNames, modifier, options) => {
  if (modifier.$set && modifier.$set.profile) {
    userProfileSchemaInstance.clean(modifier.$set.profile);
    userProfileSchemaInstance.validate(modifier.$set.profile);
  }
});


export { userProfileSchema, userProfileSchemaInstance };
