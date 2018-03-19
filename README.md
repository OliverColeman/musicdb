### Music DB

Music database app built on Meteor.

Initially being built for [Just Dance](https://www.facebook.com/groups/166298646868224).

**This is a work in progress.**


#### Making it go

1. [Install Meteor](https://www.meteor.com/install).
* Run `meteor --settings settings-development.json` from the root folder.
* Go to http://localhost:3000
* To import play lists you have to create an account/login first.

Run `meteor reset` to reset the DB.


#### Music service integration

Music DB can retrieve metadata and lists from Spotify and MusicBrainz.

For Spotify to work you'll need a Spotify developer account.
Then set environment variables `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` accordingly before launching Meteor.
