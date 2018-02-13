### Design goals
- Discuss use cases for the software. This will inform stuff around accounts, the notion of "groups", etc below.


### Music service integration
- Spotify: if receive 429 "rate limit...: on API request then wait specified time and try again https://developer.spotify.com/web-api/user-guide/#rate-limiting
- Add other services.


### Accounts ###
- Add captcha
- Add admin role (and 'group admin' role)?
- Integrate/link Compiler with/to User
- Add ownership to TrackLists, TrackListLists
- Add groups (eg JD)


### Import
- Disable setting Compilers for non-admins (what about group admins?)
- Disable importing into TrackListLists not owned by current user.
- For admins filter available TrackListLists by user's groups.


### Tags
- Add tagging system?
- Different tags for different things?
- Tags are unique to group?
- Eg JD group might have tags for Tracks for the JD stage(s) it appears in (staccato, ecstatic...)


### Display contextual info (generally relevant to users group(s))
- Track
  - list of TrackLists
- TrackList
  - list of TrackLists by same compiler
- Artist
  - list of Tracks (and corresponding TrackLists?)
- Compiler
  - list of TrackLists


### Images
Show images stored for Album, Artist and Compiler in imageURL field.
