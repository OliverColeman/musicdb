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

import CompilerCollection from '../../../api/Compiler/Compiler';
import PlayList from '../PlayList/PlayList';
import Group from '../Group/Group';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';
import ImportTrack from './ImportTrack';

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
      name: 'New playlist',
      number: 1,
      date: moment().format('YYYY-MM-DD'),
      selectedCompilers: [],
      tracksText: '',
      toImport: null,
      playListId: null,
    };

    autoBind(this);
  }


  render() {
    const { loading, compilers, groups } = this.props;

    if (loading) return ( <div className="ImportFromText"><Loading /></div> );

    const { groupId, tracksText, name, number, date, selectedCompilers, toImport, playListId } = this.state;

    const trackFoundCount = toImport ? toImport.filter(ti => !!ti.trackId).length : 0;

    return (
      <div className="ImportFromText">
        { !toImport && !playListId && <div className="import-spec-single">
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

          <Button className='import' disabled={!name} onClick={this.startImport}>Import!</Button>
        </div> }

        { toImport &&
          <div>
            <div className="import-header">
              <h4>Importing</h4>

              <div className="buttons">
                <Button onClick={this.finalise} disabled={!trackFoundCount} className="btn-success">
                  Create list{ trackFoundCount < toImport.length ? " (minus unmatched tracks)" : ''}
                </Button>
                <Button onClick={() => this.setState({toImport: null})}>Restart</Button>
              </div>
            </div>

            <div className='to-import'>
            {toImport.map((ti, idx) => (
              <ImportTrack key={idx}
                initialSearch={ti.initialSearch}
                matchTrackId={ti.trackId}
                onMatch={trackId =>
                  this.setState({
                    toImport: update(toImport, {
                      [idx]: {trackId: {$set: trackId}}
                    })
                  })
                }
              />
            ))}
            </div>
          </div>
        }

        { playListId && <div>
          <div className="import-header">
            <h4>Playlist imported</h4>
            <div>
              <Button onClick={() => this.setState({playListId: null})}>Restart</Button>
            </div>
          </div>

          <PlayList playListId={playListId} />
        </div> }
      </div>
    );
  }


  startImport() {
    const { tracksText } = this.state;

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
      if (headingIndices.duration != -1 && row[headingIndices.duration]) trackData.duration = row[headingIndices.duration];
      toImport.push({initialSearch: trackData});
    }

    this.setState({toImport});
  }


  finalise() {
    const { groupId, name, number, date, selectedCompilers, toImport } = this.state;

    const insertMetadata = {
      name,
      trackIds: toImport.filter(ti => !!ti.trackId).map(ti => ti.trackId)
    };
    if (groupId) insertMetadata.groupId = groupId;
    if (number) insertMetadata.number = number;
    if (date) insertMetadata.date = moment(date).unix();
    if (selectedCompilers) insertMetadata.compilerIds = selectedCompilers.map(c => c._id);

    Meteor.call('PlayList.new', insertMetadata, (error, playListId) => {
      if (error) {
        Bert.alert(error.reason ? error.reason : error.message, 'danger');
      } else {
        this.setState({
          toImport: null,
          playListId
        });
      }
    });
  }
  //
  // doImport() {
  //   const { importInProgress, lastImportIndex, trackInProgress } = this.state;
  //   let { toImport, playListId } = this.props;
  //   const self = this;
  //
  //   // If no play list to import into, or a track import is in progress, or we're all done.
  //   if (!playListId || trackInProgress || !importInProgress) return;
  //
  //   this.setState({trackInProgress: true});
  //
  //   const index = lastImportIndex + 1;
  //
  //   Session.set("ImportFromText_toImport", update(toImport,
  //     { [index]: { inProgress: { $set: true }}}
  //   ));
  //
  //   console.log(index, toImport[index].track);
  //
  //   Meteor.call('PlayList.addTrackFromSearch', playListId, toImport[index], (error, message) => {
  //     error = error && (error.reason || error.message) || message;
  //     toImport = update(toImport, { [index]: {
  //       inProgress: { $set: false },
  //       error: { $set: error },
  //       done: { $set: true }
  //     }});
  //
  //     Session.set("ImportFromText_toImport", toImport);
  //
  //     console.log('a', index, toImport.length, index < toImport.length-1);
  //
  //     self.setState({
  //       importInProgress: index < toImport.length-1,
  //       lastImportIndex: index,
  //       trackInProgress: false,
  //     });
  //   });
  // }
}


export default withTracker(({ match, roles }) => {
  const subCompilers = Meteor.subscribe('Compiler', {});
  const user = Meteor.user();
  const groupSelector = user && user.roles && (roles.includes('admin') ? {} : {name: {$in: Object.keys(user.roles)}});

  return {
    loading: !subCompilers.ready(),
    compilers: CompilerCollection.find({}, {sort: {name: 1}}).fetch(),
    groups: user && user.roles ? Meteor.groups.find(groupSelector, {sort: {name: 1}}).fetch() : [],
  };
})(ImportFromText);
