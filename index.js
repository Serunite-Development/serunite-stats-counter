const axios = require('axios');
const fs = require("fs");

const inputGames = require("./input_games.json")

// we need to also use .get on each takes owner, and repo


const promises = [];
let gameStats = {};
for (let gameName in inputGames) {
    const assetId = inputGames[gameName]

    console.log(`Retrieving info for ${gameName} with ID of: ${assetId}`)

    const promise = axios.get(`https://www.roblox.com/places/api-get-details?assetId=${assetId}`).then((response) => {
        const data = response.data

        const likes = data["TotalUpVotes"]
        const dislikes = data["TotalDownVotes"]

        const likeRatio = Math.round((likes/(likes+dislikes)) * 100)
 
        gameStats[gameName] = {"CCU": data["OnlineCount"], "Visits": data["VisitedCount"], "Ratio": likeRatio}
    }).catch((error) => {
      console.error(`Error retrieving info for ${gameName}:`, error);
  });;

    promises.push(promise)
}

Promise.all(promises).then(() => {
  console.log(gameStats);

  const jsonString = JSON.stringify(gameStats, null, 2); // Pretty print with 2-space indentation

  // Write the JSON string to a file
  fs.writeFile('gameStats.json', jsonString, (err) => {
      if (err) {
          console.error('Error writing to file', err);
      } else {
          console.log('Successfully wrote gameStats to gameStats.json');
      }
  });
}).catch((error) => {
  console.error('Error in Promise.all:', error);
});

// axios.get("https://api.github.com/users/noahrepublic/repos").then((response) => {
//     const repos = response.data;
 
//     repos.forEach((repo) => {
//         function request(response) {
//             const length = response.data.length;
//             console.log(response.data)
//             console.log(response.data[length - 1])

//             if (typeof response.data[length - 1].linesOfCode === 'number') {
//                 linesWrote += parseInt(response.data[length - 1].linesOfCode);
//             }

//             if (typeof linesWrote === 'number') {
//                 fs.writeFile("linesWrote.txt", linesWrote.toString(), (err) => {
//                     if (err) {
//                         console.log(err);
//                     }
//                 });
//             }

//             console.log(linesWrote)
//         }

//         function onFail() {
//             console.log("Failed to get " + repo.full_name)

//             promises.push(promiseSleep(60*1000).then(() => {
//                 console.log("Retrying " + repo.full_name)
//                 const retryPromise = axios.get(`https://api.codetabs.com/v1/loc?github=${repo.full_name}`).then(request).catch(onFail);

//                 promises.push(retryPromise);
//             }))
//         }

//         console.log("Requesting" + repo.full_name)
//         const promise =  axios.get(`https://api.codetabs.com/v1/loc?github=${repo.full_name}`).then(request).catch(onFail);

//         promises.push(promise);
//         sleep(10 * 1000)
//     });
// });
