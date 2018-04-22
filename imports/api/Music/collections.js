import Album from '../Album/Album';
import Artist from '../Artist/Artist';
import Compiler from '../Compiler/Compiler';
import PlayList from '../PlayList/PlayList';
import Track from '../Track/Track';

const musicCollection = {
  album: Album,
  artist: Artist,
  compiler: Compiler,
  playlist: PlayList,
  track: Track,
}

export { musicCollection };
