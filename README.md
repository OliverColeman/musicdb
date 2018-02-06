### Music DB

Music database app built on Meteor.

Initially being built for [Just Dance](https://www.facebook.com/groups/166298646868224).

**This is a work in progress.**


#### Making it go

1. [Install Meteor](https://www.meteor.com/install).
2. Run `meteor --settings settings-development.json` from the root folder.
3. Go to http://localhost:3000

Some example lists will be imported from Spotify if credentials have been provided (see below). Importing can take a little while.

At the moment there's no UI for importing items. See:
* `imports/modules/server/music_service.js` for functions to get/create items.
* `imports/modules/server/fixtures` for some examples, this is where the examples are automatically imported.

Run `meteor reset` to reset the DB.


#### Spotify integration

Music DB can retrieve metadata and lists from Spotify.
You'll need a Spotify developer account.
Then set environment variables `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` accordingly before launching Meteor.


#### Schema

Check out `schema.txt`. `_id` fields are Meteor's internal Mongo document ids.
