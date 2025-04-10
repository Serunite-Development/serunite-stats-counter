const axios = require('axios');
const fs = require('fs');

const inputGames = require('./input_games.json');

// we need to also use .get on each takes owner, and repo

const currentDate = new Date();
const pastTimestamp = currentDate.getTime() - 7 * 24 * 60 * 60 * 1000;
const lastWeekTimestamp = new Date(pastTimestamp);

console.log(currentDate.toDateString(), lastWeekTimestamp.toDateString());

const gameStats = {};
let weeklyPlaytime = 0;
let weeklyVisits = 0;
let totalVisits = 0;
let totalFavorites = 0;
let totalCCU = 0;

const main = async() => {
	const universeIds = []
	// We could do this asyncronously with Promise.all, but let's not abuse the roblox APIs any more than we have to
	for (assetId of Object.values(inputGames)) {
		const response = await axios.get(`https://apis.roblox.com/universes/v1/places/${assetId}/universe`);
		universeIds.push(response.data.universeId);
	}
	const gameDataResponse = await axios.get(`https://games.roblox.com/v1/games?universeIds=${universeIds.join(",")}`);

	// Restructure the data keyed by place ID (we don't have access to gameName here)
	const gameInfo = {};
	for (const game of gameDataResponse.data.data) {
		gameInfo[game.rootPlaceId] = {
			universeId: game.id,

			visits: game.visits,
			favourites: game.favoritedCount,
			ccu: game.playing,
		}

		totalVisits += game.visits;
		totalFavorites += game.favoritedCount;
		totalCCU += game.playing;
	}

	for (const gameName in inputGames) {
		const assetId = inputGames[gameName];

		gameStats[gameName] = {
			CCU: gameInfo[assetId].ccu,
			Visits: gameInfo[assetId].visits,
			Ratio: -1,  // Populated below
		};

		// There's no API for this, but we do have an endpoint that gives us HTML
		const votesResponse = await axios.get(`https://www.roblox.com/games/votingservice/${assetId}`)
		const likes = parseInt(/id="vote-up-text" title="(\d+)"/.exec(votesResponse.data)[1]);
		const dislikes = parseInt(/id="vote-down-text" title="(\d+)"/.exec(votesResponse.data)[1]);
		const likeRatio = Math.round((likes / (likes + dislikes)) * 100);
		gameStats[gameName].Ratio = likeRatio;

		// Build ranges for romonitorstats
		const startRange = `${
			lastWeekTimestamp.getFullYear()
		}-${
			(lastWeekTimestamp.getMonth() + 1).toString().padStart(2, "0")
		}-${
			lastWeekTimestamp.getDate().toString().padStart(2, "0")
		}`;
		const endRange = `${currentDate.getFullYear()}-${
			(currentDate.getMonth() + 1).toString().padStart(2, "0")
		}-${
			currentDate.getDate().toString().padStart(2, "0")
		}`;

		// Request historical data from romonitorstats (no official APIs for this)
		const playtimeResponse = await axios.get(
			`https://romonitorstats.com/api/v1/charts/get?name=session-length&placeId=${assetId}&timeslice=day&proVersion=false&includeExperienceName=true&start=${startRange}&ends=${endRange}`
		);
		for (const time of Object.values(playtimeResponse.data[0].data)) {
			weeklyPlaytime += time;
		}

		const visitsResponse = await axios.get(
			`https://romonitorstats.com/api/v1/charts/get?name=visits&placeId=${assetId}&timeslice=day&proVersion=false&includeExperienceName=true&start=${startRange}&ends=${endRange}`
		);
		for (const visits of Object.values(visitsResponse.data[0].data)) {
			weeklyVisits += visits;
		}
	}

	console.log(gameStats);
	weeklyVisits = weeklyVisits / 7;
	weeklyPlaytime = weeklyPlaytime / 7;

	const monthlyAverageHours = Math.round(
		(weeklyPlaytime * weeklyVisits * 30) / 60
	);

	console.log(`Monthly average playtime (HOURS): ${monthlyAverageHours}`);
	console.log(`Total Favorites: ${totalFavorites}`);
	console.log(`Total Visits: ${totalVisits}`);

	const jsonString = JSON.stringify(gameStats, null, 2); // Pretty print with 2-space indentation

	// Write the JSON string to a file
	fs.writeFile('gameStats.json', jsonString, (err) => {
		if (err) {
			console.error('Error writing to file', err);
		} else {
			console.log('Successfully wrote gameStats to gameStats.json');
		}
	});

	fs.writeFile(
		'globalStats.json',
		JSON.stringify(
			{
				TotalVisits: totalVisits,
				TotalCCU: totalCCU,
				TotalFavorites: totalFavorites,
				MonthlyAverageHours: monthlyAverageHours,
			},
			null,
			2
		),
		(err) => {
			if (err) {
				console.error('Error writing to file', err);
			} else {
				console.log('Successfully wrote globalStats to globalStats.json');
			}
		}
	);
}

main().catch((error) => {
	console.error('Error generating data:', error);
});
