"use strict";
var md = require('markdown-it')(),
    mk = require('markdown-it-katex');
md.use(mk);
var pur = require('dompurify');

var initialText = '<h3><span id="title">loading discussion name...</span></h3>Choose your handle for this discussion: <input id="name" autofocus="true" type="text" placeholder="Required"> <span class="moderator">Moderator</span><br><div><input id="savelogin" type="checkbox" checked> <label for="savelogin">Save my info on this browser?</label>&nbsp;&nbsp; <input id="upmod" type="checkbox"> <label for="upmod">Update my moderator status?</label></div><div class="modkey"><label for="modkey">Moderator key:</label> <input id="modkey" type="password"></div>';

var firstRoundText = "Enter your thoughts below. It's fine if you don't address everything; just contribute as much as you can. \
If you're truly stuck, you can make an empty post, and see some of what your peers are saying.<p>"

var nextRoundText = "Please read and consider these thoughts from your peers, then enter your thoughts below. If you like, feel free to load more of your peers' posts. Click &#x1F44D; for any contribution you find helpful or relevant &mdash; even if it\'s incomplete. Try to make each of your posts self-contained, since other readers may not have seen the same set of previous posts that you have. For this purpose, it may help to click <i>show raw</i>, to make it easier to preserve formatting if you copy and remix from earlier posts.<p>"

var handle = "Anonymous Wombat";
var instance = null;
var discussion = null;
var moderatorToken = null;
var allChecks = [];

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
    document.getElementById("floater").textContent = res.title;
    document.getElementById("floater").style.backgroundColor = res.bgcolor;
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
  modkeyinput.addEventListener("keyup", (e) => {
    if (e.key == "Enter") {
      firstRound();
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
  return str;
}

// No rendering, just escape everything so that the string appears literally
function asText(str) {
  let d = document.createElement('div');
  d.innerText = str;
  return d.innerHTML;
}

// wrap setTimeout in a promise
function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// put up a diagnostic message
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

// POST to the server that we like a given post
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

// Make a post by sending a POST request.
// Optionally mark the post as Markdown-formatted or as a topic tag.
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

// construct the HTML for a box that shows someone's post (along with stuff like date, a like button, etc.)
function responseBox(res, likebut) {
  let out = '<div class="cooked">' + safeRender(res.text, res.md) + '</div>';
  out = out + '<div class="raw">' + asText(res.text) + '</div>';
  let posttime = moment(res.created).fromNow();
  out = out + '<div class="postbot"><span class="posttime" data-created="' + res.created + '">' + posttime + '</span>';
  out = out + '<span class="showraw"><label><input type="checkbox"> show raw</label></span>';
  if (likebut) {
    out = out + '<span class="like" id="' + res.id + '">&#x1F44D;</span>';
  } else {
    out = out + '<span class="like">&nbsp;</span>';
  }
  out = out + '</div><div class="check">&#x2713;</div>';
  let d = document.createElement('div');
  d.classList.add("response");
  d.innerHTML = out;
  if (likebut) {
    let lik = d.getElementsByClassName("like")[0];
    lik.addEventListener("click", () => like(lik));
  }
  let raw = d.getElementsByClassName('raw')[0];
  let cooked = d.getElementsByClassName('cooked')[0];
  let rc = d.getElementsByTagName("input")[0];
  rc.addEventListener("change", () => {
    if (rc.checked) {
      raw.style.display = "inline";
      cooked.style.display = "none";
    } else {
      cooked.style.display = "inline";
      raw.style.display = "none";
    }
  });
  let chk = d.getElementsByClassName("check")[0];
  allChecks.push(chk);
  d.addEventListener('dblclick', (evt) => {
    if (chk.classList.contains('endorsed')) {
      chk.classList.remove('endorsed');
    } else {
      for (let c of allChecks) {
        c.classList.remove('endorsed');
      }
      chk.classList.add('endorsed');
    }
    // evt.preventDefault();
    // evt.stopImmediatePropagation();
  });
  return d;
}

// fetch a random set of up to 3 posts
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

// construct a row of the feed
function responses() {
  const emptypost = { id: 0, text: '_No posts available, please load more in a bit..._', md: true };
  return shuffle()
  .then((res) => {
    if (res.length > 0) {
      return res.map((x) => responseBox(x, true));
    } else {
      return [responseBox(emptypost, false)];
    }
  })
  .then((res) => {
    let d = document.createElement('div');
    d.classList.add('responselist');
    for (let x of res) {
      d.appendChild(x);
    }
    return d;
  })
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

  // // different element class depending on whether it's a tag
  // var divHtml = "<div class='mypost'>";
  // if (tag) {
  //   divHtml = "<div class='mypost tagpost'>"
  // }
  // var r = document.createElement("div");
  // r.innerHTML = divHtml + safeRender(postText, useMark) + "</div>";

  // get insertion point
  var ins = document.getElementById("insertion");

  // move the user's post up to the history
  var doc = {
    text: postText,
    md: useMark,
    created: Date.now(),
    id: randStr(10)
  };
  var r = responseBox(doc, false);
  r.classList.add('mypost');
  r.classList.remove('response'); // FIXME: should we just not add 'response', and depend on responses() to do that?
  if (tag) {
    r.classList.add('tagpost');
  }
  ins.parentNode.insertBefore(r, ins);

  // update instructions and enable load button
  document.getElementById("instructions").innerHTML = nextRoundText;
  document.getElementById("loadButton").style.display = "inline";
  document.getElementById("postArea").focus();
}

// repeat a function at gradually increasing intervals, maxing at once/hour
function repeater(interval, scale, max, fn) {
  let nextinterval = Math.min(interval * scale, max);
  wait(interval).then(() => {
    fn();
    repeater(nextinterval, scale, max, fn);
  });
}

// callback for "Load more" button
function loadMore() {
  // insertion point
  var ins = document.getElementById("insertion");

  // insert posts from other users
  responses()
  .then((resp) => {
    ins.parentNode.insertBefore(resp, ins);
    let posttimes = resp.getElementsByClassName("posttime");
    repeater(5000, 1.1, 60*60*1000, () => {
      for (let x of posttimes) {
        x.innerHTML = moment(Number(x.dataset.created)).fromNow();
      }
    });
  })
  .catch((err) => {
    console.error(err);
  });
}

// start the first round (can't see others' posts yet, allow user to make post)
function firstRound() {
  let namebox = document.getElementById("name");
  let savecheck = document.getElementById("savelogin");
  let modtag = document.getElementsByClassName("moderator")[0];
  handle = namebox.value;
  if (handle) {
    namebox.readOnly = true;
    namebox.style.backgroundColor = '';
    document.getElementById("postButton").style.display = "inline";
    document.getElementById("startDiscussion").style.display = "none";
    var upmodbox = document.getElementById('upmod');
    upmodbox.readonly = true;
    upmodbox.disabled = true;
    if (upmodbox.checked) {
      var modkey = document.getElementById('modkey');
      moderatorToken = modkey.value;
    }
    if (moderatorToken) {
      let fetchData = { 
        method: "POST", 
        headers: { "Content-Type": "application/json"},
        body: JSON.stringify({ modtoken: moderatorToken, instance: instance })
      };
      fetch("mod?d=" + discussion, fetchData)
      .then((resp) => {
        if (resp.ok) {
          document.getElementById("tagButton").style.display = "inline";
          document.getElementById("loadButton").style.display = "inline";
          modtag.style.display = "inline";  
        } else {
          modtag.style.display = "none";
          moderatorToken = null;
          message("Invalid moderator token");
        }
      })
      .catch((err) => {
        console.error(err);
        modtag.style.display = "none";
        moderatorToken = null;
        message("Error while validating moderator token");
      });
    } else {
      modtag.style.display = "none";
    }
    document.getElementsByClassName("round")[0].style.display = "inline";
    document.getElementById("instructions").innerHTML = firstRoundText;
    document.getElementById("postArea").focus();
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

// start any round except the first (update the feed and wait for another post fro the user)
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

// make a tag post (just like nextRound except no requirement for nonempty text, have to check moderator key)
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
      message("Failed to save tag; please check that your moderator key is valid for this discussion.");
    }
  })
  .catch((error) => {
    message('Error saving the new tag; please try again');
    console.error("Error: " + JSON.stringify(error));
  });
}

