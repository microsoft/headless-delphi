- General

    - In progress

    - Questions
        - can we allow sketching equations or diagrams with a stylus or finger?
        - admin console with authentication? create new discussions, enable moderators
        - do we need to be able to send notifications to clients?
        - add a way for moderators to search posts?
        - add a way for moderators to summarize posts?
        - add a way for moderators to go back and view older topics?
        - add a way for moderators (and maybe ordinary users) to clear viewed status (to re-see older posts)?
    
    - Not yet
        - make deploy
        - make npm package

- Server

    - In progress

    - Questions
        - keep a DB of allowed discussionIds with their titles and modtokens?

    - Not yet
        - add current software version ID to responses
        - collect discussion properties into a single object: moderator tokens, title, ...
        - load a real item on GET ITEM
        - make a pass of checking that we catch appropriate errors
        - figure out how to exclude .npmignore'd files on deploy
        - restart server on errors
        - make sure to close db on exit
        - allow unliking (canceling a like)
        - show how many likes each post has? (only for moderators)
        - show posters when their posts are liked?
        - log IP or other identifying info for posters?
        - provide a robots.txt?

    - Done

- Client
    - In progress
        - change button appearance while waiting for response; prevent repeated clicks when appropriate
        - a way to easily reuse content from past posts? (show source? click to copy source to post box?)
        - a way to easily link to past posts?

    - Not yet
        - add version ID
        - check to see if we're out of date by comparing to server version ID
        - post previews for markdown
        - add recaptcha?
        - don't insert <CR> when we press ctrl-<CR> in the post box
        - fix extra space to right of responseList?

    - Done
        - keep relative times on posts up to date