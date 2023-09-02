/*	Main Process */
"use strict";
const OSMAPI = "https://api.openstreetmap.org/api/0.6/changesets";

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

		// イベント登録
		let dom = document.getElementById("basemenu");
		if (!basic.isSmartPhone()) {
			dom.addEventListener("mouseover", function () { map.scrollWheelZoom.disable(); map.dragging.disable(); }, false);
			dom.addEventListener("mouseleave", function () { map.scrollWheelZoom.enable(); map.dragging.enable(); }, false);
			view_btn.addEventListener("click", (e) => { this.viewChangeset() });
		} else {
			dom.addEventListener("touchmove", (e) => { map.scrollWheelZoom.disable(); map.dragging.disable() });
			dom.addEventListener("touchend", (e) => { map.scrollWheelZoom.enable(); map.dragging.enable() });
			view_btn.addEventListener("touchstart", (e) => { this.viewChangeset() });
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

	// チェンジセットを取得して表示する
	viewChangeset() {
		if (!this.busy) {
			this.busy = true;
			view_btn.setAttribute("disabled", true);
			StatusView.innerHTML = "now working..";
			cchange.readChangeset().then(changesets => {
				cmapper.makeMappers(changesets);
				cmarker.writeMarkers(changesets);
				cmapper.writeMappers();
				map.scrollWheelZoom.enable(); map.dragging.enable();
				view_btn.removeAttribute("disabled");
				StatusView.innerHTML = "";
				this.busy = false;
			});
		}
	}

	// 指定したmappersリストをフィルタ表示
	filterMM(fmappers) {
		console.log("filterMM");
		cmarker.clearMarker();
		cmapper.clearComment();
		if (fmappers[0] !== undefined) {
			document.getElementById("comments").innerHTML = "";
			cmarker.writeMarkers(cchange.changesets); 
			let already = [];
			fmappers.forEach(mapper => {
				if (mapper !== undefined) {
					if (already.indexOf(mapper.name) == -1 && cmapper.getMapperbyName(mapper.name) != undefined) {
						cmapper.writeComments(mapper.name);
						already.push(mapper.name);
					}
				}
			});
		}
	};

	// クリックしたマッパーを表示/非表示
	toggleMapper(rank) {
		console.log("toggleMapper");
		let line = document.getElementById(`mapper_${rank}`);
		line.classList.toggle("selected");
		let mapper = cmapper.getMapperByRank(rank);
		mapper.view = !(mapper.view);										// 表示・非表示を切り替え
		this.filterMM(cmapper.getMappersByView(true));	// 表示のみでフィルタ
	}

	// All check & clear
	controlCheck(view) {
		console.log("controlCheck");
		cmapper.mappers.forEach(mapper => {
			mapper.view = view;
			let line = document.getElementById(`mapper_${mapper.rank}`);
			line.classList[view ? "add" : "remove"]("selected");
		});
		this.filterMM(view ? cmapper.mappers : [undefined]);
	}
}
const easycs = new EasyChangeset();
