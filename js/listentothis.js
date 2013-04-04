var sp = getSpotifyApi(1);
sp.require("sp://listentothis/js/jquery-1.9.1.min");
var models = sp.require('sp://import/scripts/api/models');
var views = sp.require('sp://import/scripts/api/views');
var player = models.player;

exports.init = init;

var songs = [];

function init() {
  $(document).ready(function() {
    getFrontPage("week");
  });
}

function getFrontPage(timespan) {
	var req = new XMLHttpRequest();

  $("#timespan").text = timespan;
	req.open("GET", "http://www.reddit.com/r/listentothis/top.json?sort=top&t="+timespan, true);

	req.onreadystatechange = function() {
		console.log(req.status);

    if (req.readyState == 4) {
      if (req.status == 200) {
          // Parse the JSON response
          response = JSON.parse(req.responseText);

          // Grab the children which correspond to each post
          children = response.data.children;

          // Map over the array of children grabbing the title of each reddit
          // post
          songs = children.map(parseRedditTitle);

          for (var i = 0; i < songs.length; i++) {
            s = songs[i]
            if(s != null) {
              console.log(s);
              $("#list").append("<div class=\"track\" id=\"" + s.artist + " " + s.title + "\">" + s.artist + " - " + s.title + "</div>");
            }
          }
          $("#list .track").click(function () {findAndPlay($(this).attr("id"))});
      }
    }
  	};

	req.send();
}

function searchTermify(search_term, revert) {
  return search_term.replace("Remix","").replace("Mix", "");
}

function distance(s, t) {
  return Math.abs(s.length - t.length);

  // TODO make levenshtein work
  var cost = 0;
  var len_s = s.length;
  var len_t = t.length;

  if(len_s == 0) return len_t;
  if(len_t == 0) return len_s;
  if(s[len_s - 1] == t[len_t - 1])
    cost = 0;
  else
    cost = 1;
  return Math.min(distance(s.slice(0, len_s - 2), t) + 1,
                  Math.min(distance(s, t.slice(0, len_t - 2)) + 1,
                           distance(s.slice(0, len_s - 2), t.slice(0, len_t - 2)) + cost));
}

function findAndPlay(search_term) {
  console.log(search_term);
  console.log(searchTermify(search_term, false));
  var search = new models.Search(searchTermify(search_term, false));
  search.localResults = models.LOCALSEARCHRESULTS.APPEND;

  search.observe(models.EVENT.CHANGE, function() {
    
    var result = null;
    var lv = null;
    for(var i=0; i < search.tracks.length && lv != 0; i++) {
      s = search.tracks[i];
      console.log(s);
      if(lv == null) {
        lv = Math.max(search_term.length, (searchTermify(s.artist + " " + s.title, false)).length);
      }
      if(result == null) {
        result = search.tracks[0].data.uri;
      } else if(distance(search_term, searchTermify(s.artist + " " + s.title, false)) < lv) {
        result = search.tracks[0].data.uri;
        lv = distance(search_term, searchTermify(s.artist + " " + s.title, false));
      } else if(distance(search_term, searchTermify(s.title + " " + s.artist, true)) < lv) {
        result = search.tracks[0].data.uri;
        lv = distance(search_term, searchTermify(s.title + " " + s.artist, true));
      }
      console.log(result + " " + lv);
    }
    $("div.playing").removeClass("playing");
    (new views.Player()).play(result);
    $("div[id=\""+search_term+"\"]").addClass("playing");
    
  });
  search.appendNext();
}

function parseRedditTitle(o) {
  data = o.data

  if (data) {
    title = o.data.title;

    // try to grab the title and artist using the default title style shown in
    // the /r/listentothis sidebar
    //
    // Artist - Title [genre] description

    var match = title.match(/^(.*?)\s*-+\s*(.+?)\s*\[+.*$/i);

    if (match) {
      trackTitle  = match[2];
      trackArtist = match[1];
    } else {
      return null;
    }

    song = {
      title:  trackTitle,
      artist: trackArtist,
    }

    return song
  } else {
    return null;
  }
}
