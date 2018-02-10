import { Jobs } from 'meteor/msavin:sjobs';

import ProgressMonitor from '../../../api/ProgressMonitor/ProgressMonitor';

import { getCompiler, getArtist, getAlbum, getTrack, getTrackList } from '../../../modules/server/music_service';

Jobs.register({
  "TrackList.import": function (ids, insertMetadata, progressId) {
    console.log('job import', ids, insertMetadata, progressId)

    const errHandler = (err) => {
      console.error("Import list job error", err.message);
      ProgressMonitor.setError(progressId, err.message);
    }

    try {
        getTrackList(ids, insertMetadata, progressId)
        .then(null, errHandler);
    }
    catch (err) {
      errHandler(err);
    }

    this.success();
  }
});
