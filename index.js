const {api_key, user, listening_limit, retrys} = require("./config.json")
const five = require("johnny-five");
tagsCount = {}

async function getTopTags() {
    const recentsResponse = await fetch('http://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks' +
    '&user=' + encodeURIComponent(user) +
    '&limit=' + listening_limit +
    '&api_key=' + api_key +
    '&nowplaying=%22true%22&format=json');
    const recentsJson = await recentsResponse.json(); //extract JSON from the http response
    // do something with myJson
    await Promise.all(recentsJson.recenttracks.track.map(async (track) => {
        await fetchTagFromTrack(track);
    }));
}

async function fetchTagFromTrack(track){
    let retrycount = retrys;
    let tagsResponse;
    while(retrycount){
        try {
            tagsResponse = await fetch('http://ws.audioscrobbler.com/2.0/?method=track.gettoptags' +
            '&artist=' + encodeURIComponent(track.artist["#text"]) +
            '&track=' + encodeURIComponent(track.name) +
            '&api_key=' + api_key +
            '&autocorrect=1&format=json');
            break;
        } catch (error) {
            retrycount--;
        }
    }
    const tagsJson = await tagsResponse.json();
    tagsJson.toptags.tag.forEach(tag => {
        tag.name = cleanupTagName(tag.name);
        if (!filterTagName(tag.name)) {
            // recordFilteredTag(tagname);
            return;
        }
        // tagname = combineTagName(tagname, tagcounts);        
        if (!tagsCount[tag.name]) {
            tagsCount[tag.name] = 0;
        }
        tagsCount[tag.name] += parseInt(tag.count);
        // console.log(tagsCount);
    });
    // console.log(tagsCount);
}


function filterTagName(name) {
    if (nondescriptivetags.indexOf(name) >= 0)
        return false;
    if (!filterTagNameCountries(name))
        return false;
    if (!filterTagNameDecades(name))
        return false;
    return true;
}

function filterTagNameCountries(name) {
    if (countrytags.indexOf(name) >= 0)
        return false;
    return true;
}

function filterTagNameDecades(name) {
    var match = name.match(/^(20)?(19)?(\d\d)(s)?$/);
    if (match != null && match.length > 0)
        return false;
    return true;
}

function cleanupTagName(name) {
    return name.toLowerCase().replace(" ", "-");
}

var countrytags = [ 
    "finnish", "finland", "danish", "swedish", "japanese", "japan", "american", "scandinavian", "suomi", "france", "brazilian", "brazil", "irish", "german", "uk", "brasil", "usa", "french", "australian", "italian", "norwegian", "norway", "sweden", "british", "africa", "afrika", "arabic", "asian", "polish", "russian", "canadian", "latin", "deutsch", "spanish", "korean", "english", "dutch", "icelandic", "indian", "belgian"
];

var nondescriptivetags = [
    "seen live", "favourites", "favourite", "favourite songs", "good", "awesome", "love", "loved", "beautiful", "albums i own", "under 2000 listeners", "sexy", "live", "heard on pandora", "love at first listen", "spotify", "want to see live", "myspotigrambot"
];

// (async() => {
//     await getTopTags();
//     // Create items array
//     var tagsCountArray = Object.keys(tagsCount).map((key) => {
//         return [key, tagsCount[key]];
//     });
      
//     // Sort the array based on the second element
//     tagsCountArray.sort((first, second) => {
//         return second[1] - first[1];
//     });
//     console.log(tagsCountArray);
// })();

var board = new five.Board();

board.on("ready", async function() {
    var stepper = new five.Stepper({
        type: five.Stepper.TYPE.FOUR_WIRE,
        stepsPerRev: 2048,
        pins: [ 8, 10, 9, 11]
    });

    stepper.rpm(15).cw().step(2048, function() {
        // console.log("done");
    });
    var servo1 = new five.Servo({
        pin: 3
    });
    var servo2 = new five.Servo({
        pin: 4
    });
    var servo3 = new five.Servo({
        pin: 5
    });

    await getTopTags();
    // Create items array
    var tagsCountArray = Object.keys(tagsCount).map((key) => {
        return [key, tagsCount[key]];
    });
      
    // Sort the array based on the second element
    tagsCountArray.sort((first, second) => {
        return second[1] - first[1];
    });

    console.log(tagsCountArray);
    // console.log((tagsCount["disco"]));
    servo1.to(180-((tagsCount["hip-hop"]/tagsCountArray[0][1])*180));
    servo2.to(180-((tagsCount["indie"]/tagsCountArray[0][1])*180));
    servo3.to(180-((tagsCount["electronic"]/tagsCountArray[0][1])*180));
    // servo1.to(180-((tagsCount["shoegaze"]/tagsCountArray[0])*180));
    // servo2.to(90);
//   stepper.rpm(15).ccw().step(2048, function() {
//     console.log("done");
//   });
});
