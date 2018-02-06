import { Meteor } from 'meteor/meteor';

const getSchemaFieldTypes = (schema, doc, includeId) => {
  const typeMap = {};
  if (includeId) typeMap._id = String;

  Object.entries(schema).forEach(
    ([field, spec]) => {
      // Only consider top-level field schema specs.
      if (!field.includes(".")) {
        let optional = false;
        let autoValue = false;

        if (typeof spec == 'object') {
          typeMap[field] = spec.type;
          if (spec.hasOwnProperty('autoValue')) {
            autoValue = true;
          }
          if (spec.hasOwnProperty('optional')) {
        	   optional = typeof spec.optional == 'function' ? spec.optional() : spec.optional || false;
          }
        }
        else {
          typeMap[field] = spec;
        }

        // If the document doesn't define a value for this field.
        if (!doc.hasOwnProperty(field)) {
          // If it has a default value, apply it.
          if (spec.hasOwnProperty('defaultValue')) {
            doc[field] = spec.defaultValue;
          }
          // Otherwise if it's optional or has an autovalue, ignore it.
          else if (optional || autoValue) {
            delete(typeMap[field]);
          }
        }
      }
    }
  );

  return typeMap;
}


const throwMethodException = (exception) => {
  const message =
    (exception.santizedError && exception.sanitizedError.message)
    ? exception.sanitizedError.message
    : exception.message || exception.reason || exception;

  console.error("Method exception: " + message);

  throw new Meteor.Error(500, message);
};


export { getSchemaFieldTypes, throwMethodException };
