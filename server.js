
// FIXME: admin console with authentication?
// FIXME: how to allow starting a new discussion easily?
// FIXME: keep a DB of allowed discussionIds?
// FIXME: do we need to be able to send notifications to clients?

// FIXME: check that we catch appropriate errors
// FIXME: shuffle items
// FIXME: load a real item on GET ITEM

// FIXME: figure out how to exclude .npmignore files on deploy
// FIXME: restart server on errors
// FIXME: make sure to close db on exit
// FIXME: allow unliking (canceling a like)
// FIXME: show how many likes each post has?
// FIXME: show posters when their posts are liked?
// FIXME: log IP or other identifying info for posters?
// FIXME: provide a robots.txt?

const http = require('http');
const path = require('path');
const fs = require('fs');
const loki = require('lokijs');

const discussionIds = { '5X324': 'Test discussion' };

var server;
var dbs = {};

// construct or reconstruct the server from scratch
function init() {
  if (server) {
    server.close();
  }
  server = http.createServer(httpHandler);
  if (dbs) {
    for (var key in dbs) {
      dbs[key].close();
    }
    dbs = {};
  }
  // server.on("error", (err) => {
  //   console.error(err);
  //   console.error("uncaught error, restarting server");
  //   init();
  // });
  server.listen(process.env.PORT);
}

// get the database for a given discussion ID; create/load it if necessary
function getDb(discId) {
  if (discId in dbs) {
    let db = dbs[discId];
    return db;
  } else if (discId in discussionIds) {
    let db = new loki("data/" + discId, {
      autoload: true,
      autoloadCallback : () => dbInit(db),
      autosave: true, 
      autosaveInterval: 4000
    });
    dbs[discId] = db;
    return db;
  } else {
    throw new Error("invalid discussion: " + discId);
  }
}

// callback after DB load: ensure the required entities are present
function dbInit(db) {
  var posts = db.getCollection("posts");
  if (!posts) {
    posts = db.addCollection("posts");
    var lorempost = { text: "#### Lorem ipsum\n\nDolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim $\\int e^xdx$ ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.", handle: "Cicero", discussion: "5X324", md: true, instance: "000000000000000" };
    posts.insert(lorempost);
  }
}

// get the posts collection from the given DB; create it if necessary
function getPosts(db) {
  var posts = db.getCollection("posts");
  if (!posts) {
    posts = db.addCollection("posts");
    var lorempost = { text: "#### Lorem ipsum\n\nDolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim $\\int e^xdx$ ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.", handle: "Cicero", discussion: "5X324", md: true, instance: "000000000000000" };
    posts.insert(lorempost);
  }
  return posts;
}

// Delete all but a whitelisted set of fields in a post record.
// Based on the value of the id argument, translate internal/external IDs: if
//    id == "in": external ID is moved to internal ID field, if present
//    id == "out": internal ID is moved to external ID field, if present
//    anything else: both ID fields are stripped
function checkAllowedFields(post, id) {
  const postFields = { text: 1, handle: 1, discussion: 1, instance: 1, md: 1, created: 1 };
  var res = {};
  for (field in postFields) {
    if (field in post) {
      res[field] = post[field];
    }
  }
  if (id == "in") {
    if ("id" in post) {
      res.$loki = post.id;
    }
  } else if (id == "out") {
    if ("$loki" in post) {
      res.id = post.$loki;
    }
  }
  return res;
}

// Wait until the body of a request is present, then call handler
// If an error happens, call errHandler instead
function bodyOf(request, handler, errHandler) {
  let body = [];
  request.on('error', (err) => {
    console.error(err);
    errHandler();
  }).on('data', (d) => {
    body.push(d);
  }).on('end', () => {
    body = Buffer.concat(body).toString();
    if (body) {
      body = JSON.parse(body);
    } else {
      body = {};
    }
    handler(body);
  });
}

// pick a post from a given discussion to show a user (identified by handle+instance)
function pickPost(handle, instance, discussion) {

  // var sortedposts = posts.getDynamicView(discussion);
  // if (!sortedposts) {
  //   sortedposts = posts.addDynamicView(discussion);
  //   sortedposts.applySimpleSort("created");
  // }

  var posts = getPosts(getDb(discussion));
  var lorempost = posts.findOne({handle: "Cicero"});
  var res = {...lorempost};
  return res;
}

// main handler for HTTP requests
function httpHandler(request, response) {
  var requrl = new URL(request.url, 'http://example.com/'); // FIXME: is this default what we want?
  var reqpath = path.parse(path.normalize(requrl.pathname));
  var query = new URLSearchParams(requrl.search);
  var method = request.method;
  console.log('request: ' + request.url + ", " + method);

  // handle GET for a subset of URLs without requiring a discussion ID
  if (method == 'GET') {
    console.log('get: ' + JSON.stringify(reqpath));
    if (reqpath.dir == '/css') {                                     // GET CSS
      if (reqpath.base == 'delphi.css') {
        fs.createReadStream('delphi.css').pipe(response);
      } else {
        response.statusCode = 404;
        response.end();
      }
      return;
    } else if (reqpath.dir == '/js') {                               // GET JS
      if (reqpath.base == 'delphi.js') {
        fs.createReadStream('delphi.js').pipe(response);
      } else if (reqpath.base == 'bundle.js') {
        fs.createReadStream('bundle.js').pipe(response);
      } else {
        response.statusCode = 404;
        response.end();
      }
      return;
    } else if (reqpath.dir == '/title') {                            // GET TITLE
      console.log('title: ' + reqpath.base);
      if (reqpath.base in discussionIds) {
        var res = { title: discussionIds[reqpath.base], id: reqpath.base };
        response.end(JSON.stringify(res));
      } else {
        response.statusCode = 404;
        response.end();
      }
      return;
    } else if (reqpath.dir == '/') {                                  // GET / (root dir)
      if (reqpath.base in {'': 0, 'index.html': 0, 'delphi.html': 0}) {
        fs.createReadStream('delphi.html').pipe(response);
        return;
      } else if (reqpath.base == 'favicon.ico'){
        fs.createReadStream('favicon.ico').pipe(response);
        return;
      }
    }
  }

  // all other interactions require a valid discussion ID
  var discussion = query.get('d');
  if (!(discussion in discussionIds)) {
    console.log('invalid discussion: ' + discussion);
    response.statusCode = 404;
    response.end();
    return;
  }

  // remaining GET requests
  if (method == 'GET') {
    if (reqpath.dir == '/item') {                                     // GET ITEM
      console.log('item: ' + reqpath.base);
      if (reqpath.base == "shuffle") {
        console.log('shuffle');
        var handle = query.get('h');
        var instance = query.get('i');
        var res = pickPost(handle, instance, discussion);
        res = checkAllowedFields(res, "out");
        response.end(JSON.stringify(res));
      } else {
        var posts = getPosts(getDb(discussion));
        var lorempost = posts.findOne({handle: "Cicero"});
        var res = {...lorempost};
        res = checkAllowedFields(res, "out");
        // throw new Error("test error");
        response.end(JSON.stringify(res));
      }
    
    // no other GET requests allowed
    } else {
      response.statusCode = 404;
      response.end();
    }

  // handle POST requests -- these pay attention to the body of the request
  } else if (method == 'POST') {
    console.log('post: ' + JSON.stringify(reqpath));
    var onerr = (err) => {
      response.statusCode = 500;
      response.end();
    };
    if (reqpath.dir == '/item' && reqpath.base == 'post') {        // POST ITEM
      bodyOf(request, (body) => {
        if (body && "text" in body) {
          body.created = Date.now();
          body = checkAllowedFields(body, false);
          let posts = getPosts(getDb(discussion));
        posts.insert(body);
          console.log(JSON.stringify(body));
          response.end(JSON.stringify({ status: 'success', id: body.$loki }))
        } else {
          console.log("empty or malformed post, ignored")
          response.statusCode = 400;
          response.end();
        }
      }, onerr);
    } else if (reqpath.dir == '/like') {                           // POST LIKE
      let posts = getPosts(getDb(discussion));
      var likedPost = posts.get(reqpath.base);
      if (!likedPost) {
        response.statusCode = 404;
        response.end();
      } else {
        bodyOf(request, (body) => {
          if (!body || !("handle" in body)) {
            response.statusCode = 403;
            response.end();
          } else  {
            var l = likedPost.likes || {};
            l[body.handle] = true;
            likedPost.likes = l;
            posts.update(likedPost);
            response.end();
          }
        }, onerr);
      }

    // no other POST requests allowed
    } else {
      response.statusCode = 403;
      response.end();
    }

  // no requests besides GET and POST allowed
  } else {
    console.log("unexpected method: " + method)
    response.statusCode = 405;
    response.end();
  }
}

init();
