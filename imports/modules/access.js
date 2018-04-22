// Module to provide access control for collections and items therein.

// TODO This should probably be pulled out into a Mateor package eventually.

import { Meteor } from 'meteor/meteor';
import _ from 'lodash';

if (Meteor.isServer) import './server/access-server';

try {
  import SimpleSchema from 'simpl-schema';
  SimpleSchema.extendOptions(['access']);
} catch(e) {}


const AUTHENTICATED = '__auth__';
const UNAUTHENTICATED = '__unauth__';
const OWN = '__own__';


const processUserArgument = (user) => {
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
  else if (typeof user != 'object' && user !== null) {
    throw new Error("Invalid user argument provided.");
  }
  return user;
}


/**
 * Determine if access is allowed. Can be called in a 'accessRules' mode or
 * 'role' mode. Single params object has properties:
 * @param {Object} accessRules - The access rules. Mutually exclusive with the role param.
 * @param {string} role - The role to check for. This may be a role defined via
 *   the alanning:roles package or one of Access.AUTHENTICATED or
 *   Access.UNAUTHENTICATED. Mutually exclusive with collection param.
 * @param {string} op - For collection mode. The operation to check for,
 *   typically one of 'view', 'create', 'update', 'delete' but depends on the
 *   access rules specified by the collection.
 * @param {Object} item - For collection mode. The item to check, if applicable.
 *   The item should be an object/document with a userId and/or groupId field.
 * @param {string} groupId - For role mode. The user group to check in, if applicable.
 * @param {Object|String} user - The user or users id to check for.
 *   If not given the current user is used if possible.
 * @return {boolean} Whether access is allowed.
 */
const allowed = ({accessRules, role, op, item, groupId, user}) => {
  // If no access control defined for this collection or specific op.
  if (!role && !accessRules) throw new Error("Neither role nor access rules provided.");

  user = processUserArgument(user);

  if (role) {
    if (role == AUTHENTICATED) return user !== null;
    if (role == UNAUTHENTICATED) return user === null;
    return Roles.userIsInRole(user, role, groupId)
  }

  // For each role for which permissions are defined for the collection.
  for (let role in accessRules) {
    // If the role is allowed to perform the op.
    if (accessRules[role].includes(op)) {
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
          if (Roles.userIsInRole(user, role, item && item.groupId)) return true;
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


/**
 * Filter the given document to remove fields for which the specified op is not
 * allowed by the specified  user. It is assumed that the item has been
 * validated against the schema before calling this function.
 * Single params object has properties:
 * @param {string} op - For collection mode. The operation to check for,
 * @param {Object} item - The document fields to filter.
 * @param {Object|String} user - The user or users id to check for.
 *   typically one of 'view', 'create', 'update', 'delete' but depends on the
 *   access rules specified by the collection.
 * @param {Object} schema - The field schema to check against. Same format as
 *   (aldeed) simpl-schema but with an optional 'access' property. If the schema
 *   provides an 'access' property for a field then this will be used, otherwise
 *   defaultAccessRules will be used for the field.
 * @param {Object} defaultAccessRules - The access rules to use for fields that
 *   do not define their own.
 * @return {Object} A copy of the given document but possibly with fields removed.
 */
const filterDocumentFields = ({op, item, user, schema, defaultAccessRules}) => {
  const filteredDoc = {};
  user = processUserArgument(user);

  // Most fields use defaultAccessRules so just determine result for this once.
  const defaultAccessRulesResult = allowed({accessRules: defaultAccessRules, op, item, user});

  _.forOwn(item, (value, key) => {
    if (schema[key].access) {
      if (allowed({accessRules: schema[key].access, op, item, user})) {
        filteredDoc[key] = value;
      }
    }
    else if (defaultAccessRulesResult) {
      filteredDoc[key] = value;
    }
  });

  return filteredDoc;
}


export default { allowed, filterDocumentFields, AUTHENTICATED, UNAUTHENTICATED, OWN };
