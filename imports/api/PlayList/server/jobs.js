import { Jobs } from 'meteor/msavin:sjobs';

import { getCompiler, getArtist, getAlbum, getTrack, getPlayList } from '../../../modules/server/music/music_service';

Jobs.register({
  "PlayList.import": function (ids, insertMetadata) {
    //console.log('job import', ids, insertMetadata)

    const errHandler = (err) => {
      console.error("Import list job error", err.message);
    }

    try {
        getPlayList(ids, insertMetadata, progressId)
        .then(null, errHandler);
    }
    catch (err) {
      errHandler(err);
    }

    this.success();
  }
});
