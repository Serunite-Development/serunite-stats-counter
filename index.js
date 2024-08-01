const axios = require('axios');
const fs = require('fs');

const inputGames = require('./input_games.json');
const { start } = require('repl');

// we need to also use .get on each takes owner, and repo

const currentDate = new Date();
const pastTimestamp = currentDate.getTime() - 7 * 24 * 60 * 60 * 1000;
const lastWeekTimestamp = new Date(pastTimestamp);

console.log(currentDate.toDateString(), lastWeekTimestamp.toDateString());

const promises = [];
let gameStats = {};
let weeklyPlaytime = 0;
let weeklyVisits = 0;
let totalVisits = 0;
let totalFavorites = 0;
let totalCCU = 0;
for (let gameName in inputGames) {
	const assetId = inputGames[gameName];

	console.log(`Retrieving info for ${gameName} with ID of: ${assetId}`);

	const promise = axios
		.get(`https://www.roblox.com/places/api-get-details?assetId=${assetId}`)
		.then((response) => {
			const data = response.data;

			const likes = data['TotalUpVotes'];
			const dislikes = data['TotalDownVotes'];

			const likeRatio = Math.round((likes / (likes + dislikes)) * 100);

			totalVisits += data['VisitedCount'];
			totalFavorites += data['FavoritedCount'];
			totalCCU += data['OnlineCount']

			gameStats[gameName] = {
				CCU: data['OnlineCount'],
				Visits: data['VisitedCount'],
				Ratio: likeRatio,
			};
		})
		.catch((error) => {
			console.error(`Error retrieving info for ${gameName}:`, error);
		});

	const lastWeekTimestampMonth = lastWeekTimestamp.getMonth() + 1;
	const currentWeekMonth = currentDate.getMonth() + 1; // 0 indexing D:

	const startRange = `${lastWeekTimestamp.getFullYear()}-${
		(lastWeekTimestampMonth < 10 ? '0' : '') + lastWeekTimestampMonth
	}-${
		(lastWeekTimestamp.getDate() < 10 ? '0' : '') + lastWeekTimestamp.getDate()
	}`;
	const endRange = `${currentDate.getFullYear()}-${
		(currentWeekMonth < 10 ? '0' : '') + currentWeekMonth
	}-${(currentDate.getDate() < 10 ? '0' : '') + currentDate.getDate()}`;

	promises.push(
		axios
			.get(
				`https://romonitorstats.com/api/v1/charts/get?name=session-length&placeId=${assetId}&timeslice=day&proVersion=false&includeExperienceName=true&start=${startRange}&ends=${endRange}`
			)
			.then((response) => {
				const sessionData = response.data[0].data;

				for (let date in sessionData) {
					const time = sessionData[date];
					weeklyPlaytime += time;
				}
			})
	);

	promises.push(
		axios
			.get(
				`https://romonitorstats.com/api/v1/charts/get?name=visits&placeId=${assetId}&timeslice=day&proVersion=false&includeExperienceName=true&start=${startRange}&ends=${endRange}`
			)
			.then((response) => {
				const sessionData = response.data[0].data;

				for (let date in sessionData) {
					const visits = sessionData[date];
					weeklyVisits += visits;
				}
			})
	);

	promises.push(promise);
}

Promise.all(promises)
	.then(() => {
		console.log(gameStats);
		weeklyVisits = weeklyVisits / 7;
		weeklyPlaytime = weeklyPlaytime / 7;

		let monthlyAverageHours = Math.round(
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
	})
	.catch((error) => {
		console.error('Error in Promise.all:', error);
	});
