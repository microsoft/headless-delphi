const http = require('http');
const path = require('path');
const fs = require('fs');
const loki = require('lokijs');

const discussionIds = { '5X324': 'Test discussion' };

var server;       // the main HTTP server
var dbs = {};     // maps discussion IDs to DBs
var posts = {};   // maps discussion IDs to posts collections
var tags = {};    // maps discussion IDs to latest tags

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
  posts = {};
  tags = {};
  // server.on("error", (err) => {
  //   console.error(err);
  //   console.error("uncaught error, restarting server");
  //   init();
  // });
  server.listen(process.env.PORT || 8000);
}

// get the database for a given discussion ID; create/load it if necessary
function getDb(discId) {
  if (discId in dbs) {
    let db = dbs[discId];
    return db;
  } else if (discId in discussionIds) {
    let db = new loki("data/" + discId, {
      autoload: true,
      autosave: true, 
      autosaveInterval: 4000
    });
    dbs[discId] = db;
    return db;
  } else {
    throw new Error("invalid discussion: " + discId);
  }
}

// get the posts collection from the given discussion; create it if necessary
function getPosts(discId) {
  if (discId in posts) {
    return posts[discId];
  } else {
    var db = getDb(discId);
    var postcoll = db.getCollection("posts");
    if (!postcoll) {
      postcoll = db.addCollection("posts");
      var lorempost = { text: "#### Lorem ipsum\n\nDolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim $\\int e^xdx$ ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.", special: "tag", created: 0, handle: "Cicero", discussion: "5X324", md: true, instance: "000000000000000" };
      postcoll.insert(lorempost);
    }
    posts[discId] = postcoll;
    return postcoll;  
  }
}

// get the latest tag post from the given discussion
function getTag(discId) {
  if (discId in tags) {
    return tags[discId];
  } else {
    var p = getPosts(discId);
    var sortedtags = p.chain()
    .find({'special': 'tag'})
    .simplesort('created')
    .data();
    var tag = sortedtags.pop();
    console.log('tag: ' + JSON.stringify(tag));
    tags[discId] = tag;
    return tag;
  }
}

// Delete all but a whitelisted set of fields in a post record.
// Based on the value of the id argument, translate internal/external IDs: if
//    id == "in": external ID is moved to internal ID field, if present
//    id == "out": internal ID is moved to external ID field, if present
//    anything else: both ID fields are stripped
function checkAllowedFields(post, id) {
  const postFields = { text: 1, author: 1, discussion: 1, instance: 1, md: 1, created: 1, special: 1 };
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

// sample n items without replacement from a list
// if n > list.length, return the entire list
function sample(n, list) {
  let len = Math.min(n, list.length);
  let permute = Array.from({length: len}, (_, i) => [Math.random(), i]);
  permute.sort((a, b) => a[0] - b[0]);
  res = [];
  for (i of permute) {
    res.push(list[i[1]]);
  }
  return res;
}

// Pick a post from a given discussion to show a user (identified by handle+instance)
// Return up to nPosts posts that the given user hasn't seen yet
// Include only posts after the most recent tag
// Favor recent posts (recency = number of milliseconds)
function pickPosts(nPosts, recency, handle, instance, discId) {
  try {
    var p = getPosts(discId);
    var tg = getTag(discId);
    var hi = handle + '@' + instance;
    var eligible = p.chain()
    .find({'created': {'$gt': tg.created}})
    .where((obj) => (obj.author != handle) || (obj.instance != instance))
    .where((obj) => !(hi in (obj.viewers || {})));
    console.log('eligible posts: ' + eligible.data.length);
    var cutoff = Date.now - recency;
    var recent = eligible.find({'created': {'$gte': cutoff}}).data();
    console.log('recent: ' + recent.length);
    if (nPosts <= recent.length) {
      return sample(nPosts, recent);
    } else {
      var notrecent = eligible.find({'created': {'$lt': cutoff}}).data();
      console.log('not recent: ' + notrecent.length);
      return recent.concat(sample(nPosts - recent.length, notrecent));
    }  
  } catch (e) {
    console.error('database search problem: shuffle');
    console.error(e);
    return [];
  }
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
    if (reqpath.dir == '/item') {
      console.log('item: ' + reqpath.base);
      if (reqpath.base == "shuffle") {                                 // GET SHUFFLED ITEM
        console.log('shuffle');
        let handle = query.get('h');
        let instance = query.get('i');
        let nPosts = query.get('n');
        let res = pickPosts(nPosts, 5*60*1000, handle, instance, discussion);
        for (p of res) {
          let posts = getPosts(discussion);
          let viewers = {};
          if ('viewers' in p) {
            viewers = p.viewers;
          }
          viewers[handle + '@' + instance] = Date.now();
          p.viewers = viewers;
          posts.update(p);
        }
        console.log("result: " + JSON.stringify(res));
        res = res.map((x) => checkAllowedFields(x, "out"));
        console.log("result: " + JSON.stringify(res));
        response.end(JSON.stringify(res));
      } else {                                                         // GET ITEM BY ID
        let posts = getPosts(discussion);
        let lorempost = posts.findOne({author: "Cicero"});
        let res = {...lorempost};
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
    let onerr = (err) => {
      response.statusCode = 500;
      response.end();
    };
    if (reqpath.dir == '/item' && reqpath.base == 'post') {        // POST ITEM
      bodyOf(request, (body) => {
        if (body && "text" in body) {
          body.created = Date.now();
          body = checkAllowedFields(body, false);
          let posts = getPosts(discussion);
          posts.insert(body);
          console.log(JSON.stringify(body));
          response.end(JSON.stringify({ status: 'success', id: body.$loki }))
        } else {
          console.log("empty or malformed post, ignored")
          response.statusCode = 400;
          response.end();
        }
      }, onerr);
    } else if (reqpath.dir == '/tag') {                           // POST NEW TAG
      bodyOf(request, (body) => {
        if (body && "text" in body) {
          body.created = Date.now();
          body.special = 'tag';
          body = checkAllowedFields(body, false);
          let posts = getPosts(discussion);
          posts.insert(body);
          console.log(JSON.stringify(body));
          response.end(JSON.stringify({ status: 'success', id: body.$loki }))
        } else {
          console.log("empty or malformed tag post, ignored");
          response.statusCode = 400;
          response.end();
        }
      }, onerr);
    } else if (reqpath.dir == '/like') {                           // POST LIKE
      let posts = getPosts(discussion);
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
