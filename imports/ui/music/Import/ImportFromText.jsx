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

import CompilerCollection from '../../../api/Compiler/Compiler'; import PlayList
from '../PlayList/PlayList'; import Group from '../Group/Group'; import NotFound
from '../../nav/NotFound/NotFound'; import Loading from
'../../misc/Loading/Loading'; import LoadingSmall from
'../../misc/Loading/LoadingSmall'; import ProgressMonitor from
'../../misc/ProgressMonitor/ProgressMonitor'; import { convertHHMMSSToSeconds,
convertSecondsToHHMMSS } from '../../../modules/util';

import './Import.scss';

const massImportPlaceholder =
`Enter tracks to import, one per line, with fields separated by tab or semicolon.
The first line must be headers (in any order). Only the track and artist fields are required.`;

const massImportHoverText =
`Example:
Track; Artist; Album; Duration
Sneakers; Opiuo; Omniversal; 5:16
Sneakers - Radio Edit; Opiuo; ; 3:04
At The Bottom of Everything; Bright Eyes
...
`;

const fileImportPlaceholder =
`Select a spreadsheet file to import multiple lists from, in CSV or TSV format.
First row should be a list of headings and may include 'Name', 'Number', 'Date', 'Compilers', 'URL'`


class ImportFromText extends React.Component {
  constructor(props) {
    super(props);

    // TODO get group from logged in user or something.
    const group = Meteor.groups.findOne({name: "JD"});

    this.state = {
      groupId: group._id,
      name: '',
      number: 1,
      date: moment().format('YYYY-MM-DD'),
      selectedCompilers: [],
      tracksText: '',
      importInProgress: false,
      trackInProgress: false,
      lastImportIndex: -1,
    };

    autoBind(this);
  }


  componentDidMount() {
    this.doImportIntervalId = Meteor.setInterval(this.doImport, 500);
  }

  componentWillUnmount() {
    Meteor.clearInterval(this.doImportIntervalId);
  }


  render() {
    const { loading, compilers, groups, toImport, playListId } = this.props;

    if (loading) return ( <div className="ImportFromText"><Loading /></div> );

    const { groupId, importInProgress, tracksText,
      lastImportIndex, name, number, date, selectedCompilers } = this.state;

    return (
      <div className="ImportFromText">
        <div className="import-spec-single">
          <Select className="group"
            value={groupId} onChange={ value => this.setState({groupId: value ? value._id : null}) }
            options={groups} valueKey={"_id"} labelKey={"name"} />

          <FormControl componentClass="input" type="text" className="listname"
            placeholder="List name (required)" title="List name (required)" required={true}
            value={name} onChange={ e => this.setState({name: e.target.value}) } />

          <FormControl componentClass="input" type="number" className="listnumber"
            placeholder="List number" title="List number"
            value={number} onChange={ e => this.setState({number: parseInt(e.target.value)}) } min={0} />

          <FormControl componentClass="input" type="date" className="listdate"
            placeholder="List date" title="List date"
            value={date} onChange={ e => this.setState({date: e.target.value}) }
            pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}" />

          <Select className="listcompilers" placeholder="Compiler(s)" title="Compiler(s)"
            value={selectedCompilers} onChange={ v => this.setState({selectedCompilers: v}) }
            multi={true} options={compilers} valueKey={"_id"} labelKey={"name"} />

          <FormControl componentClass="textarea" placeholder={massImportPlaceholder} title={massImportHoverText}
            value={tracksText} onChange={ e => this.setState({tracksText: e.target.value}) }
            rows={ Math.max(5, Math.min(15, tracksText.split(/\r|\r\n|\n/).length)) }
            wrap="off"
          />

          { !importInProgress && <Button className='import' disabled={!name} onClick={this.startImport}>Import!</Button> }
        </div>

        { playListId && <PlayList playListId={playListId} /> }

        { !!toImport.length &&
          <div>
            <h4>Importing</h4>

            <div className='to-import'>
            {toImport.filter(ti => !ti.done || ti.error).map((ti, idx) => (
              <div className="import-item" key={ti.track + ti.artist}>
                <div className="track">{ti.track}</div>
                <div className="artist">{ti.artist}</div>
                <div className="album">{ti.album}</div>
                <div className="duration">{ti.duration && convertSecondsToHHMMSS(ti.duration, true)}</div>
                <div className={"status" + (ti.error && ' error')}>{ti.done ? ti.error : (ti.inProgress ? <LoadingSmall /> : "⌛")}</div>
              </div>
            ))}
            </div>
          </div>
        }
      </div>
    );
  }


  startImport() {
    const { groupId, name, number, date, selectedCompilers, tracksText } = this.state;

    const rows = tracksText
                  .split(/[\r\n]/)
                  .map(line => line.split(/[;\t]/).map(v => v.trim()))
                  .filter(row => row.join('').trim().length > 0);

    const headingIndices = {};
    const firstRow = rows[0].map(v => v.toLowerCase());
    for (let h of [ 'track', 'artist', 'album', 'duration' ]) {
      headingIndices[h] = firstRow.indexOf(h);
    }
    if (headingIndices.track == -1) {
      Bert.alert("Missing track header", 'danger');
      return;
    }
    if (headingIndices.artist == -1) {
      Bert.alert("Missing artist header", 'danger');
      return;
    }

    // Make sure all rows have track and artist.
    for (let ri = 1; ri < rows.length; ri++) {
      if (!rows[ri][headingIndices.track] || !rows[ri][headingIndices.artist]) {
        Bert.alert("Missing track or artist on row " + (ri+1), 'danger');
        return;
      }
    }

    const toImport = [];
    for (let ri = 1; ri < rows.length; ri++) {
      let row = rows[ri];
      const trackData = {};
      trackData.track = row[headingIndices.track];
      trackData.artist = row[headingIndices.artist];
      if (headingIndices.album != -1 && row[headingIndices.album]) trackData.album = row[headingIndices.album];
      if (headingIndices.duration != -1 && row[headingIndices.duration]) trackData.duration = convertHHMMSSToSeconds(row[headingIndices.duration]);
      toImport.push(trackData);
    }

    console.log('ti', toImport);

    // Data looks valid, no going back now.
    this.setState({
      importInProgress: true,
      lastImportIndex: -1,
    });
    Session.set("ImportFromText_toImport", toImport);
    Session.set("ImportFromText_playListId", null);

    const insertMetadata = {};
    if (groupId) insertMetadata.groupId = groupId;
    if (name) insertMetadata.name = name;
    if (number) insertMetadata.number = number;
    if (date) insertMetadata.date = moment(date).unix();
    if (selectedCompilers) insertMetadata.compilerIds = selectedCompilers.map(c => c._id);

    Meteor.call('PlayList.new', insertMetadata, (error, playListId) => {
      if (error) {
        Bert.alert(error.reason ? error.reason : error.message, 'danger');
      } else {
        Session.set("ImportFromText_playListId", playListId);
      }
    });
  }

  doImport() {
    const { importInProgress, lastImportIndex, trackInProgress } = this.state;
    let { toImport, playListId } = this.props;
    const self = this;

    // If no play list to import into, or a track import is in progress, or we're all done.
    if (!playListId || trackInProgress || !importInProgress) return;

    this.setState({trackInProgress: true});

    const index = lastImportIndex + 1;

    Session.set("ImportFromText_toImport", update(toImport,
      { [index]: { inProgress: { $set: true }}}
    ));

    console.log(index, toImport[index].track);

    Meteor.call('PlayList.addTrackFromSearch', playListId, toImport[index], (error, message) => {
      error = error && (error.reason || error.message) || message;
      toImport = update(toImport, { [index]: {
        inProgress: { $set: false },
        error: { $set: error },
        done: { $set: true }
      }});

      Session.set("ImportFromText_toImport", toImport);

      console.log('a', index, toImport.length, index < toImport.length-1);

      self.setState({
        importInProgress: index < toImport.length-1,
        lastImportIndex: index,
        trackInProgress: false,
      });
    });
  }
}


export default withTracker(({ match, roles }) => {
  const subCompilers = Meteor.subscribe('Compiler.all');
  const user = Meteor.user();
  const groupSelector = user && user.roles && (roles.includes('admin') ? {} : {name: {$in: Object.keys(user.roles)}});

  Session.setDefault("ImportFromText_toImport", []);
  Session.setDefault("ImportFromText_playListId", null);

  return {
    loading: !subCompilers.ready(),
    compilers: CompilerCollection.find().fetch(),
    groups: user && user.roles ? Meteor.groups.find(groupSelector).fetch() : [],
    toImport: Session.get("ImportFromText_toImport"),
    playListId: Session.get("ImportFromText_playListId"),
  };
})(ImportFromText);
