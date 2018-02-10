import React from 'react';
import { createContainer } from 'meteor/react-meteor-data';
import Loading from '../Loading/Loading.jsx';

import ProgressMonitorCollection from '../../../api/ProgressMonitor/ProgressMonitor';

import './ProgressMonitor.scss';


class ProgressMonitor extends React.Component {
  componentWillReceiveProps = (nextProps) => {
    if (nextProps.progress) {
      // Trigger error and complete events when the status for these changes.

      const currentError = this.props.progress && this.props.progress.error;
      const nextError = nextProps.progress.error;
      if (nextError && nextError != currentError) {
        nextProps.onError && nextProps.onError(nextError);
      }

      const currentComplete = this.props.progress && this.props.progress.complete;
      const nextComplete = nextProps.progress.complete;
      if (nextComplete && nextComplete != currentComplete) {
        nextProps.onComplete && nextProps.onComplete();
      }
    }
  }

  render() {
    const { loading, progress, onComplete, onError } = this.props;
    if (loading) return (<Loading />);
    return (
      <div className={"ProgressMonitor" + (progress.error ? ' error' : '')}>
        <div className="progress-monitor-background" style={{width:progress.percent + "%"}}
          role="progressbar" aria-valuenow={progress.percent} aria-valuemin="0" aria-valuemax="100"
          title={progress.error ? progress.error : null}
        >
        </div>
        <div className="progress-monitor-foreground" title={progress.error ? progress.error : null}>
          {progress.error || progress.message || (Math.round(progress.percent) + '%')}
        </div>
      </div>
    );
  }
}


export default createContainer(({ progressId, onComplete, onError }) => {
  const sub = Meteor.subscribe('progressMonitor', progressId);

  return {
    loading: !sub.ready(),
    progress: ProgressMonitorCollection.findOne(progressId),
    onComplete,
    onError,
  };
}, ProgressMonitor);
