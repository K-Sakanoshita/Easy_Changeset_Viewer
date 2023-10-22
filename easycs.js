/*	Main Process */
"use strict";

// Global Variable
var map;				// leaflet map object
var Conf = {};			// Config Praams
var pickers = [];
var basic = new Basic();
const LANG = (window.navigator.userLanguage || window.navigator.language || window.navigator.browserLanguage).substr(0, 2) == "ja" ? "ja" : "en";
const params = new URLSearchParams(window.location.search);

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
		let def = Conf.default;
		let maps = [], layer = {};
		Object.keys(Conf.tile).forEach(key => {
			let params = { "attribution": Conf.tile[key].copyright, maxZoom: def.MaxZoom, "maxNativeZoom": Conf.tile[key].maxNativeZoom };
			if (Conf.tile[key].filter !== void 0) {             // color filter
				params.filter = Conf.tile[key].filter;
				layer[Conf.tile[key].name] = L.tileLayer.colorFilter(Conf.tile[key].url, params);
			} else {                                            // normal tile
				layer[Conf.tile[key].name] = L.tileLayer(Conf.tile[key].url, params);
			}
			maps.push(layer[Conf.tile[key].name]);
		});
		map = L.map('mapid', { zoomControl: false, center: def.DefaultCenter, "zoom": def.Zoom, "minZoom": def.MinZoom });
		L.control.layers(layer).addTo(map);
		maps[0].addTo(map);
		new L.Hash(map);

		// set datetime window
		let control = L.control({ position: "topleft" });			// Add BaseMenu
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

		if (params.get("sttime") !== null && params.get("edtime") !== null) {
			start_datetime.value = basic.formatDate(new Date(parseInt(params.get("sttime")) * 1000), "YYYY/MM/DD hh:mm");
			end_datetime.value = basic.formatDate(new Date(parseInt(params.get("edtime")) * 1000), "YYYY/MM/DD hh:mm");
			timezones.value = params.get("timezn");
		} else {
			let nd = new Date();
			let od = new Date(new Date().setDate(new Date().getDate() - 2));
			start_datetime.value = basic.formatDate(od, "YYYY/MM/DD hh:mm");
			end_datetime.value = basic.formatDate(nd, "YYYY/MM/DD hh:mm");
		}
		let hidden = {
			controls: true, format: 'YYYY/MM/DD HH:mm', headers: true,
			hide: (ev) => { document.getElementById(ev.target.id).value = pickers[ev.target.id].getDate(true) }
		};
		pickers["start_datetime"] = new Picker(start_datetime, hidden);
		pickers["end_datetime"] = new Picker(end_datetime, hidden);

		// timezone
		for (let i = -12; i < 14; i++) {
			let num = ("0" + Math.abs(i) + ":00").slice(-5);
			num = (i < 0 ? "-" : "+") + num;
			winCont.select_add("timezones", num, i);
		};
		let timezn = params.get("timezn");
		timezones.value = timezn == "" || timezn == null ? "9" : params.get("timezn");

		// parameter clear(一度開いてブックマークを取るとやっかいなので)
		let url = location.pathname + location.hash;
		history.replaceState(null, null, url)
	}

	// チェンジセットを取得して表示する
	viewChangeset() {
		if (!this.busy) {
			this.busy = true;
			view_btn.setAttribute("disabled", true);
			StatusView.innerHTML = "now working..";
			let ll = map.getCenter();
			map.setView({ lat: ll.lat, lng: calcLng(ll.lng) });
			cmapper.clearMapper();
			cmarker.clearMarker();
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

		function calcLng(lng) {
			if (lng >= 180) return (lng % 360) - 360;
			if (lng < -180) return (lng % 360) + 360;
			return lng;
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

	// write Status in comments
	writeComment(message) {
		comments.innerHTML += message + "<br>";
		comments.scrollTo(0, comments.scrollHeight - comments.clientHeight);
	}
}
const easycs = new EasyChangeset();
