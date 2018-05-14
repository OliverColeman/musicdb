import { Meteor } from 'meteor/meteor';
import { check, Match } from 'meteor/check';
import Compiler from '../Compiler';


Meteor.publish('Compiler', function select(selector) {
  check(selector, Match.OneOf(String, Object)); // TODO allows access to any Compiler, however at the moment all compilers may be public.
  return Compiler.find(selector);
});
