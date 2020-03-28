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
    
    - Not yet
        - add a way to use Azure CLI to zipdeploy
        - make npm package
    
    - Done

- Server

    - In progress
        - add a POST for user to endorse a post
        - remove duplicates before shuffling
        - for each user@instance, remove all but latest post before shuffling

    - Questions
        - keep a DB of allowed discussionIds with their titles and modtokens?
        - ability to show a prompt to everyone, e.g., in the discussion title box

    - Not yet
        - add current software version ID to responses
        - collect discussion properties into a single object: moderator tokens, title, ...
        - load a real item on GET ITEM
        - make a pass of checking that we catch appropriate errors
        - figure out how to exclude .npmignore'd files on deploy
        - restart server on errors
        - make sure to close db on exit
        - allow unliking (canceling a like)
        - show how many likes each post has? (only for moderators? only for some other group?)
        - show posters when their posts are liked?
        - log IP or other identifying info for posters?
        - provide a robots.txt?

    - Done

- Client
    - In progress
        - add a way to minimize the post box
        - three columns: my posts, others' posts, promoted posts
        - better interface than double clicking to endorse?
        - add a way to edit posts? or maybe keep all versions and just mark that new post is an edit?
        - make the instructions not take up so much space all the time? (maybe treat them like a post?)
        - have a way to pop up a markdown cheat sheet

    - Questions
        - add a way to show a (floating?) prompt selected by the moderator?
        - or treat new topics as post and add to feed?
        - add a way for moderator to undo a tag post (or select a previous discussion to go back to)?
        - let moderator see poster handles?
        - good way to show post previews for markdown?

    - Not yet
        - is there a way to enter tabs into the text box?
        - improve style sheet for tables, block quotes, code blocks
        - add a way to easily link to past posts
        - for post, load, tag: change button appearance while waiting for response; prevent repeated clicks
        - add version ID
        - check to see if we're out of date by comparing to server version ID
        - add recaptcha?
        - don't insert <CR> when we press ctrl-<CR> in the post box

    - Done
        - float the post box and controls at the bottom always
        - max height for posts
        - minify the post box and controls if we click outside of it
