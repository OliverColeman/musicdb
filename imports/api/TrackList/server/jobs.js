import { Jobs } from 'meteor/msavin:sjobs';

import { getCompiler, getArtist, getAlbum, getTrack, getTrackList } from '../../../modules/server/music_service';

Jobs.register({
  "TrackList.import": function (ids, insertMetadata) {
    console.log('job import', ids, insertMetadata)

    const errHandler = (err) => {
      console.error("Import list job error", err.message);
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
