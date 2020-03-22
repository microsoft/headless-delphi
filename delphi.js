

// FIXME: better reactive design
// FIXME: add recaptcha?
// FIXME: don't insert <CR> when we press ctrl-<CR> in the post box
// FIXME: change button appearance while waiting for response; prevent repeated clicks when appropriate


var md = require('markdown-it')(),
    mk = require('markdown-it-katex');
md.use(mk);
var pur = require('dompurify');

var firstRoundText = "Enter your thoughts below. It's fine if you don't address everything; just contribute as much as you can. \
If you're truly stuck, you can make an empty post, and see some of what your peers are saying.<p>"

var nextRoundText = "Please read and consider these thoughts from your peers, then enter your thoughts below. If you like, feel free to load more of your peers' posts. Click &#x1F44D; for any contribution you find helpful or relevant &mdash; even if it\'s incomplete. Try to make each of your posts self-contained, since other readers may not have seen the same set of previous posts that you have.<p>"

var initialText = '<h3><span id="title">loading discussion name...</span></h3>Choose your handle for this discussion: <input id="name" autofocus="true" type="text" placeholder="Required">';

var handle = "Anonymous Wombat";

var instance = null;
var discussion = null;


document.addEventListener('DOMContentLoaded', init);

function init () {

  // check for (and save) discussion ID
  var requrl = new URL(window.location.href);
  var query = new URLSearchParams(requrl.search);
  discussion = query.get('d');
  if (!discussion) {
    return;
  }

  // assign a pseudorandom instance ID for this session, long enough to be unlikely to collide
  instance = randStr(15);

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
    // console.log("res.json received: " + JSON.stringify(res));
    document.getElementById("title").textContent = res.title;
  })
  .catch((err) => {
    message("Problem fetching discussion info.");
    console.error(err);
  });

  // set up initial page
  document.getElementsByClassName("initial")[0].innerHTML = initialText;
  document.getElementById("startDiscussion").style.display = "inline";

  // add event listeners to buttons and dialog boxes
  var startbut = document.getElementById("startDiscussion");
  startbut.addEventListener("click", firstRound);
  var postbut = document.getElementById("postButton");
  postbut.addEventListener("click", nextRound);
  var loadbut = document.getElementById("loadButton");
  loadbut.addEventListener("click", loadMore);
  var namebox = document.getElementById("name");
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

function sendPost(text, useMark) {
  var doc = {
    text: text,
    md: useMark,
    discussion: discussion,
    author: handle,
    instance: instance
  }
  var fetchData = { 
    method: "POST", 
    headers: { "Content-Type": "application/json"},
    body: JSON.stringify(doc)
  };
  return fetch("item/post?d=" + discussion, fetchData);
}

function responseBox(res) {
  var id = Number(res.id);
  return "<div class='response'>" + safeRender(res.text, res.md) +
    '<span class="but like" id=' + id + '>&#x1F44D;</span></div>';
}

function shuffle() {
  var q = "d=" + discussion + "&h=" + encodeURIComponent(handle) + "&i=" + instance;
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
  let posts = [];
  return Promise.all([
    shuffle().then((res) => { posts.push(responseBox(res)) }),
    shuffle().then((res) => { posts.push(responseBox(res)) }),
    shuffle().then((res) => { posts.push(responseBox(res)) })
  ])
  .then(() => '<div class="responselist">' + posts.reduce((accum, val) => accum + val.toString()) + '</div>')
  .catch((err) => {
    message("Problem loading new posts; please check to make sure the discussion URL is valid.");
    console.error(err);
  });
}

// update display on receiving confirmation of a successful post
function successfulPost (postText, useMark) {

  // mark empty posts
  if (!postText) {
    postText = "[empty post]";
  }

  // get insertion point
  var ins = document.getElementById("insertion");

  // move the user's post up to the history
  var r = document.createElement("div");
  r.innerHTML = "<div class='mypost'>" + safeRender(postText, useMark) + "</div>";
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
    namebox.readOnly = true;
    namebox.style.backgroundColor = '';
    document.getElementById("postButton").style.display = "inline";
    document.getElementById("startDiscussion").style.display = "none";
    document.getElementsByClassName("round")[0].style.display = "inline";
    document.getElementById("instructions").innerHTML = firstRoundText;
    document.getElementById("postArea").focus();
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
    sendPost(postText, useMark)
    .then((res) => {
      if (res.ok) {
        successfulPost(postText, useMark);
        postArea.value = "";
        loadMore();
      } else {
        message("Failed to save post; please check that the discussion URL is valid.");
      }
    })
    .catch((error) => {
      console.error("Error: " + JSON.stringify(error));
      message('Error saving the post; please try again');
    });
  } else {
    successfulPost("");
    postArea.value = "";
    loadMore();
  }
}

