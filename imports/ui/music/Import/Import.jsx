import React from 'react';
import PropTypes from 'prop-types';
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
import LoadingSmall from '../../misc/Loading/LoadingSmall';
import ProgressMonitor from '../../misc/ProgressMonitor/ProgressMonitor';

import './Import.scss';

const massImportPlaceholder =
`Enter lists to import, one per line, with fields separated by tab or semicolon.
The first line must be headers. Only the URL field is required.`;

const massImportHoverText =
`Example:
Name; Number; Date; Compilers; URL
Nice; 2018-01-09; Robin Bobin; https://spotify.com/user/123/playlist/67Yq
Cool; 2018-01-16; Tor Mac, Billy Bob; spotify.com/user/456/playlist/2Dnf`;

const fileImportPlaceholder =
`Select a spreadsheet file to import multiple lists from, in CSV or TSV format.
First row should be a list of headings and may include 'Name', 'Number', 'Date', 'Compilers', 'URL'`


class Import extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      groupId: null,
      singleName: '',
      singleNumber: 1,
      singleDate: moment().format('YYYY-MM-DD'),
      singleCompilers: [],
      singleURL: '',
      importFile: '',
      massImportText: '',
      importInProgress: false,
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
    const { loading, compilers, groups, toImport } = this.props;

    if (loading) return ( <div className="Import"><Loading /></div> );

    const { inProgress, groupId, importedPlayLists, importFile, massImportText, lastImportIndex,
      singleName, singleNumber, singleDate, singleCompilers, singleURL } = this.state;

    return (
      <div className="Import">
        <div className="import-spec">
          <div className="import-spec-group">
            <h4 title="Optionally select a group to add to the imported list(s).">Add group:</h4>

            <Select className="group"
              value={groupId} onChange={ value => this.setState({groupId: value ? value._id : null}) }
              options={groups} valueKey={"_id"} labelKey={"name"} />
          </div>

          <div className="import-spec-single">
            <h4>Single list import</h4>

            <FormControl componentClass="input" type="text" className="listname"
              placeholder="List name" title="List name"
              value={singleName} onChange={ e => this.setState({singleName: e.target.value}) } />

            <FormControl componentClass="input" type="number" className="listnumber"
              placeholder="List number" title="List number"
              value={singleNumber} onChange={ e => this.setState({singleNumber: parseInt(e.target.value)}) } min={0} />

            <FormControl componentClass="input" type="date" className="listdate"
              placeholder="List date" title="List date"
              value={singleDate} onChange={ e => this.setState({singleDate: e.target.value}) }
              pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}" />

            <Select className="listcompilers" placeholder="Compiler(s)" title="Compiler(s)"
              value={singleCompilers} onChange={ v => this.setState({singleCompilers: v}) }
              multi={true} options={compilers} valueKey={"_id"} labelKey={"name"} />

            <FormControl componentClass="input" type="text" className="listurl"
              placeholder="List URL" title="List URL, like 'open.spotify.com/user/46554353/playlist/67YquHJGJabxbFnB9Yn4Y'"
              value={singleURL} onChange={ e => this.setState({singleURL: e.target.value}) } />

            <Button onClick={this.importFromSingle}>Import!</Button>
          </div>

          <div className="import-spec-textarea">
            <h4>Mass import cut and paste</h4>

            <FormControl componentClass="textarea" placeholder={massImportPlaceholder} title={massImportHoverText}
              value={massImportText} onChange={ e => this.setState({massImportText: e.target.value}) }
              rows={ Math.max(5, Math.min(15, massImportText.split(/\r|\r\n|\n/).length)) }
              wrap="off"
            />

            <Button onClick={this.importFromTextArea}>Import!</Button>
          </div>

          <div className="import-spec-file">
            <h4>Mass import CSV or TSV file</h4>

            <FormControl componentClass="input" type="file"
              className="listfile" title={fileImportPlaceholder}
              onChange={ e => this.setState({importFile: e.target.files[0]}) }
            />

            <Button onClick={this.importFromFile}>Import!</Button>
          </div>

        </div>


        <div className="import-results">
          {toImport.map((ti, idx) => (
            ti.listId ?
              <div className="import-item" key={ti.url}>
                <label>{idx + 1}</label>
                <div /><PlayList playListId={ti.listId} viewType="inline" />
                <div className="url"><a href={ti.url} target="_blank">{ti.url}</a></div>
                <div className="error">{ti.error}</div>
              </div>
              :
              <div className="import-item" key={ti.url}>
                <label>{idx + 1}</label>
                {idx == (lastImportIndex+1) ? <LoadingSmall /> : <div className="waiting">{ti.error ? "" : "⌛"}</div>}
                <div className="name">{ti.insertMetadata.name}</div>
                <div className="url"><a href={ti.url} target="_blank">{ti.url}</a></div>
                <div className="error">{ti.error}</div>
              </div>
          ))}
        </div>
      </div>
    );
  }


  importFromSingle() {
    const { toImport } = this.props;

    const { groupId, singleName, singleNumber, singleDate, singleCompilers, singleURL } = this.state;

    const singleURLNoQuery = singleURL.split('?')[0];

    // Ignore if already processed.
    if (toImport.find(ti => ti.url == singleURLNoQuery)) return;

    const insertMetadata = {};
    if (groupId) insertMetadata.groupId = groupId;
    if (singleName) insertMetadata.name = singleName;
    if (singleNumber) insertMetadata.number = singleNumber;
    if (singleDate) insertMetadata.date = moment(singleDate).unix();
    if (singleCompilers) insertMetadata.compilerIds = singleCompilers.map(c => c._id);
    const importData = {
      insertMetadata,
      url: singleURLNoQuery,
    }

    toImport.push(importData);
    Session.set("Import_toImport", toImport);
  }


  importFromTextArea() {
    const { massImportText } = this.state;
    const rows = massImportText
                  .split(/[\r\n]/)
                  .map(line => line.split(/[;\t]/).map(v => v.trim()));
    this.massImport(rows);
  }


  importFromFile() {
    const { importFile } = this.state;
    Papa.parse(importFile, {
      complete: (results) => {
        if (results.data.length == 0) {
          const errors = results.errors.length
                      ? results.errors.map(e => e.message).join('<br/>')
                      : "Empty file or unknown error.";
          Bert.alert("Errors parsing file:<br\>" + errors, 'danger');
        }
        else {
          this.massImport(results.data);
        }
      }
    });
  }


  massImport(rows) {
    const { toImport, compilers } = this.props;
    const { groupId } = this.state;

    rows = rows.filter(row => row.join('').trim().length > 0);

    const headingIndices = {};
    const firstRow = rows[0].map(v => v.toLowerCase());
    for (let h of [ 'name', 'number', 'date', 'compilers', 'url' ]) {
      headingIndices[h] = firstRow.indexOf(h);
    }
    if (headingIndices.url == -1) {
      Bert.alert("Missing URL column header", 'danger');
      return;
    }

    // Make sure all rows have url.
    for (let ri = 1; ri < rows.length; ri++) {
      if (!rows[ri][headingIndices.url]) {
        Bert.alert("Missing URL on row " + (ri+1), 'danger');
        return;
      }
    }

    let originalToImportLength = toImport.length;

    for (let ri = 1; ri < rows.length; ri++) {
      let row = rows[ri];
      const urlNoQuery = row[headingIndices.url].split('?')[0];
      // Ignore if already processed.
      if (toImport.find(ti => ti.url == urlNoQuery)) return;

      const insertMetadata = {};
      if (groupId) insertMetadata.groupId = groupId;
      if (headingIndices.name != -1 && row[headingIndices.name]) insertMetadata.name = row[headingIndices.name];
      if (headingIndices.number != -1 && row[headingIndices.number]) insertMetadata.number = parseInt(row[headingIndices.number]);
      if (headingIndices.date != -1 && row[headingIndices.date]) insertMetadata.date = moment(row[headingIndices.date]).unix();
      if (headingIndices.compilers != -1 && row[headingIndices.compilers]) {
        insertMetadata.compilerIds = row[headingIndices.compilers]
          .split(',')
          .map(compilerName => compilers.find(c => c.name.toLowerCase() == compilerName.trim().toLowerCase()))
          .filter(c => !!c)
          .map(c => c._id);
      }
      const importData = {
        insertMetadata,
        url: urlNoQuery,
      }
      //console.log('importData', importData);
      toImport.push(importData);
    }
    Session.set("Import_toImport", toImport);
  }


  doImport() {
    const { importInProgress, lastImportIndex } = this.state;
    const { toImport } = this.props;

    if (importInProgress) return;
    if (toImport.length - 1 <= lastImportIndex) return;

    this.setState({importInProgress: true});
    const index = lastImportIndex + 1;

    Meteor.call('PlayList.import', toImport[index].url, toImport[index].insertMetadata, (error, list) => {
      if (error) {
        toImport[index].error = error.reason ? error.reason : error.message;
      }
      else {
        toImport[index].listId = list._id;
        // TODO if the list contains tracks that need review then show a symbol or similar
        // to indicate this, which perhaps when clicked on opens the list in a modal window.
      }
      Session.set("Import_toImport", toImport);

      this.setState({
        importInProgress: false,
        lastImportIndex: index,
      });
    });
  }
}


export default withTracker(({ match, roles }) => {
  const subCompilers = Meteor.subscribe('Compiler.all');
  const user = Meteor.user();
  const groupSelector = user && user.roles && (roles.includes('admin') ? {} : {name: {$in: Object.keys(user.roles)}});

  Session.setDefault("Import_toImport", []);

  return {
    loading: !subCompilers.ready(),
    compilers: CompilerCollection.find().fetch(),
    groups: user && user.roles ? Meteor.groups.find(groupSelector).fetch() : [],
    toImport: Session.get("Import_toImport"),
  };
})(Import);
