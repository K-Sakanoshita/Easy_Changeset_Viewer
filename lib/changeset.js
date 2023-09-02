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
			var url = OSMAPI + "?" + bbox + "&time=" + times[0] + "," + times[1];
			var xhr = new XMLHttpRequest();
			console.log("GET: " + url);
			xhr.open('GET', url);
			xhr.send();
			xhr.onreadystatechange = function () {
				if (xhr.readyState === 4 && (xhr.status >= 200 && xhr.status < 400)) {
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
					} else if (xhr.status >= 400) {
						reject(changesets);
					};
				}
			}
		}

		function calcStartEndTime(edtime0) {		// changesetの取得期間を計算
			let sttime1 = new Date(start_datetime.innerText);
			let sttime2 = new Date(sttime1.setHours(sttime1.getHours() - parseInt(timezones.value)));
			let sttime3 = basic.formatDate(sttime2, "YYYY-MM-DDThh:mm:00Z");

			let edtime1 = edtime0 == "" ? new Date(end_datetime.innerText) : new Date(edtime0);
			let edtime2 = new Date(edtime1.setHours(edtime1.getHours() - parseInt(timezones.value)));
			let edtime3 = basic.formatDate(edtime2, "YYYY-MM-DDThh:mm:00Z");
			return [sttime3, edtime3];
		}
	}
}
const cchange = new ChangeSet();
