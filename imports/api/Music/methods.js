import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import _ from 'lodash';

import rateLimit from '../../modules/rate-limit';
import Access from '../../modules/access';
import { throwMethodException } from '../Utility/methodutils';
import { defaultAccessRules } from './music';
import { musicCollection } from './collections';


// Create generic update methods for all music item collections.
_.forOwn(musicCollection, (collection, collectionName) => {
  const methodName = collectionName + '.update';

  Meteor.methods({
    [methodName]: function update(item) {
      const itemId = item._id;
      delete(item._id);
      collection.schemaInstance.validate(item);

      try {
        const user = this.userId, op = 'update';
        if (!Access.allowed({accessRules: collection.access, op, item, user})) throw "Not allowed.";
        item = Access.filterDocumentFields({op, item, user, schema: collection.schema, defaultAccessRules});

        collection.update(itemId, {
          $set: item,
        });
      } catch (exception) {
        throwMethodException(exception);
      }
    }
  });

  rateLimit({
    methods: [ methodName ],
    limit: 5,
    timeRange: 1000,
  });
});
