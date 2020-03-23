- General

    - In progress

    - Questions
        - admin console with authentication?
        - how to allow starting a new discussion easily?
        - do we need to be able to send notifications to clients?
    
    - Not yet
        - make deploy
        - make npm package

- Server

    - In progress
        - load a real item on GET ITEM

    - Questions
        - keep a DB of allowed discussionIds?

    - Not yet
        - make a pass of checking that we catch appropriate errors
        - figure out how to exclude .npmignore'd files on deploy
        - restart server on errors
        - make sure to close db on exit
        - allow unliking (canceling a like)
        - show how many likes each post has?
        - show posters when their posts are liked?
        - log IP or other identifying info for posters?
        - provide a robots.txt?

    - Done

- Client
    - In progress
        - move like button inside of markdown-enabled posts
        - better spacing of like button for non-markdown posts

    - Not yet
        - add recaptcha?
        - don't insert <CR> when we press ctrl-<CR> in the post box
        - change button appearance while waiting for response; prevent repeated clicks when appropriate

    - Done
        - add "use strict"
        - better CSS for markdown-enabled posts
