/*	Main Process */
"use strict";
const OSMAPI = "https://api.openstreetmap.org/api/0.6/changesets";
const TEMPLATES = [
	"#46c8e4", "#37a2ca", "#297db0", "#1d5b93", "#123a74", "#081d51",
	"#b3b2f6", "#8e8cf1", "#6865ed", "#4240da", "#2624a5", "#100f6b",
	"#e99ef3", "#dc66ed", "#b83dd6", "#842ab2", "#53198b", "#270b5e",
	"#f4a1b7", "#ee6d8f", "#d53d63", "#a7253e", "#771320", "#48070c",
	"#eaad54", "#cf8839", "#af6529", "#8d431b", "#69260f", "#420f06",
	"#80cd38", "#5baa27", "#3c8919", "#23670e", "#114706", "#052902",
	"#3cd365", "#29ae47", "#198b2e", "#0e681a", "#07480c", "#022904",
];

// Global Variable
var map;				// leaflet map object
var Conf = {};			// Config Praams
var pickers = [];
var basic = new Basic;
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
		this.colors = [];
		for (let x = 0; x <= 5; x++) {
			for (let y = 0; y <= 5; y++) {
				this.colors.push(TEMPLATES[y * 6 + x]);
			}
		}
		this.markers = [];
		this.mappers = [];				// changesetから抽出したマッパーリスト
	}

	init() {
		// set window size
		let height = window.innerHeight;
		document.documentElement.style.setProperty('--vh', height / 100 + 'px');

		// set map layer
		let control;
		let def = Conf.default;
		let osm_std = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxNativeZoom: 19, maxZoom: 21, attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors' });
		map = L.map('mapid', { zoomControl: false, center: def.DefaultCenter, zoom: def.DefaultZoom, zoomSnap: def.ZoomSnap, zoomDelta: def.ZoomSnap, maxZoom: def.MaxZoomLevel, layers: [osm_std] });
		new L.Hash(map);

		// set date time
		control = L.control({ position: "topleft" });			// Add BaseMenu
		control.onAdd = function () {
			this.ele = L.DomUtil.create('div', "info dtpicker");
			this.ele.id = "basemenu";
			return this.ele;
		};
		control.addTo(map);
		basemenu.innerHTML = Conf.basemenu.html;
		disableControl("basemenu");
		if (!basic.isSmartPhone()) {
			view_btn.addEventListener("click", (e) => { easycs.readWriteChangeset() });
		} else {
			view_btn.addEventListener("touchstart", (e) => { easycs.readWriteChangeset() });
			start_datetime.addEventListener("touchstart", (e) => { pickers["start_datetime"].show(); e.preventDefault(); });
			end_datetime.addEventListener("touchstart", (e) => { pickers["end_datetime"].show(); e.preventDefault(); });
		};

		let now_datetime = new Date();
		let old_datetime = new Date();
		old_datetime = new Date(old_datetime.setDate(old_datetime.getDate() - 2));
		start_datetime.innerText = basic.formatDate(old_datetime, "YYYY/MM/DD hh:mm");
		end_datetime.innerText = basic.formatDate(now_datetime, "YYYY/MM/DD hh:mm");
		let sttime = document.getElementById("start_datetime");
		let edtime = document.getElementById("end_datetime");
		let hidden = {
			controls: true, format: 'YYYY/MM/DD HH:mm', headers: true,
			hide: (ev) => { document.getElementById(ev.target.id).innerText = pickers[ev.target.id].getDate(true) }
		};
		pickers["start_datetime"] = new Picker(sttime, hidden);
		pickers["end_datetime"] = new Picker(edtime, hidden);

		// timezone
		for (let i = -12; i < 14; i++) {
			let num = ("0" + Math.abs(i) + ":00").slice(-5);
			num = (i < 0 ? "-" : "+") + num;
			winCont.select_add("timezones", num, i);
		};
		timezones.value = "9";
	}

	readWriteChangeset() {
		if (!this.busy) {
			this.busy = true;
			view_btn.setAttribute("disabled", true);
			StatusView.innerHTML = "now working..";
			this.readChangeset().then(changesets => {
				this.changesets = changesets;
				this.makeMappers(changesets);
				this.writeMaps(changesets);
				this.writeMappers(changesets);
				map.scrollWheelZoom.enable(); map.dragging.enable();
				view_btn.removeAttribute("disabled");
				StatusView.innerHTML = "";
				this.busy = false;
			});
		}
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

	writeMaps(changesets) {
		console.log("writeMaps");
		this.clearMarker();
		changesets.forEach((element, idx) => {
			let polygon = this.#makeMarker(element);
			this.markers.push(polygon);
		});
	}

	// 指定したmappersリストをフィルタ表示
	filterMaps(mappers) {
		console.log("filterMaps");
		this.clearMarker();
		document.getElementById("comments").innerHTML = "";
		this.changesets.forEach((element, idx) => {
			if (mappers.indexOf(element.getAttribute("user")) > -1) {		// userが含まれていたら
				this.markers.push(this.#makeMarker(element));
			};
		});
		let already = [];
		this.mappers.forEach(mapper => {
			if (already.indexOf(mapper.name) == -1 && mappers.indexOf(mapper.name) > -1) {
				this.makeComments(mapper.name);
				already.push(mapper.name);
			}
		});
	};

	clearMarker() {
		this.markers.forEach(m => m.remove());
		this.markers = [];
	}

	#makeMarker(element) {		// 指定したelementからマーカーを作成
		const parser = new DOMParser();
		let minlat = element.getAttribute("min_lat");
		let minlon = element.getAttribute("min_lon");
		let maxlat = element.getAttribute("max_lat");
		let maxlon = element.getAttribute("max_lon");
		let dttime = new Date(element.getAttribute("closed_at"));
		let chgsetid = element.getAttribute("id");
		let username = element.getAttribute("user");
		let mapper = this.mappers.find(u => u.name === username);
		let rank = mapper.rank
		let counts = parseInt(element.getAttribute("changes_count"));
		let tagdom = parser.parseFromString(element.innerHTML, "text/html");
		let tagcom = tagdom.querySelector("tag[k='comment']");
		let comment = tagcom !== null ? tagcom.getAttribute("v") : "";
		let contents = `User Name: <a href="https://osm.org/user/${username}">${username}</a> / <button onclick="easycs.toggleMapper(${rank})">check clear</button><br>`;
		contents += basic.formatDate(dttime, "DateTime: YYYY/MM/DD hh:mm:ss<br>");
		contents += `ChangeSet: <a href="https://osm.org/changeset/${chgsetid}" target="_blank">${chgsetid}</a><br>`;
		contents += "Changes Count: " + counts + "<br>";
		contents += "Comment: " + comment;
		let color = this.colors[rank % this.colors.length];

		let marker;
		if ((minlat - maxlat) == 0 && (minlon - maxlon) == 0) {	// polygonでは表現出来ない時
			let lat = (parseFloat(minlat) + parseFloat(maxlat)) / 2;
			let lon = (parseFloat(minlon) + parseFloat(maxlon)) / 2;
			marker = L.circleMarker([lat, lon], {
				"weight": 3, "color": color, "opacity": 0.6, "fillColor": color, "fillOpacity": 0.6
			}).bindPopup(contents).addTo(map);
		} else {
			let latlngs = [[minlat, minlon], [minlat, maxlon], [maxlat, maxlon], [maxlat, minlon]];
			marker = L.polygon(latlngs, {
				"weight": 3, "color": color, "opacity": 0.9, "fillColor": color, "fillOpacity": 0.6
			}).bindPopup(contents).addTo(map);
		}
		return marker;
	}

	clearMapper() {
		document.getElementById("mappers").innerHTML = "";
		document.getElementById("comments").innerHTML = "";
		this.mappers = [];
	}

	// changesetsからmappersを作成
	makeMappers(changesets) {
		console.log("makeMappers");
		const parser = new DOMParser();
		this.clearMapper();
		if (changesets[0] == undefined) return;
		changesets.forEach((element, idx) => {
			let username = element.getAttribute("user");
			let counts = parseInt(element.getAttribute("changes_count"));
			let chgsetid = element.getAttribute("id");
			let tagdom = parser.parseFromString(element.innerHTML, "text/html");
			let tagcom = tagdom.querySelector("tag[k='comment']");
			let dttime = basic.formatDate(new Date(element.getAttribute("closed_at")), "YYYY/MM/DD hh:mm:ss");
			let comment = tagcom !== null ? [chgsetid, dttime, tagcom.getAttribute("v")] : [];
			let mapper = this.mappers.find(u => u.name === username);
			if (mapper == undefined) {
				this.mappers.push({ "name": username, "counts": counts, "comments": [comment], "rank": 0, "view": true });
			} else {
				mapper.counts += counts;
				mapper.comments.push(comment);
			}
		});
		this.mappers.sort((a, b) => { if (a.counts > b.counts) { return -1 } else { return 1 } });
		let rank = 1;
		this.mappers.forEach(mapper => {
			mapper.rank = rank++
			mapper.color = this.colors[(mapper.rank - 1) % this.colors.length];
		});
	}

	// マッパー一覧作成
	writeMappers() {
		console.log("writeMappers");
		let mapperlist = document.getElementById("mappers");
		mapperlist.insertAdjacentHTML('beforeend', Conf.mapperlist.html);
		this.mappers.forEach(mapper => {
			let color = this.colors[(mapper.rank - 1) % this.colors.length];
			mapperlist.insertAdjacentHTML('beforeend', `<div id="mapper_${mapper.rank}" class="selected" onclick="easycs.toggleMapper(${mapper.rank})"><span>${mapper.counts} : <span style='color:${color}'>&#9632</span> ${mapper.name}</span></div>`);
			this.makeComments(mapper.name);
		});
	}

	// コメント欄作成(既存コメントに追記)
	makeComments(username) {
		let commentlist = document.getElementById("comments");
		let contents = `<div><span><a href="https://osm.org/user/${username}" target="_blank">${username}</a></span><br>`;
		let mapper = this.mappers.find(u => u.name === username);
		mapper.comments.forEach(comment => {
			contents += `<a href="https://www.openstreetmap.org/changeset/${comment[0]}" target="_blank">${comment[1]}</a> : ${comment[2]}<br>`;
		});
		commentlist.insertAdjacentHTML('beforeend', contents + "</div>");
	}

	// クリックしたマッパーを表示/非表示
	toggleMapper(rank) {
		console.log("toggleMapper");
		let line = document.getElementById(`mapper_${rank}`);
		line.classList.toggle("selected");
		let mapper = this.mappers.find(u => u.rank === rank);
		mapper.view = !(mapper.view);
		let names = this.mappers.map(mapper => { if (mapper.view) return mapper.name });
		this.filterMaps(names);
	}

	// All check & clear
	controlCheck(view) {
		console.log("controlCheck");
		this.mappers.forEach(mapper => {
			mapper.view = view;
			let line = document.getElementById(`mapper_${mapper.rank}`);
			line.classList[view ? "add" : "remove"]("selected");
		});
		this.filterMaps(view ? this.mappers.map(mapper => mapper.name) : []);
	}
}
const easycs = new EasyChangeset();

function disableControl(domid) {
	let dom = document.getElementById(domid);
	if (!basic.isSmartPhone()) {
		dom.addEventListener("mouseover", function () { map.scrollWheelZoom.disable(); map.dragging.disable(); }, false);
		dom.addEventListener("mouseleave", function () { map.scrollWheelZoom.enable(); map.dragging.enable(); }, false);
	} else {
		dom.addEventListener("touchmove", (e) => { map.scrollWheelZoom.disable(); map.dragging.disable() });
		dom.addEventListener("touchend", (e) => { map.scrollWheelZoom.enable(); map.dragging.enable() });
	};
}
