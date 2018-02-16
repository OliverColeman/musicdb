## v1 ##

  * Schema
    * Add basic tags (replaces PlayListList)
    * link different recordings of tracks (including covers)

  * Music service integration
    * Music brainz
      * https://github.com/jbraithwaite/nodebrainz
      * https://github.com/maxkueng/node-musicbrainz/network
      * https://github.com/hughrawlinson/node-acousticbrainz
      * https://github.com/murdos/musicbrainz-userscripts (autocomplete form for MB import)
    * Google play music

  * UI
    * Link to search on other platforms if no ID for platform
    * Import
      * Sources
        * plain text
        * csv, tsv
        * music service IDs/links
      * When importing from text use manual playlist editing form for tracks that can't be unambiguously matched on a service
      * Manual playlist creation/editing form
        * autocomplete fields for artist, track, album - search local DB, if less than five then query other services (MB) to populate local DB
        * "Add another track" button.
        * reordering
    * Show history and info for lists, tracks, artists, eg:
      - Track
        - list of TrackLists
      - TrackList
        - list of TrackLists by same Compiler
      - Artist
        - table/list of Tracks (and corresponding TrackLists?)
      - Compiler
        - list of TrackLists
    * Show images stored for Album, Artist and Compiler in imageURL field.


## Misc ##
- Handle import of track lists not on a music service.
- Spotify: if receive 429 "rate limit..." on API request then wait specified time and try again https://developer.spotify.com/web-api/user-guide/#rate-limiting
- Integrate/link Compiler with/to User
