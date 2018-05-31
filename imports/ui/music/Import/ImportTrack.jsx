import React from 'react';
import PropTypes from 'prop-types';
import update from 'immutability-helper';
import { Session } from 'meteor/session'
import { Link } from 'react-router-dom';
import { ButtonToolbar, ButtonGroup, Button, Label, FormControl } from 'react-bootstrap';
import Select from 'react-select';
import 'react-select/dist/react-select.css';
import { withTracker } from 'meteor/react-meteor-data';
import { Meteor } from 'meteor/meteor';
import { Bert } from 'meteor/themeteorchef:bert';
import moment from 'moment';
import Papa from 'papaparse';
import autoBind from 'react-autobind';
import _ from 'lodash';

import Loading from '../../misc/Loading/Loading';
import LoadingSmall from '../../misc/Loading/LoadingSmall';
import Track from '../Track/Track';
import { convertHHMMSSToSeconds, convertSecondsToHHMMSS } from '../../../modules/util';

import './Import.scss';

const searchTerms = {
  track: 'Track name',
  artist: 'Artist name (one only)',
  album: 'Album name',
  duration: 'Length (MM:SS)',
}


class ImportTrack extends React.Component {
  constructor(props) {
    super(props);

    const search = this.props.initialSearch || _.mapValues(searchTerms, () => '');
    this.state = {
      ...search,
      closestTrackIds: null,
      loading: false,
    }

    autoBind(this);
  }


  componentDidMount() {
    if (this.hasEnoughDataForSearch()) {
      Meteor.setTimeout(this.updateSearch, this.props.index * 1000);
    }
  }


  hasEnoughDataForSearch() {
    const { track, artist } = this.state;
    return !!(track && artist);
  }


  updateSearch() {
    const searchValues = _.mapValues(searchTerms, (value, key) => this.state[key]);
    this.setState({loading: true});
    Meteor.call('PlayList.trackImportSearch', searchValues, (error, result) => {
      this.setState({loading: false});
      if (error) {
        Bert.alert(error.reason ? error.reason : error.message, 'danger');
      }
      else if (result.matchTrackId) {
        this.props.onMatch(result.matchTrackId);
      }
      else if (result.closestTrackIds) {
        this.setState({closestTrackIds: result.closestTrackIds});
      }
    });
  }


  render() {
    const { matchTrackId, onMatch } = this.props;
    const { loading, closestTrackIds } = this.state;

    return (
      <div className="ImportTrack">
        { !matchTrackId && <div className="search-result">
          <div className="search-terms">
            { Object.keys(searchTerms).map(term => (
              <div className={term} key={term}>
                <FormControl componentClass="input" type="text"
                  placeholder={searchTerms[term]} title={searchTerms[term]}
                  value={this.state[term]} onChange={ e => this.setState({ [term]: e.target.value}) }
                />
              </div>
            ))}

            <div className="IconsAndLinks" />

            <div className="status">
              { loading && <LoadingSmall /> }

              { !loading &&
                <Button title="Search" onClick={this.updateSearch} className="btn btn-success fa fa-search" disabled={!this.hasEnoughDataForSearch()} />
              }
            </div>
          </div>

          { closestTrackIds && closestTrackIds.map(trackId => (
            <Track key={trackId} trackId={trackId} viewType="list-compact" noLinks={true} showIconsAndLinks={true}>
              <div className="control">
                <Button className="btn btn-success fa fa-check"
                  onClick={() => onMatch(trackId)}
                />
              </div>
            </Track>
          )) }
        </div> }

        { matchTrackId && <div className="search-match">
          <Track trackId={matchTrackId} viewType="list-compact" noLinks={true} showIconsAndLinks={true}>
            <div className="control">
              <Button className="btn btn-danger fa fa-times"
                onClick={() => onMatch(null)}
              />
              </div>
          </Track>
        </div> }
      </div>
    );
  }
}


export default ImportTrack;
