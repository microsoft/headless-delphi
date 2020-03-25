"use strict";
const http = require('http');
const path = require('path');
const fs = require('fs');
const loki = require('lokijs');

const discussionIds = { '5X324': 'Test discussion' };

var server;       // the main HTTP server
var dbs = {};     // cache: maps discussion IDs to DBs
var posts = {};   // cache: maps discussion IDs to posts collections
var tags = {};    // cache: maps discussion IDs to latest tags

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

// Get the database for a given discussion ID; create/load it if necessary.
// Returns a promise that waits for loading to finish, then resolves with the db.
function getDb(discId) {
  return new Promise((resolve, reject) => {
    if (discId in dbs) {
      resolve(dbs[discId]);
    } else if (discId in discussionIds) {
      let db = new loki("data/" + discId, {
        autoload: true,
        autosave: true, 
        autoloadCallback: () => {
          console.log('finished loading db');
          dbs[discId] = db;
          resolve(db);
        },
        autosaveInterval: 4000
      });
    } else {
      reject(new Error("invalid discussion: " + discId));
    }
  });
}

// Get the posts collection from the given discussion; create or load it if necessary.
// Returns a promise that waits for loading to finish, then resolves with the collection.
function getPosts(discId) {
  console.log('get posts: ' + discId);
  if (discId in posts) {
    console.log('already cached');
    console.log('length: ' + posts[discId].data.length);
    return Promise.resolve(posts[discId]);
  } else {
    console.log('checking db');
    return getDb(discId)
    .then((db) => {
      let postcoll = db.getCollection("posts");
      if (!postcoll) {
        console.log('creating posts')
        postcoll = db.addCollection("posts");
        let first = { text: "**_discussion start_**", special: "tag", created: Date.now(), discussion: discId, md: true, author: "system", instance: "000000000000000" };
        postcoll.insert(first);
      }
      posts[discId] = postcoll;
      console.log('length of posts collection: ' + posts[discId].data.length);
      return postcoll;  
    });
  }
}

// Get the latest tag post from the given discussion; load or create the db or discussion if necessary.
// Returns a promise that resolves with the tag post.
function getTag(discId) {
  if (discId in tags) {
    return Promise.resolve(tags[discId]);
  } else {
    return getPosts(discId)
    .then((p) => {
      let sortedtags = p.chain()
      .find({'special': 'tag'})
      .simplesort('created')
      .data();
      let tag = sortedtags.pop();
      console.log('tag: ' + JSON.stringify(tag));
      tags[discId] = tag;
      return tag;
    });
  }
}

// Delete all but a whitelisted set of fields in a post record.
// Based on the value of the id argument, translate internal/external IDs: if
//    id == "in": external ID is moved to internal ID field, if present
//    id == "out": internal ID is moved to external ID field, if present
//    anything else: both ID fields are stripped
function checkAllowedFields(post, id) {
  const postFields = { text: 1, author: 1, discussion: 1, instance: 1, md: 1, created: 1, special: 1 };
  let res = {};
  for (let field in postFields) {
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

// Make a promise for the JSON content of the body of a request
// Empty body becomes null
function bodyOf(request) {
  let body = [];
  return new Promise((resolve, reject) => {
    request.on('error', (err) => reject(err))
    .on('data', (d) => body.push(d))
    .on('end', () => {
      body = Buffer.concat(body).toString();
      if (body) {
        body = JSON.parse(body);
      } else {
        body = null;
      }
      resolve(body);
    });
  });
}

// sample n items without replacement from a list
// if n > list.length, return the entire list
function sample(n, list) {
  let len = Math.min(n, list.length);
  let res = [];
  let permute = Array.from({length: len}, (_, i) => [Math.random(), i]);
  permute.sort((a, b) => a[0] - b[0]);
  for (let i of permute) {
    res.push(list[i[1]]);
  }
  return res;
}

// Pick a post from a given discussion to show a user (identified by handle+instance)
// Return up to nPosts posts that the given user hasn't seen yet
// Include only posts after the most recent tag
// Favor recent posts (recency = number of milliseconds)
function pickPosts(nPosts, recency, handle, instance, discId) {
  return Promise.all([getPosts(discId), getTag(discId)])
  .then(([p, tg]) => {
    let hi = handle + '@' + instance;
    let eligible = p.chain()
    .find({'created': {'$gt': tg.created}})
    .where((obj) => (obj.author != handle) || (obj.instance != instance))
    .where((obj) => !(hi in (obj.viewers || {})));
    console.log('eligible posts: ' + eligible.data().length);
    let elBranch = eligible.branch();
    let cutoff = Date.now() - recency;
    let recent = eligible.find({'created': {'$gte': cutoff}}).data();
    console.log('recent: ' + recent.length);
    if (nPosts <= recent.length) {
      return sample(nPosts, recent);
    } else {
      let notrecent = elBranch.find({'created': {'$lt': cutoff}}).data();
      console.log('not recent: ' + notrecent.length);
      return recent.concat(sample(nPosts - recent.length, notrecent));
    }  
  })
  .catch((e) => {
    console.error('database search problem: shuffle');
    console.error(e);
    return [];
  });
}

// main handler for HTTP requests
function httpHandler(request, response) {
  var requrl = new URL(request.url, 'http://example.com/'); // default is required here, but we don't use its value below
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
      if (reqpath.base == 'bundle.js') {
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
        let nPosts = Number(query.get('n')) || 0;
        Promise.all([getPosts(discussion), pickPosts(nPosts, 5*60*1000, handle, instance, discussion)])
        .then(([posts, picked]) => {
          console.log('picked: ' + picked);
          for (let p of picked) {
            let viewers = {};
            if ('viewers' in p) {
              viewers = p.viewers;
            }
            viewers[handle + '@' + instance] = Date.now();
            p.viewers = viewers;
            posts.update(p);
          }
          console.log("result: " + JSON.stringify(picked));
          picked = picked.map((x) => checkAllowedFields(x, "out"));
          console.log("result: " + JSON.stringify(picked));
          response.end(JSON.stringify(picked));
        })
        .catch((err) => {
          console.error('Error while shuffling:' + JSON.stringify(err));
          response.statusCode = 500;
          response.end();
        });
      } else {                                                         // GET ITEM BY ID
        getPosts(discussion)
        .then((posts) => {
          let res = { text: "#### Lorem ipsum\n\nDolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.", special: "lorem", created: 0, author: "Cicero", discussion: "5X324", md: true, instance: "000000000000000" };
          res = checkAllowedFields(res, "out");
          response.end(JSON.stringify(res));
        })
        .catch((err) => {
          console.error('Error during get item:' + JSON.stringify(err));
          response.statusCode = 500;
          response.end();
        });
      }
    
    // no other GET requests allowed
    } else {
      response.statusCode = 404;
      response.end();
    }

  // handle POST requests -- these pay attention to the body of the request
  } else if (method == 'POST') {
    console.log('post: ' + JSON.stringify(reqpath));
    let postType = null;
    if (reqpath.dir == '/item' && reqpath.base == 'post') {
      postType = 'item';
    } else if (reqpath.dir == '/item' && reqpath.base == 'tag') {
      postType = 'tag';
    } else if (reqpath.dir == '/like') { 
      postType = 'like';
    }
    Promise.all([getPosts(discussion), bodyOf(request)])
    .then(([posts, body]) => {
      console.log('request body: ' + JSON.stringify(body));
      let malformed = !body || !('instance' in body);
      malformed = malformed || ((postType == 'item') && !(('text' in body) && ('author' in body)));
      malformed = malformed || ((postType == 'tag') && !(('text' in body) && ('author' in body)));
      malformed = malformed || ((postType == 'like') && !('handle' in body));
      if (malformed) {
        console.log("empty or malformed post, ignored")
        response.statusCode = 400;
        response.end();
      } else if (postType == 'item') {                              // POST ITEM
        console.log('post item');
        body.created = Date.now();
        body = checkAllowedFields(body, false);
        posts.insert(body);
        response.end(JSON.stringify({ status: 'success', id: body.$loki }))
      } else if (postType == 'tag') {                               // POST NEW TAG
        console.log('post tag');
        body.created = Date.now();
        body.special = 'tag';
        if (('modtoken' in body) && (body.modtoken == '92HA7')) {
          delete body.modtoken;
          body = checkAllowedFields(body, false);
          posts.insert(body);
          delete tags[discussion];
          console.log('inserted tag: ' + JSON.stringify(body));
          response.end(JSON.stringify({ status: 'success', id: body.$loki }));
        } else {
          console.log('bad moderator token');
          response.status = 403;
          response.end();
        }
      } else if (postType == 'like') {                              // POST LIKE
        console.log('post like');
        let likedPost = posts.get(reqpath.base);
        if (!likedPost) {
          response.statusCode = 404;
          response.end();
        } else {
          var l = likedPost.likes || {};
          var hi = body.handle + '@' + body.instance;
          l[hi] = Date.now();
          likedPost.likes = l;
          posts.update(likedPost);
          response.end();
        }
      } else {                                                      // no other POSTs allowed
        console.log("unexpected POST type")
        response.statusCode = 403;
        response.end();
      }
    })
    .catch((err) => {
      console.error('Error while posting:' + JSON.stringify(err));
      response.statusCode = 500;
      response.end();
    });

  // no requests besides GET and POST allowed
  } else {
    console.log("unexpected method: " + method)
    response.statusCode = 405;
    response.end();
  }
}

init();
