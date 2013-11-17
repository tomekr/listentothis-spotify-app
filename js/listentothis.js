var sp = getSpotifyApi(1);
sp.require("sp://listentothis/js/jquery-1.9.1.min");
var models = sp.require('sp://import/scripts/api/models');
var views = sp.require('sp://import/scripts/api/views');
var ui = sp.require('sp://import/scripts/ui');
var player = models.player;

exports.init = init;

const LIMIT = 100;

var songs = new Array(LIMIT);
var num_songs = 0;
var last_song = 0;
var results = new Array(LIMIT);
var reddit = new Array(LIMIT);
var title_to_index = {};
var tempPlaylist = new models.Playlist();
var quality = [0, 0, 0];
var defaults = {
  "regex": "^(\\[.+\\][-\\s]+)*(.+?)\\s*(-{1,2}|by)\\s*(\\\".+?\\\"|.+?)\\s*(\\..*|from.+|[\\[\\(].+)*$",
  "sort": "hot",
  "timespan": "day",
}

function init() {
  $(document).ready(function() {
    var playlist = models.library.starredPlaylist;
    playlist.observe(models.EVENT.ITEMS_ADDED, function() {
      console.log('New starred tracks!');
      track = playlist.tracks[playlist.tracks.length-1];
      title = makeID2(track.artists[0], track.name);
      try {
        r = reddit[title_to_index[title]]
        console.log(r);
        window.open("http://reddit.com"+r.permalink);
      } catch(e) {
      }
    });
    console.log("bla");
    $("#regex").val(defaults["regex"]);
    $("#sort").val(defaults["sort"]);
    $("#timespan").val(defaults["timespan"]);
    $("#config").hide();
    $("#subreddit").change(resetClicked);
    $("#b_config").click(function() {
      $("#config").slideToggle("slow");
    });
    $("#b_reset").click(function() {
      $("#regex").val(defaults["regex"]);
      $("#sort").val(defaults["sort"]);
      $("#timespan").val(defaults["timespan"]);
    });
    $("#b_reload").click(resetClicked);
  });
}

function resetClicked() {
  $("#s_sort").text($("#sort").val());
  $("#s_timespan").text($("#timespan").val());
  getFrontPage();
}

function clearPlaylist(playlist) {
  while(playlist.data.length > 0) {
    playlist.data.remove(0);
  }
}

function resetAll(playlist) {
  quality = [0, 0, 0];
  songs = new Array(LIMIT);
  last_song = 0;
  num_songs = 0;
  reddit = new Array(LIMIT);
  results = new Array(LIMIT);

  clearPlaylist(playlist);
}

function getFrontPage() {
  resetAll(tempPlaylist);
	var req = new XMLHttpRequest();

  sort = $("#sort").val();
  timespan = $("#timespan").val();
  subreddit = $("#subreddit").val().replace("http://www.reddit.com", "");
  $("#subreddit").val(subreddit);
  var uri = "http://www.reddit.com"+subreddit+"/"+sort+".json";
  if(sort == "hot") {
    uri = "http://www.reddit.com"+subreddit+"/"+sort+".json?limit="+LIMIT+"&t="+timespan;
  } else if(sort == "top" || sort == "controversial") {
    uri = "http://www.reddit.com"+subreddit+"/"+sort+".json?limit="+LIMIT+"&t="+timespan;
  }
  $("#reddit").html('Link: <a href="http://www.reddit.com' + subreddit + '" target="_blank">' + subreddit + '</a>');
  console.log(uri);
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
          for (var i = 0; i < children.length; i++) {
            s = parseRedditTitle(i, children[i]);
            songs[i] = s;
            if(s != null) {
              last_song = i;
            }
          }
          for (var i = 0; i < children.length; i++) {
            s = songs[i];
            if(s != null) {
              findAndDisplay(i, makeID(s), function() {
                updatePlaylist(tempPlaylist, results);
              });
            }
          }

          var plr = new views.Player();
          plr.context = tempPlaylist;
          $("#grid").empty().append(plr.node);

          var list = new views.List(tempPlaylist);
          list.node.classList.add("sp-light");
          $("#spotify").empty().append(list.node);
      }
    }
  };

	req.send();
}

function makeID(song) {
  return makeID2(song.artist, song.title);
}

function makeID_r(song) {
  return makeID2(song.title, song.artist);
}

function makeID2(artist, title) {
  return escape(artist + " " + title);
  return escape("artist:\"" + artist + "\" title:\"" + title + "\"");
}

function searchTermify(search_term, revert) {
  search_term = unescape(search_term).replace("Remix","").replace("Mix", "");
  return search_term;
}

function distance(s, t)
{
    // degenerate cases
    if (s == t) return 0;
    if (s.length == 0) return t.length;
    if (t.length == 0) return s.length;
 
    var i;
    var j;

    // create two work vectors of integer distances
    var v0 = new Array(t.length + 1);
    var v1 = new Array(t.length + 1);
 
    // initialize v0 (the previous row of distances)
    // this row is A[0][i]: edit distance for an empty s
    // the distance is just the number of characters to delete from t
    for (i = 0; i < v0.length; i++)
        v0[i] = i;
 
    for (i = 0; i < s.length; i++)
    {
        // calculate v1 (current row distances) from the previous row v0
 
        // first element of v1 is A[i+1][0]
        //   edit distance is delete (i+1) chars from s to match empty t
        v1[0] = i + 1;
 
        // use formula to fill in the rest of the row
        for (j = 0; j < t.length; j++)
        {
            var cost = (s.substr(i) == t.substr(j)) ? 0 : 1;
            v1[j + 1] = Math.min(v1[j] + 1, Math.min(v0[j + 1] + 1, v0[j] + cost));
        }
 
        // copy v1 (current row) to v0 (previous row) for next iteration
        for (j = 0; j < v0.length; j++)
            v0[j] = v1[j];
    }
    return v1[t.length];
}

function updateRatio(q) {
  q = parseFloat(q);
  quality = [quality[0] + q, Math.min(quality[1], q), Math.max(quality[2], q)];
}

function findAndDisplay(index, search_term, callback) {
  var search = new models.Search(searchTermify(search_term, false));
  search.localResults = models.LOCALSEARCHRESULTS.APPEND;

  search.observe(models.EVENT.CHANGE, function() {
    var result = null;
    var lv = null;
    var tmp = null;
    var i = 0;
    var j = 0;
    var before = null;
    for(i=0; i < Math.min(2, search.tracks.length) && lv != 0; i++) {
      s = search.tracks[i];
      tmp = distance(search_term, makeID2(s.data.artists[0].name, s.data.name));
      for(j=0; j < Math.min(2, s.data.artists.length); j++) {
        if(j == 0) continue;
        tmp = Math.min(tmp, distance(search_term, makeID2(s.data.artists[j].name, s.data.name)));
      }

      if(tmp < lv || lv == null) {
        result = s;
        lv = tmp;
      }
    }
    if(result) {
      id2 = makeID2(result.data.artists[0].name, result.data.name);
      console.log(unescape(search_term) + " <"+lv+"> " + id2);
      results[index] = result;
      title_to_index[id2] = index;
      if(lv) {
        updateRatio(1.0 * id2.length / lv);
      }
    } else {
      console.log(unescape(search_term) + " <"+lv+"> nothing");
    }
    console.log(before);
    console.log(result);
    if(before != result)
      callback();
    before = result
  });
  search.appendNext();
}

function updatePlaylist(playlist, items) {
  var item = null;

  clearPlaylist(playlist);
  for(var i=0; i < items.length; i++) {
    item = items[i];
    if(item != null) {
      playlist.add(item);
    }
  }

  ratio_text = "" + playlist.length + '/' + num_songs + ' found, ';
  ratio_text += "tolerance: " + (quality[0] / playlist.length).toFixed(2) + ' ';
  ratio_text += "[" + quality[1].toFixed(2) + ', ';
  ratio_text += "" + quality[2].toFixed(2) + ']';
  $("#s_ratio").text(ratio_text);
}

function parseRedditTitle(i, o) {
  data = o.data

  if (data) {
    var title = o.data.title;
    var url = o.data.url;

    // try to grab the title and artist using the default title style shown in
    // the /r/listentothis sidebar
    //
    // Artist - Title [genre] description

    var match = title.match(eval("/" + $("#regex").val() + "/i"));

    if (match) {
      console.log("Match: " + title);
      match.regex = $("#regex").val();
      match.title = title;
      trackArtist = match[2];
      trackTitle  = match[4];
      num_songs++;
    } else {
      console.log("No match: " + title);
      return null;
    }

    console.log(match);

    song = {
      title:  trackTitle,
      artist: trackArtist,
    }
    reddit[i] = data;

    return song
  } else {
    return null;
  }
}
