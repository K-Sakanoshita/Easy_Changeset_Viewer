"use strict";

class ChangeSet {
	constructor() {
		this.changesets = [];
	}

	readChangeset() {
		return new Promise((resolve, reject) => {
			xhr_get([], "", resolve, reject);
		});

		function xhr_get(changesets, edtime, resolve, reject) {
			let nw = map.getBounds().getNorthWest();
			let se = map.getBounds().getSouthEast()
			let bbox = "bbox=" + nw.lng + "," + se.lat + "," + se.lng + "," + nw.lat;
			let times = edtime == "" ? calcStartEndTime("") : calcStartEndTime(edtime);
			var url = Conf.default.OSMapi + "?" + bbox + "&time=" + times[0] + "," + times[1];
			var xhr = new XMLHttpRequest();
			easycs.writeComment("GET: " + url);
			console.log("GET: " + url);
				xhr.open('GET', url);
				xhr.send();
				xhr.onreadystatechange = function () {
					if (xhr.readyState !== 4) return;
					if (xhr.status >= 200 && xhr.status < 400) {
						var getxml = xhr.responseXML;
						if (getxml !== null) {
						let newchanges = Array.from(getxml.getElementsByTagName("changeset"));
						changesets = changesets.concat(newchanges);
						if (newchanges.length >= 100) {
							edtime = calcStartEndTime(newchanges[newchanges.length - 1].attributes.created_at.nodeValue)[1];
							xhr_get(changesets, edtime, resolve, reject);
						} else {
							cchange.changesets = changesets;
								resolve(changesets);
							}
						} else {
							reject(new Error("Invalid response from OSM API"));
						}
					} else {
						reject(new Error("OSM API error: " + xhr.status));
					}
				}
				xhr.onerror = function () {
					reject(new Error("Network error while accessing OSM API"));
				}
			}

			function calcStartEndTime(edtime0) {		// changesetの取得期間を計算
				let timezoneMinutes = parseTimezone(timezones.value);
				let sttime1 = basic.parseDateTime(start_datetime.value);
				let sttime2 = new Date(sttime1.setMinutes(sttime1.getMinutes() - timezoneMinutes));
				let sttime3 = basic.formatDate(sttime2, "YYYY-MM-DDThh:mm:00Z");

				let edtime1 = edtime0 == "" ? basic.parseDateTime(end_datetime.value) : new Date(edtime0);
				let edtime2 = new Date(edtime1.setMinutes(edtime1.getMinutes() - (edtime0 == "" ? timezoneMinutes : 0)));
				let edtime3 = basic.formatDate(edtime2, "YYYY-MM-DDThh:mm:00Z");
				return [sttime3, edtime3];
			}

			function parseTimezone(value) {
				let match = String(value).match(/^([+-])(\d{2}):(\d{2})$/);
				if (!match) return 0;
				let minutes = Number(match[2]) * 60 + Number(match[3]);
				return match[1] == "-" ? -minutes : minutes;
			}
		}
}
const cchange = new ChangeSet();
