- General

    - In progress
        - make deploy
        - make npm package

    - Questions
        - admin console with authentication?
        - how to allow starting a new discussion easily?
        - do we need to be able to send notifications to clients?

- Server

    - In progress
        - load a real item on GET ITEM

    - Questions
        - keep a DB of allowed discussionIds?

    - Not yet
        - make a pass of checking that we catch appropriate errors
        - figure out how to exclude .npmignore files on deploy
        - restart server on errors
        - make sure to close db on exit
        - allow unliking (canceling a like)
        - show how many likes each post has?
        - show posters when their posts are liked?
        - log IP or other identifying info for posters?
        - provide a robots.txt?

    - Done
        - change database ops that could be async to use promises
        - use a promise to return the body of a request
        - better understanding of node.js query semantics
        - add "use strict"

- Client
    - In progress
        - better CSS for markdown-enabled posts

    - Not yet
        - add recaptcha?
        - don't insert <CR> when we press ctrl-<CR> in the post box
        - change button appearance while waiting for response; prevent repeated clicks when appropriate

    - Done


