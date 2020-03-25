"use strict";
var md = require('markdown-it')(),
    mk = require('markdown-it-katex');
md.use(mk);
var pur = require('dompurify');

var firstRoundText = "Enter your thoughts below. It's fine if you don't address everything; just contribute as much as you can. \
If you're truly stuck, you can make an empty post, and see some of what your peers are saying.<p>"

var nextRoundText = "Please read and consider these thoughts from your peers, then enter your thoughts below. If you like, feel free to load more of your peers' posts. Click &#x1F44D; for any contribution you find helpful or relevant &mdash; even if it\'s incomplete. Try to make each of your posts self-contained, since other readers may not have seen the same set of previous posts that you have.<p>"

var initialText = '<h3><span id="title">loading discussion name...</span></h3>Choose your handle for this discussion: <input id="name" autofocus="true" type="text" placeholder="Required"> <span class="moderator">Moderator</span><br><div><input id="savelogin" type="checkbox" checked> <label for="savelogin">Save my info on this browser?</label>&nbsp;&nbsp; <input id="upmod" type="checkbox"> <label for="upmod">Update my moderator status?</label></div><div class="modkey"><label for="modkey">Moderator key:</label> <input id="modkey" type="password"></div>';

var handle = "Anonymous Wombat";
var instance = null;
var discussion = null;
var moderatorToken = null;

document.addEventListener('DOMContentLoaded', init);

function init () {

  // check for (and remember) discussion ID
  var requrl = new URL(window.location.href);
  var query = new URLSearchParams(requrl.search);
  discussion = query.get('d');
  if (!discussion) {
    return;
  }

  // assign a pseudorandom instance ID for this session, long enough to be unlikely to collide
  instance = randStr(15);

  // check for saved info in local storage
  var savedlogin = null;
  if (localStorage) {
    savedlogin = localStorage.getItem('savedlogin:' + discussion);
    if (savedlogin) {
      try {
        savedlogin = JSON.parse(savedlogin);
      } catch (e) {
        savedlogin = null;
        console.error(e);
      }
    }
    if (savedlogin) {
      instance = ('instance' in savedlogin) && savedlogin.instance;
      moderatorToken = ('modtoken' in savedlogin) && savedlogin.modtoken;
    }
  }

  // load discussion title from server
  fetch("title/" + discussion)
  .then((res) => {
    if (res.ok) {
      return res.json();
    } else {
      message("The ID in this discussion URL appears to be invalid.");
      throw new Error("Fetch of title failed: status " + res.status);
    }
  })
  .then((res) => {
    document.getElementById("title").textContent = res.title;
  })
  .catch((err) => {
    message("Problem fetching discussion info.");
    console.error(err);
  });

  // set up initial page; load saved info; if the user claims to be a moderator, check with server
  document.getElementsByClassName("initial")[0].innerHTML = initialText;
  let modtag = document.getElementsByClassName("moderator")[0];
  var namebox = document.getElementById("name");
  if (savedlogin && ('handle' in savedlogin)) {
    namebox.value = savedlogin.handle;
  }
  if (moderatorToken) {
    modtag.style.display = "inline";
  }
  document.getElementById("startDiscussion").style.display = "inline";

  // add event listeners to buttons and dialog boxes
  var startbut = document.getElementById("startDiscussion");
  startbut.addEventListener("click", firstRound);
  var postbut = document.getElementById("postButton");
  postbut.addEventListener("click", nextRound);
  var loadbut = document.getElementById("loadButton");
  loadbut.addEventListener("click", loadMore);
  var tagbut = document.getElementById("tagButton");
  tagbut.addEventListener("click", nextTag);
  wait(300).then(() => {
    namebox.addEventListener("keyup", (e) => {
      if (e.key == "Enter") {
        firstRound();
      }
    });
  });
  var postArea = document.getElementById("postArea");
  postArea.addEventListener("keyup", (e) => {
    if (e.key == "Enter" && e.ctrlKey) {
      nextRound();
    }
  });
  var upmoddiv = document.getElementsByClassName('modkey')[0];
  var upmodbox = document.getElementById('upmod');
  var modkeyinput = document.getElementById('modkey');
  upmodbox.addEventListener("change", (e) => {
    if (upmodbox.checked) {
      upmoddiv.style.display = "inline";
      modkeyinput.focus()
    } else {
      upmoddiv.style.display = "none";
      modkeyinput.blur();
    }
  });
  var savecheck = document.getElementById("savelogin");
  savecheck.addEventListener("change", (e) => {
    if (savecheck.checked) {
      if (savedlogin) {
        if (!namebox.value && ('handle' in savedlogin)) {
          namebox.value = savedlogin.handle;
        }
        if ('instance' in savedlogin) {
          instance = savedlogin.instance;
        }
        if ('modtoken' in savedlogin) {
          moderatorToken = savedlogin.modtoken;
        }
        localStorage.setItem('savedlogin:' + discussion, JSON.stringify(savedlogin));
      }
      if (moderatorToken) {
        modtag.style.display = "inline";
      }
    } else {
      if (savedlogin && ('handle' in savedlogin) && (namebox.value == savedlogin.handle)) {
        namebox.value = "";
      }
      instance = randStr(15);
      moderatorToken = null;
      modtag.style.display = "none";
      localStorage.removeItem('savedlogin:' + discussion);
    }
  });
}

// generate a random string, 6 bits per character, safe as a URI component
function randStr(length) {
  const chars = "ABCDEFGHIJLKMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.~";
  return Array.from({length: length}, () => chars[Math.floor(Math.random() * 64)]).join('');
}

// Render Markdown or just post-process text; remove dangerous code
function safeRender(str, useMark) {
  if (useMark) {
    str = md.render(str);
  }
  str = pur.sanitize(str, {USE_PROFILES: {html: true, mathMl: true, svg: true}});
  if (!useMark) {
    str = str.replace(/\n\n+/g, ' <br><br> ');
  }
  return '<div>' + str + '</div>';
}

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function message(text) {
  var msgs = document.getElementsByClassName("messages")[0];
  var msg = document.createElement('div');
  msg.classList.add("message");
  msg.textContent = text;
  msgs.appendChild(msg);
  wait(10*1000)
  .then(() => msg.classList.add('leaving'))
  .then(() => wait(800))
  .then(() => msg.parentNode.removeChild(msg));
}

function like(x) {
  var fetchData = { 
    method: "POST", 
    headers: { "Content-Type": "application/json"},
    body: JSON.stringify({ handle: handle, instance: instance })
  };
  fetch("like/" + x.id + "?d=" + discussion, fetchData)
  .catch((err) => {
    console.error(err);
  });
}

function sendPost(text, useMark, tag) {
  var doc = {
    text: text,
    md: useMark,
    discussion: discussion,
    author: handle,
    instance: instance
  }
  var url = "item/post?d=" + discussion;
  if (tag) {
    doc.modtoken = moderatorToken;
    url = "item/tag?d=" + discussion;
  }
  var fetchData = { 
    method: "POST", 
    headers: { "Content-Type": "application/json"},
    body: JSON.stringify(doc)
  };
  return fetch(url, fetchData);
}

function responseBox(res, likebut) {
  var id = Number(res.id);
  var posttime = moment(res.created).fromNow();
  var likestr = '';
  if (likebut) {
    likestr = '\n<div class="postbot"><span class="posttime">' + posttime + '</span><span class="like" id=' + id + '>&#x1F44D;</span></div>';
  }
  return "<div class='response'>" + safeRender(res.text, res.md) + likestr + '</div>';
}

function shuffle() {
  var q = "d=" + discussion + "&h=" + encodeURIComponent(handle) + "&i=" + instance + "&n=3";
  return fetch("item/shuffle?" + q)
  .then((res) => {
    if (res.ok) {
      return res.json();
    } else {
      throw new Error("Server refused to provide a new post")
    }
  })
}

function responses() {
  const emptypost = { id: 0, text: '**_&mdash;[No posts available]&mdash;_**', md: true };
  return shuffle()
  .then((res) => {
    if (res.length > 0) {
      return res.map((x) => responseBox(x, true));
    } else {
      return [responseBox(emptypost, false)];
    }
  })
  .then((res) => '<div class="responselist">' + res.reduce((accum, val) => accum + val.toString(), '') + '</div>')
  .catch((err) => {
    message("Problem loading new posts; please check to make sure the discussion URL is valid.");
    console.error(err);
  });
}

// update display on receiving confirmation of a successful post
function successfulPost (postText, useMark, tag) {

  // mark empty posts
  if (!postText) {
    postText = "[empty post]";
  }

  // different element class depending on whether it's a tag
  var divHtml = "<div class='mypost'>";
  if (tag) {
    divHtml = "<div class='mypost tagpost'>"
  }

  // get insertion point
  var ins = document.getElementById("insertion");

  // move the user's post up to the history
  var r = document.createElement("div");
  r.innerHTML = divHtml + safeRender(postText, useMark) + "</div>";
  ins.parentNode.insertBefore(r, ins);

  // update instructions and enable load button
  document.getElementById("instructions").innerHTML = nextRoundText;
  document.getElementById("loadButton").style.display = "inline";
  document.getElementById("postArea").focus();
}

function loadMore() {
  // insertion point
  var ins = document.getElementById("insertion");

  // insert posts from other users
  var r = document.createElement("div");
  ins.parentNode.insertBefore(r, ins);
  responses()
  .then((res) => {
    r.innerHTML = res || "";
    for (let x of r.getElementsByClassName("like")) {
      x.addEventListener("click", () => like(x));
    }
  })
  .catch((err) => {
    console.error(err);
  });
}

function firstRound() {
  var namebox = document.getElementById("name");
  handle = namebox.value;
  if (handle) {
    namebox.readOnly = true; // disabled?
    namebox.style.backgroundColor = '';
    document.getElementById("postButton").style.display = "inline";
    document.getElementById("startDiscussion").style.display = "none";
    var upmodbox = document.getElementById('upmod');
    upmodbox.readonly = true;
    upmodbox.disabled = true;
    if (upmodbox.checked) {
      var modkey = document.getElementById('modkey');
      moderatorToken = modkey.value;
      // FIXME: check with server that this is a valid token
    }
    let modtag = document.getElementsByClassName("moderator")[0];
    if (moderatorToken) {
      document.getElementById("tagButton").style.display = "inline";
      document.getElementById("loadButton").style.display = "inline";
      modtag.style.display = "inline";
    } else {
      modtag.style.display = "none";
    }
    document.getElementsByClassName("round")[0].style.display = "inline";
    document.getElementById("instructions").innerHTML = firstRoundText;
    document.getElementById("postArea").focus();
    var savecheck = document.getElementById("savelogin");
    savecheck.readonly = true;
    savecheck.disabled = true;
    if (savecheck.checked) {
      if (localStorage) {
        localStorage.setItem('savedlogin:' + discussion, JSON.stringify({
          handle: handle,
          instance: instance,
          modtoken: moderatorToken
        }));
      } else {
        message("Couldn't save info on this browser: local storage not available");
      }
    } 
  } else {
    namebox.style.backgroundColor = '#ffaaaa';
  }
}

function nextRound() {

  // get the user's post text
  var postArea = document.getElementById("postArea");
  var postText = postArea.value.trim();
  var useMark = document.getElementById("usemd").checked;

  // insert user's post
  if (postText) {
    sendPost(postText, useMark, false)
    .then((res) => {
      if (res.ok) {
        successfulPost(postText, useMark, false);
        postArea.value = "";
        loadMore();
      } else {
        message("Failed to save post; please check that the discussion URL is valid.");
      }
    })
    .catch((error) => {
      message('Error saving the post; please try again');
      console.error("Error: " + JSON.stringify(error));
    });
  } else {
    successfulPost("", false, false);
    postArea.value = "";
    loadMore();
  }
}

function nextTag() {

  // get the user's post text
  var postArea = document.getElementById("postArea");
  var postText = postArea.value.trim();
  var useMark = document.getElementById("usemd").checked;

  // insert user's post
  sendPost(postText, useMark, true)
  .then((res) => {
    if (res.ok) {
      successfulPost(postText, useMark, true);
      postArea.value = "";
      loadMore();
    } else {
      message("Failed to save post; please check that the discussion URL is valid.");
    }
  })
  .catch((error) => {
    message('Error saving the post; please try again');
    console.error("Error: " + JSON.stringify(error));
  });
}

