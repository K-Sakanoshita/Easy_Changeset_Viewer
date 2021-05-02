/*	Main Process */
"use strict";
const OSMAPI = "https://api.openstreetmap.org/api/0.6/changesets";

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
			EasyChangeset.init();
		};
	};
};

var EasyChangeset = (function () {
	var busy = false;

	return {
		// Initialize
		init: () => {

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

		},

		write_changeset: () => {
			if (busy == true) {
				alert("now busy... please wait.");
			} else {
				busy = true;
				let nw = map.getBounds().getNorthWest();
				let se = map.getBounds().getSouthEast()
				let bbox = "bbox=" + nw.lng + "," + se.lat + "," + se.lng + "," + nw.lat;

				let sttime1 = new Date(start_datetime.value);
				let sttime2 = new Date(sttime1.setHours(sttime1.getHours() - parseInt(timezones.value)));
				let sttime3 = basic.formatDate(sttime2, "YYYY-MM-DDThh:mm:00Z");

				let edtime1 = new Date(end_datetime.value);
				let edtime2 = new Date(edtime1.setHours(edtime1.getHours() - parseInt(timezones.value)));
				let edtime3 = basic.formatDate(edtime2, "YYYY-MM-DDThh:mm:00Z");

				let times = "&time=" + sttime3 + "," + edtime3;
				var url = OSMAPI + "?" + bbox + times;
				var xhr = new XMLHttpRequest();
				console.log("GET: " + url);
				markers.forEach(m => m.remove());
				markers = [];
				xhr.open('GET', url);
				xhr.send();
				xhr.onreadystatechange = function () {
					if (xhr.readyState === 4 && (xhr.status >= 200 && xhr.status < 400)) {
						var getxml = xhr.responseXML;
						if (getxml !== null) {
							var changesets = Array.from(getxml.getElementsByTagName("changeset"));
							changesets.forEach((element, idx) => {
								let counts = parseFloat((element.getAttribute("changes_count")) / 100) + 0.2;
								counts = counts > 1.0 ? 1.0 : counts;
								let minlat = element.getAttribute("min_lat");
								let minlon = element.getAttribute("min_lon");
								let maxlat = element.getAttribute("max_lat");
								let maxlon = element.getAttribute("max_lon");
								let lat = (parseFloat(minlat) + parseFloat(maxlat)) / 2;
								let lon = (parseFloat(minlon) + parseFloat(maxlon)) / 2;
								let dttime = new Date(element.getAttribute("closed_at"));
								let contents = "User Name: " + element.getAttribute("user") + "<br>";
								contents += basic.formatDate(dttime, "DateTime: YYYY/MM/DD hh:mm:ss<br>");
								contents += "Changes Count:" + element.getAttribute("changes_count");
								let marker = L.circleMarker([lat, lon], {
									"color": "#E92D63",
									"weight": 3,
									"opacity": 0.6,
									"fillColor": "#562DE9",
									"fillOpacity": counts
								}).bindPopup(contents).addTo(map);
								marker.EasyChangeset_idx = idx;
								markers.push(marker);
								busy = false;
							});
						} else {
							alert("error.");
							busy = false;
						};
					}
				}
			}
		},

		// 基本メニューの作成 menuhtml:指定したHTMLで左上に作成 menuhtmlが空の時は過去のHTMLから復元
		makemenu: (menuhtml) => {
			if (menuhtml !== undefined) {
				init_basemenu = menuhtml;
				let basemenu = L.control({ position: "topleft" });			// Add BaseMenu
				basemenu.onAdd = function () {
					this.ele = L.DomUtil.create('div');
					this.ele.id = "basemenu";
					return this.ele;
				};
				basemenu.addTo(map);
				$("#basemenu").html(menuhtml);
				let clearhtml = document.getElementById("clear_map").outerHTML;
				document.getElementById("clear_map").outerHTML = "";

				let clearmenu = L.control({ position: "topright" });			// Add BaseMenu
				clearmenu.onAdd = function () {
					this.ele = L.DomUtil.create('div');
					this.ele.id = "clearmenu";
					return this.ele;
				};
				clearmenu.addTo(map);
				document.getElementById("clearmenu").innerHTML = clearhtml;
			} else {
				for (let key in Conf.style) $(`[id^=${key}_]`).off();		// Delete Key_* events
				$("#basemenu").html(init_basemenu);
				$("#colors").html("");
			};

			let keys = Object.keys(Conf.target);							// マーカー追加メニュー作成
			keys.forEach(key => {
				if (Conf.target[key].marker !== undefined) {
					let html = `<a class="dropdown-item drop_button btn mr-1" style="background-image: url('./image/${Conf.target[key].marker}')" onclick="Mapmaker.poi_add('${key}')">`;
					html += `${glot.get("marker_" + key)}</a>\n`;
					$("#menu_list").append(html);
				};
			});
		}
	}
})();

function popup_icon(ev) {	// PopUpを表示
	let idx = ev.target.EasyChangeset_idx;
	L.responsivePopup({ "keepInView": true }).setContent(popcont).setLatLng(ev.latlng).openOn(map);
	ev.target.openPopup();
	return false;
};
