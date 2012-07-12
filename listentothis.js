var sp = getSpotifyApi(1);
var models = sp.require('sp://import/scripts/api/models');
var player = models.player;

exports.init = init;

function init() {

	updatePageWithTrackDetails();

	player.observe(models.EVENT.CHANGE, function (e) {

		// Only update the page if the track changed
		if (e.data.curtrack == true) {
			updatePageWithTrackDetails();
		}
	});

	getFrontPage();
}

function updatePageWithTrackDetails() {
	
	var header = document.getElementById("header");

	// This will be null if nothing is playing.
	var playerTrackInfo = player.track;

	if (playerTrackInfo == null) {
		header.innerText = "Nothing playing!";
	} else {
		var track = playerTrackInfo.data;
		header.innerHTML = track.name + " on the album " + track.album.name + " by " + track.album.artist.name + ".";
	}
}

function getFrontPage() {

	var req = new XMLHttpRequest();
  console.log("about to attempt a get!");
	req.open("GET", "http://www.reddit.com/r/listentothis/top.json?sort=top&t=day", true);

	req.onreadystatechange = function() {

		console.log(req.status);

   		if (req.readyState == 4) {
    		if (req.status == 200) {
       			console.log("Fetch complete! Parsing!");

            // Parse the JSON response
            response = JSON.parse(req.responseText);

            children = response.data.children;

            // Map over the array of children grabbing the title of each reddit
            // post
            songs = children.map(parseRedditTitle);

            console.log(songs.filter(function(e){return e}));
     		}
   		}
  	};

	req.send();
}

function parseRedditTitle(o) {
  data = o.data

  if (data) {
    title = o.data.title;
    console.log(title);

    // try to grab the title and artist using the default title style shown in
    // the /r/listentothis sidebar
    //
    // Artist - Title [genre] description

    var match = title.match(/^(.*?)\s*-+\s*(.+?)\s*\[+.*$/i);

    if (match) {
      trackTitle  = match[1];
      trackArtist = match[2];
    } else {
      return "";
    }

    console.log("title: " + trackTitle);
    console.log("artist: " + trackArtist);

    song = {
      title:  trackTitle,
      artist: trackArtist
    }

    return song
  } else {
    return "";
  }
}

// Removes quotes and parenthesis to make it easier for spotify's seach to find
// the right song
function searchTermify(string) {

}
