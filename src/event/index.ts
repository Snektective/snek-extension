/**
Copyright (C) Snakeroom Contributors 2019

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import { stringify } from "querystring";

fetch("https://www.reddit.com/api/me.json", { credentials: "include" })
	.then(res => res.json())
	.then(me => connect(me.data.modhash));

const connect = (modhash: string) => {
	// Common headers for requests
	const headers = new Headers({
		"Content-Type": "application/x-www-form-urlencoded",
		origin: "https://www.reddit.com",
		"x-modhash": modhash
	});

	const ws = new WebSocket("ws://localhost:9090");
	ws.addEventListener("message", e => {
		const data = JSON.parse(e.data);
		// We only handle `scenes`
		if (data.type !== "scenes") return;

		chrome.storage.local.get("voted", ({ voted }: { voted: string[] }) => {
			voted = voted || [];
			const toVote = data.names.filter(n => !voted.includes(n));
			for (const name of toVote) {
				fetch("https://www.reddit.com/api/sequence_vote.json", {
					method: "POST",
					body: stringify({
						id: name,
						direction: 1,
						raw_json: 1
					}),
					headers,
					credentials: "include"
				}).then(res => {
					if (res.status === 200) console.log("voted on " + name);
				});
			}

			voted.push(...toVote);
			chrome.storage.local.set({ voted });
		});
	});

	ws.addEventListener("close", () => {
		setTimeout(connect.bind(null, modhash), 5000);
	});
};
