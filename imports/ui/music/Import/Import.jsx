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

import CompilerCollection from '../../../api/Compiler/Compiler';
import TrackListListCollection from '../../../api/TrackListList/TrackListList';
import TrackList from '../TrackList/TrackList';
import TrackListList from '../TrackListList/TrackListList';
import NotFound from '../../nav/NotFound/NotFound';
import Loading from '../../misc/Loading/Loading';
import ProgressMonitor from '../../misc/ProgressMonitor/ProgressMonitor';

import './Import.scss';


const massImportPlaceholder =
`Enter lists to import, one per line, with fields separated by tab or semicolon.
First line must be headers. Only the URL field is required. For example:
Name	Number	Date	Compilers	URL
My first list	1	2018-01-09	Tor Mac	https://open.spotify.com/user/46554353/playlist/67YquHJGJabxbFnB9Yn4Y
My second list	2	2018-01-16	Billy Bob, Robin Bobin	https://open.spotify.com/user/893789762/playlist/2DnfP9e2KRc3C1zXIy96p`;

const fileImportPlaceholder =
`Select a spreadsheet file to import multiple lists from, in CSV or TSV format.
First row should be a list of headings and may include 'Name', 'Number', 'Date', 'Compilers', 'URL'`

const urlRE = /^.*(?:spotify\.com\/user\/(\w+)\/playlist\/(\w+))\s*$/;


class Import extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      trackListListId: null,
      singleName: '',
      singleNumber: 1,
      singleDate: moment().format('YYYY-MM-DD'),
      singleCompilers: [],
      singleURL: '',
      importFile: '',
      massImportText: '',
    };

    this.importFromSingle = this.importFromSingle.bind(this);
    this.getIdsForImport = this.getIdsForImport.bind(this);
    this.doImport = this.doImport.bind(this);
  }


  render() {
    const { loading, compilers, trackListLists, toImport } = this.props;

    if (loading) return ( <div className="Import"><Loading /></div> );

    console.log('render', toImport);

    const { inProgress, trackListListId, importedTrackLists, singleName,
      singleNumber, singleDate, singleCompilers, singleURL, importFile, massImportText } = this.state;

    return (
      <div className="Import">
        <div className="import-spec">
          <div className="import-spec-tracklistlist">
            <h4 title="Optionally select a track list list to add the imported list(s) into.">Import lists into:</h4>

            <Select className="tracklistlist"
              value={trackListListId} onChange={ v => this.setState({trackListListId: v._id}) }
              options={trackListLists} valueKey={"_id"} labelKey={"name"} />
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
              value={singleURL} onChange={ e => this.setState({singleURL: e.target.value}) }
              pattern={urlRE} />

            <Button onClick={this.importFromSingle}>Import!</Button>
          </div>

          <div className="import-spec-textarea">
            <h4>Mass import cut and paste</h4>

            <FormControl componentClass="textarea" placeholder={massImportPlaceholder}
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
              value={importFile} onChange={ e => this.setState({importFile: e.target.value}) }
            />

            <Button onClick={this.importFromFile}>Import!</Button>
          </div>

        </div>


        <div className="import-results">
          {toImport.map(ti => (
            <div className="import-item" key={ti.url}>
              { ti.listId ?
                <TrackList trackListId={ti.listId} viewContext="inline" />
                :
                <div className="import-pending">
                  <div className="name">{ti.insertMetadata.name || (ti.ids && ti.ids.spotifyListId)}</div>
                  <Loading />
                </div>
              }
            </div>
          ))}
        </div>
      </div>
    );
  }


  importFromSingle() {
    const { toImport } = this.props;

    const { trackListListId, singleName, singleNumber, singleDate, singleCompilers, singleURL } = this.state;

    // Ignore if already processed.
    if (toImport.find(ti => ti.url == singleURL)) return;

    const insertMetadata = {};
    if (trackListListId) insertMetadata.trackListListId = trackListListId;
    if (singleName) insertMetadata.name = singleName;
    if (singleNumber) insertMetadata.number = singleNumber;
    if (singleDate) insertMetadata.date = moment(singleDate).unix();
    if (singleCompilers) insertMetadata.compilerIds = singleCompilers;

    const importData = {
      insertMetadata,
      url: singleURL,
    }
    this.getIdsForImport(importData);

    toImport.push(importData);

    console.log('importFromSingle', toImport.length-1, importData);

    Session.set("Import_toImport", toImport);

    Meteor.defer(() => this.doImport(toImport.length-1));
  }


  getIdsForImport(importData) {
    importData.ids = {};

    const urlParts = importData.url.match(urlRE);
    if (!urlParts) {
      console.log("url error", urlParts);
      importData.error = "URL is malformed.";
      return;
    }

    // Spotify url (only supported type so far).
    if (urlParts[1]) {
      importData.ids.spotifyUserId = urlParts[1];
      importData.ids.spotifyListId = urlParts[2];
    }
  }


  doImport(index) {
    const { toImport } = this.props;

    console.log('doImport', index, toImport[index]);

    Meteor.call('TrackList.import', toImport[index].ids, toImport[index].insertMetadata, (error, results) => {
      console.log('mc results', error, results);

      if (error) {
        toImport[index].error = error.message;
      }
      else {
        toImport[index].listId = results.list._id;
        // TODO show results.tracksNotFound
      }

      Session.set("Import_toImport", toImport);
    });
  }

}


export default withTracker(({match}) => {
  const subCompilers = Meteor.subscribe('Compiler.all');
  const subTrackListLists = Meteor.subscribe('TrackListList.all');

  Session.setDefault("Import_toImport", []);

  return {
    loading: !subCompilers.ready() || !subTrackListLists.ready(),
    compilers: CompilerCollection.find().fetch(),
    trackListLists: TrackListListCollection.find().fetch(),
    toImport: Session.get("Import_toImport"),
  };
})(Import);
