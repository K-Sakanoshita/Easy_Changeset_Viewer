/*	Main Process */
"use strict";
const OSMAPI = "https://api.openstreetmap.org/api/0.6/changesets";
const COLORS = ["gold", "aquamarine", "blueviolet", "brass", "brown", "burlywood", "cadetblue",
	"darkgreen", "darkkhaki", "darkolivegreen", "darkorange", "darksalmon", "darkseagreen", "deeppink",
	"deepskyblue", "dimgray", "dodgerblue", "feldsper", "firebrick", "forestgreen", "greenyellow",
	"hotpink", "indianred", "indigo", "khaki", "lavenderblush", "lightblue", "lightcoral", "lightgrey",
	"lightpink", "lightsalmon", "lightseagreen", "lightskyblue","lightslategray","lightsteelblue"];

// Global Variable
var map;				// leaflet map object
var markers = [];
var Conf = {};			// Config Praams
const LANG = (window.navigator.userLanguage || window.navigator.language || window.navigator.browserLanguage).substr(0, 2) == "ja" ? "ja" : "en";

// initialize leaflet
window.onload = function () {
	console.log("Welcome to Easy Changeset Viewer.");

	var url = "./data/config.json";
	var xhr = new XMLHttpRequest();
	xhr.open('GET', url);
	xhr.send();
	xhr.onreadystatechange = function () {
		if (xhr.readyState === 4 && xhr.status === 200) {
			let arg = JSON.parse(xhr.responseText);
			Object.keys(arg).forEach(key1 => {
				Conf[key1] = {};
				Object.keys(arg[key1]).forEach((key2) => Conf[key1][key2] = arg[key1][key2]);
			});
			easycs.init();
		};
	};
};

class EasyChangeset {
	constructor() {
		this.busy = false;
	}

	init() {
		// set map layer
		let def = Conf.default;
		let osm_std = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxNativeZoom: 19, maxZoom: 21, attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors' });
		map = L.map('mapid', { center: def.DefaultCenter, zoom: def.DefaultZoom, zoomSnap: def.ZoomSnap, zoomDelta: def.ZoomSnap, maxZoom: def.MaxZoomLevel, layers: [osm_std] });
		new L.Hash(map);

		// set date time
		let dttimes = document.querySelectorAll('.js-full-picker');
		dttimes.forEach(dttime => { new Picker(dttime, { controls: true, format: 'YYYY/MM/DD HH:mm', headers: true }) });
		let now_datetime = new Date();
		let old_datetime = new Date();
		old_datetime = new Date(old_datetime.setDate(old_datetime.getDate() - 2));
		start_datetime.value = basic.formatDate(old_datetime, "YYYY/MM/DD hh:mm");
		end_datetime.value = basic.formatDate(now_datetime, "YYYY/MM/DD hh:mm");

		// timezone
		for (let i = -12; i < 14; i++) {
			let num = ("0" + Math.abs(i) + ":00").slice(-5);
			num = (i < 0 ? "-" : "+") + num;
			WinCont.select_add("timezones", num, i);
		};
		timezones.value = "9";

		// mapper list
		let mappers = L.control({ position: "bottomright" });			// Add BaseMenu
		mappers.onAdd = function () {
			this.ele = L.DomUtil.create('div', "info");
			this.ele.id = "mappers";
			return this.ele;
		};
		mappers.addTo(map);

	}

	rw_changeset() {
		if (easycs.busy == true) {
			alert("now busy... please wait.");
		} else {
			mappers.addEventListener("mouseover",
				function () {
					map.scrollWheelZoom.disable(); map.dragging.disable();
				});

			mappers.addEventListener("mouseleave",
				function () {
					map.scrollWheelZoom.enable(); map.dragging.enable();
				});


			easycs.busy = true;
			easycs.read_changeset().then(changesets => {
				easycs.write_changeset(changesets);
				easycs.busy = false;
			});
		}
	}

	read_changeset() {
		return new Promise((resolve, reject) => {
			document.getElementById("mappers").innerHTML = "";
			markers.forEach(m => m.remove());
			markers = [];
			xhr_get([], "", resolve, reject);
		});

		function xhr_get(changesets, edtime, resolve, reject) {
			let nw = map.getBounds().getNorthWest();
			let se = map.getBounds().getSouthEast()
			let bbox = "bbox=" + nw.lng + "," + se.lat + "," + se.lng + "," + nw.lat;
			let times = edtime == "" ? easycs.calc_changeset("") : easycs.calc_changeset(edtime);
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
							edtime = easycs.calc_changeset(newchanges[newchanges.length - 1].attributes.created_at.nodeValue)[1];
							xhr_get(changesets, edtime, resolve, reject);
						} else {
							resolve(changesets);
						}
					} else if (xhr.status >= 400) {
						reject(changesets);
					};
				}
			}
		}
	}

	calc_changeset(edtime0) {
		let sttime1 = new Date(start_datetime.value);
		let sttime2 = new Date(sttime1.setHours(sttime1.getHours() - parseInt(timezones.value)));
		let sttime3 = basic.formatDate(sttime2, "YYYY-MM-DDThh:mm:00Z");

		let edtime1 = edtime0 == "" ? new Date(end_datetime.value) : new Date(edtime0);
		let edtime2 = new Date(edtime1.setHours(edtime1.getHours() - parseInt(timezones.value)));
		let edtime3 = basic.formatDate(edtime2, "YYYY-MM-DDThh:mm:00Z");
		return [sttime3, edtime3];
	}

	write_changeset(changesets) {
		var mappers = {}, mapperno = 0;
		if (changesets[0] == undefined) return;
		changesets.forEach((element, idx) => {
			let opacity = parseFloat((element.getAttribute("changes_count")) / 100) + 0.2;
			opacity = opacity > 1.0 ? 1.0 : opacity;
			let minlat = element.getAttribute("min_lat");
			let minlon = element.getAttribute("min_lon");
			let maxlat = element.getAttribute("max_lat");
			let maxlon = element.getAttribute("max_lon");
			let lat = (parseFloat(minlat) + parseFloat(maxlat)) / 2;
			let lon = (parseFloat(minlon) + parseFloat(maxlon)) / 2;
			let dttime = new Date(element.getAttribute("closed_at"));
			let username = element.getAttribute("user");
			let changeset = element.getAttribute("id");
			let counts = parseInt(element.getAttribute("changes_count"));
			if (username in mappers) {
				mappers[username].counts += counts;
			} else {
				mappers[username] = { "counts": counts, "no": mapperno++ };
			}
			let contents = `User Name: <a href="https://osm.org/user/${username}">${username}</a><br>`;
			contents += basic.formatDate(dttime, "DateTime: YYYY/MM/DD hh:mm:ss<br>");
			contents += `ChangeSet: <a href="https://osm.org/changeset/${changeset}">${changeset}</a><br>`;
			contents += "Changes Count: " + counts;
			let color = COLORS[mappers[username].no % COLORS.length];
			let marker = L.circleMarker([lat, lon], {
				"color": color,
				"weight": 3,
				"opacity": 0.6,
				"fillColor": color,
				"fillOpacity": opacity
			}).bindPopup(contents).addTo(map);
			marker.EasyChangeset_idx = idx;
			markers.push(marker);
		});

		let mappers_ary = Object.keys(mappers).map((k) => ({ username: k, counts: mappers[k].counts }));
		mappers_ary.sort((a, b) => {
			if (a.counts > b.counts) {
				return -1;
			} else {
				return 1;
			}
		});
		let mapperlist = document.getElementById("mappers");
		mappers_ary.forEach((element) => {
			mapperlist.innerHTML += element.counts + " : " + element.username + "<br>";
		});
	}
}
const easycs = new EasyChangeset();

function popup_icon(ev) {	// PopUpを表示
	let idx = ev.target.EasyChangeset_idx;
	L.responsivePopup({ "keepInView": true }).setContent(popcont).setLatLng(ev.latlng).openOn(map);
	ev.target.openPopup();
	return false;
};
