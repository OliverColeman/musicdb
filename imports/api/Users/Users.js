import { Meteor } from 'meteor/meteor';
import Access from '../../modules/access';

// NOTE: This is currently only used in Navigation.jsx.
Meteor.users.access = {
  [Access.UNAUTHENTICATED]: [ 'signup', 'login' ],
  [Access.AUTHENTICATED]: [ 'logout' ],
  [Access.OWN]: [ 'view', 'update', 'delete' ],
  admin: [ 'view', 'update', 'delete', 'create' ],
  // Note: If a user has the 'admin' role in the Roles.GLOBAL_GROUP then these
  // rules apply across all groups, otherwise they appy only for the groups the
  // user and (if applicable) item is in .
}
