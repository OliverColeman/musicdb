import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import { Accounts } from 'meteor/accounts-base';
import _ from 'lodash';

import { userProfileSchema, userProfileSchemaInstance } from '../user_profile';
import { throwMethodException } from '../../Utility/methodutils';
import rateLimit from '../../../modules/rate-limit';

Meteor.methods({
  'users.sendVerificationEmail': function usersSendVerificationEmail() {
    return Accounts.sendVerificationEmail(this.userId);
  },

  'users.updateProfile': function usersUpdateProfile(profileUpdates, emailAddress) {
    check(profileUpdates, Object);
    const profile = Meteor.user().profile;
    _.merge(profile, profileUpdates);
    userProfileSchemaInstance.validate(profile);
    check(emailAddress, Match.Maybe(String));

    try {
      const modifier = {
        $set: {
          profile,
        },
      }
      if (emailAddress) modifier.$set['emails.0.address'] = emailAddress;
      Meteor.users.update(this.userId, modifier);
    } catch (exception) {
      throwMethodException(exception);
    }
  },
});

rateLimit({
  methods: [
    'users.sendVerificationEmail',
    'users.updateProfile',
  ],
  limit: 5,
  timeRange: 1000,
});
