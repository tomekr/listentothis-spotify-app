var sp = getSpotifyApi(1);
sp.require("sp://listentothis/js/jquery-1.9.1.min");
var models = sp.require('sp://import/scripts/api/models');
var views = sp.require('sp://import/scripts/api/views');
var ui = sp.require('sp://import/scripts/ui');
var player = models.player;

exports.init = init;

var songs = [];
var tempPlaylist = new models.Playlist();
var orig_regex;

function init() {
  $(document).ready(function() {
    orig_regex = $("#regex").val();
    getFrontPage();
    $("#timespan").change(function() {getFrontPage();});
    $("#subreddit").change(function() {getFrontPage();});
    $("#regex").change(function() {getFrontPage();});
    $("#regex-reset").click(function() {$("#regex").val(orig_regex);});
  });
}

function clearPlaylist(playlist) {
  while(playlist.data.length > 0) {
    playlist.data.remove(0);
  }
}

function getFrontPage() {
  clearPlaylist(tempPlaylist);
	var req = new XMLHttpRequest();

  timespan = $("#timespan").val();
  subreddit = $("#subreddit").val();
  uri = "http://www.reddit.com/r/"+subreddit+"/top.json?sort=top&t="+timespan
	req.open("GET", uri, true);

	req.onreadystatechange = function() {

    if (req.readyState == 4) {
      if (req.status == 200) {
          // Parse the JSON response
          response = JSON.parse(req.responseText);

          // Grab the children which correspond to each post
          children = response.data.children;

          // Map over the array of children grabbing the title of each reddit
          // post
          songs = children.map(parseRedditTitle);

          if(songs.length > 0) {
            for (var i = 0; i < songs.length; i++) {
              s = songs[i]
              if(s != null) {
                findAndDisplay(makeID(s));
              }
            }
            var plr = new views.Player();
            plr.node.style.width = "128px";
            plr.node.style.height = "128px";
            plr.context = tempPlaylist;
            var list = new views.List(tempPlaylist);
            list.node.classList.add("sp-light");
            $("#grid").empty().append(plr.node).append(list.node);
          } else {
            console.log("..found nothing.");
          }
      }
    }
  	};

	req.send();
}

function makeID(song) {
  return escape("artist:\"" + song.artist + "\" title:\"" + song.title + "\"");
}

function searchTermify(search_term, revert) {
  search_term = unescape(search_term).replace("Remix","").replace("Mix", "");
  return search_term;
}

function distance(s, t) {
  // levenshtein distance from wikipedia
  if (!s.length) return t.length;
  if (!t.length) return s.length;

  return Math.min(
    distance(s.substr(1), t) + 1,
    distance(t.substr(1), s) + 1,
    distance(s.substr(1), t.substr(1)) + (s[0] !== t[0] ? 1 : 0)
  );
}

function findAndDisplay(search_term) {
  var search = new models.Search(searchTermify(search_term, false));
  search.localResults = models.LOCALSEARCHRESULTS.APPEND;

  var test = null;
  search.observe(models.EVENT.CHANGE, function() {
    var result = null;
    var lv = null;
    for(var i=0; i < search.tracks.length && lv != 0; i++) {
      s = search.tracks[i];
      if(lv == null) {
        lv = search_term.length;
      }
      if(result == null) {
        result = s;
        continue;
      }
      /*
      var lv_artist_title = distance(search_term, s.data.artist + " " + s.data.title);
      console.log("lv_artist_title = " + lv_artist_title);
      var lv_title_artist = distance(search_term, s.data.title + " " + s.data.artist);
      console.log("lv_artist_title = " + lv_title_artist);
      if(tmp < lv) {
        result = s;
        lv = distance(search_term, s.artist + " " + s.title);
        continue;
      }
      if(tmp < lv) {
        result = s;
        lv = tmp;
      }
      */
    }
    if(result) {
      console.log("..found for " + unescape(search_term) + ":");
      console.log(result.data.artists[0].name + " - " + result.data.name);
      tempPlaylist.add(result);
    }
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

    console.log($("#regex").val());
    var match = title.match(eval("/" + $("#regex").val() + "/i"));

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
