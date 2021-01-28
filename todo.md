- General

    - In progress

    - Questions
        - how to scale down, so that we support small groups as well?
        - can we cluster posts, and display only a representative of each group? Or some other summary?
        - can we allow sketching equations or diagrams with a stylus or finger?
        - admin console with authentication? create new discussions, enable moderators
        - do we need to be able to send notifications to clients?
        - add a way for moderators to search posts?
        - add a way for moderators to summarize posts?
        - add a way for moderators to go back and view older topics?
        - add a way for moderators (and maybe ordinary users) to clear viewed status (to re-see older posts)?
        - add an interface for users or moderators to create subgroups/breakouts within a discussion?
        - how to establish shared secrets, e.g. for moderators
        - ability to set up and return from breakout discussions
        - vulnerability advisory for katex (npm audit)
    
    - Not yet
        - add a way to use Azure CLI to zipdeploy
        - make npm package
    
    - Done

- Server

    - In progress
        - POST LIKE should add/remove like
        - add a POST for user to endorse/unendorse a post
        - remove duplicates before shuffling
        - for each user@instance, remove all but latest post before shuffling
        - add a GET for top posts

    - Questions
        - keep a DB of allowed discussionIds with their titles and modtokens?
        - ability to show a prompt to everyone, e.g., in the discussion title box
        - should server version come as a response header instead of in response body?

    - Not yet
        - collect discussion properties into a single object: moderator tokens, title, ...
        - load a real item on GET ITEM
        - make a pass of checking that we catch appropriate errors
        - restart server on errors
        - make sure to close db on exit
        - figure out how to exclude .npmignore'd files on deploy
        - show how many likes each post has? (only for moderators? only for some other group?)
        - show posters when their posts are liked?
        - log IP or other identifying info for posters?
        - provide a robots.txt?

    - Done

- Client
    - In progress
        - make CSS for .response closer to that for popover
        - add an "expand" control that brings up a long post in the popover
        - add a "preview" control that uses popover to show what markdown will look like in my post
        - add a way to edit posts? or maybe keep all versions and just mark that new post is an edit? or maybe determine automatically by similarity?
        - scroll a new post into position only after adding stuff below it
        - button to show/reload top posts
        - badge posts with their #likes, #votes
        - rewrite instructions
        - add disclaimer on login: no PII

    - Questions
        - button to show/reload posts that are similar to a given one?
        - stream likes and votes?
        - add user's entered handle to the title floater box?
        - add a way to show a (floating?) prompt selected by the moderator?
        - or treat new topics as post and add to feed?
        - add a way for moderator to undo a tag post (or select a previous discussion to go back to)?
        - let moderator see poster handles?

    - Not yet
        - rate-limit warning messages
        - is there a way to enter tabs into the text box?
        - add a way to easily link to past posts
        - for post, load, tag: change button appearance while waiting for response; prevent repeated clicks
        - add recaptcha?
        - don't insert <CR> when we press ctrl-<CR> in the post box

    - Done
