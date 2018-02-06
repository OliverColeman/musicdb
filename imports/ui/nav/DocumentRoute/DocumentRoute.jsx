import React from 'react';
import PropTypes from 'prop-types';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';

import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';


const DocumentRoute = props => (
  props.loading ? <Loading /> : (!props.document ? <NotFound /> : React.createElement(props.docComponent, props))
);


DocumentRoute.defaultProps = {
  document: null,
};


DocumentRoute.propTypes = {
  loading: PropTypes.bool.isRequired,
  document: PropTypes.object,
  match: PropTypes.object.isRequired,
};


export default withTracker(({ match, history, collection, docComponent, idParam, goToOnRemove }) => {
  const documentId = match.params[idParam];
  const subscription = Meteor.subscribe(collection._name + ".withId", documentId);

  return {
    loading: !subscription.ready(),
    document: collection.findOne(documentId),
    docComponent,
    onDocumentRemove: () => history.push(goToOnRemove),
  };
})(DocumentRoute);
