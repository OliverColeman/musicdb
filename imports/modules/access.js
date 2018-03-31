// Module to provide access control for collections and items therein.

// TODO This should probably be pulled out into a Mateor package eventually.

import { Meteor } from 'meteor/meteor';
import _ from 'lodash';

if (Meteor.isServer) import './server/access-server';


const AUTHENTICATED = '__auth__';
const UNAUTHENTICATED = '__unauth__';
const OWN = '__own__';

/**
 * Determine if access is allowed.
 * @param {Object} collection - The collection to check for. At the moment all
 *   that is required is that the given object has an 'access' property.
 * @param {string} op - The operation to check for, typically one of 'view', 'create',
 *   'update', 'delete' but depends on the access rules specified by the collection.
 * @param {Object} item - The item to check, if applicable.
 * @param {Object|String} user - The user or users id to check for.
 *   If not given the current user is used if possible.
 * @return {boolean} Whether access is allowed.
 */
const allowed = (collection, op, item, user) => {
  // If no access control defined for this collection or specific op.
  if (!collection.access) throw new Error("Access rules are not defined for given collection.");

  // If the user argument wasn't supplied (as opposed to supplied but null).
  if (typeof user == 'undefined') {
    try {
      user = Meteor.user();
    } catch(ex) {
      throw new Error("Unable to determine current user. Perhaps you need to pass in the user(Id) explicitly.");
    }
  }
  else if (typeof user == 'string') {
    user = Meteor.users.findOne(user);
    if (!user) throw new Error("Invalid user id provided.");
  }
  else if (typeof user != 'object') {
    throw new Error("Invalid user argument provided.");
  }

  // For each role for which permissions are defined for the collection.
  for (let role in collection.access) {
    // If the role is allowed to perform the op.
    if (collection.access[role].includes(op)) {
      if (user) {
        if (role == AUTHENTICATED) {
          return true;
        }
        else if (role == OWN) {
          if (item && item.userId == user._id) return true;
        }
        else {
          // If the item belongs to a group and the the user has the role in that group
          // (or the user has the role in Roles.GLOBAL_GROUP).
          if (Roles.userIsInRole(user, [role], item && item.groupId)) return true;
        }
      }
      else {
        if (role == UNAUTHENTICATED) return true;
      }
    }
  }

  return false;
}


// Maintain a 'groups' collection synced with the alanning:meteor-roles groups.
// (alanning:meteor-roles maintains a collection for roles but not for the groups).
// Create a reference to the collection at Meteor.groups to be consistent with
// alanning:meteor-roles. The groups collection is published in server/access-server.js.
if (!Meteor.groups) {
  Meteor.groups = new Mongo.Collection("__groups__");

  // Update Meteor.groups collection when groups added to users.
  Meteor.users.after.update(function(userId, user, fieldNames, modifier, options) {
    if ('object' === typeof user.roles ) {
      const userGroups = Object.keys(user.roles);
      const existingGroups = Meteor.groups.find({name: {$in: userGroups}}).map(g => g.name);
      if (userGroups.length != existingGroups.length) {
        for (let ug of userGroups) {
          if (!existingGroups.includes(ug)) {
            Meteor.groups.insert({name: ug});
          }
        }
      }
    }
  }, {fetchPrevious: false});
}


export default { allowed, AUTHENTICATED, UNAUTHENTICATED, OWN };
