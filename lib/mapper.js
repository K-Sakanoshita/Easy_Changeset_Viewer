"use strict";
const TEMPLATES = [
	"#46c8e4", "#37a2ca", "#297db0", "#1d5b93", "#123a74", "#081d51",
	"#b3b2f6", "#8e8cf1", "#6865ed", "#4240da", "#2624a5", "#100f6b",
	"#e99ef3", "#dc66ed", "#b83dd6", "#842ab2", "#53198b", "#270b5e",
	"#f4a1b7", "#ee6d8f", "#d53d63", "#a7253e", "#771320", "#48070c",
	"#eaad54", "#cf8839", "#af6529", "#8d431b", "#69260f", "#420f06",
	"#80cd38", "#5baa27", "#3c8919", "#23670e", "#114706", "#052902",
	"#3cd365", "#29ae47", "#198b2e", "#0e681a", "#07480c", "#022904",
];

class Mapper {

	constructor() {
		this.busy = false;
		this.mappers = [];				// changesetから抽出したマッパーリスト
		this.colors = [];
		for (let x = 0; x <= 5; x++) {
			for (let y = 0; y <= 5; y++) {
				this.colors.push(TEMPLATES[y * 6 + x]);
			}
		}
	}

	clearMapper() {
		document.getElementById("mappers").innerHTML = "";
		document.getElementById("comments").innerHTML = "";
		this.mappers = [];
	}

	clearComment() {
		document.getElementById("comments").innerHTML = "";
	}

	// changesetsからmappersを作成
	makeMappers(changesets) {
		console.log("makeMappers");
		const parser = new DOMParser();
		const getLatlng = function (element) {
			let minlat = element.getAttribute("min_lat");	// 南
			let minlon = element.getAttribute("min_lon");	// 西
			let maxlat = element.getAttribute("max_lat");	// 北
			let maxlon = element.getAttribute("max_lon");	// 東
			return { minlat: minlat, minlon: minlon, maxlat: maxlat, maxlon: maxlon };
		}
		const checkInner = function (latlng) {		// element範囲が画面内か判定（element範囲が全て画面外ならfalseを返す）
            let LL = { "NW": map.getBounds().getNorthWest(), "SE": map.getBounds().getSouthEast() };
            LL.NW.lng = LL.NW.lng * 0.9998;
            LL.SE.lng = LL.SE.lng * 1.0002;
            LL.SE.lat = LL.SE.lat * 0.9998;
            LL.NW.lat = LL.NW.lat * 1.0002;
			return latlng.minlat >= LL.SE.lat && latlng.maxlat <= LL.NW.lat && latlng.minlon >= LL.NW.lng && latlng.maxlon <= LL.SE.lng;
		}

		this.clearMapper();
		if (changesets[0] == undefined) return;
		changesets.forEach((element, idx) => {
			let username = element.getAttribute("user");
			let counts = parseInt(element.getAttribute("changes_count"));
			let chgsetid = element.getAttribute("id");
			let tagdom = parser.parseFromString(element.innerHTML, "text/html");
			let tagcom = tagdom.querySelector("tag[k='comment']");
			let dttime = basic.formatDate(new Date(element.getAttribute("closed_at")), "YYYY/MM/DD hh:mm:ss");
			let comment = tagcom !== null ? [chgsetid, dttime, tagcom.getAttribute("v")] : [chgsetid, dttime, "(no comment)"];
			let mapper = this.mappers.find(u => u.name === username);
			let latlng = getLatlng(element);
			let view = checkInner(latlng);
			if (mapper == undefined) {
				this.mappers.push({ "name": username, "counts": counts, "comments": [comment], "rank": 0, "view": view });
			} else {
				mapper.counts += counts;
				mapper.comments.push(comment);
				mapper.view = !mapper.view ? false : view;	// 一度でも範囲外のboundingがあれば非表示
			}
		});
		this.mappers.sort((a, b) => { if (a.counts > b.counts) { return -1 } else { return 1 } });
		let rank = 1;
		this.mappers.forEach(mapper => {
			mapper.rank = rank++
			mapper.color = this.colors[(mapper.rank - 1) % this.colors.length];
		});
		return this.mappers;
	}

	getMappersByView(vflag) {		// 表示中のマッパーを返す
		return this.mappers.filter(mapper => mapper.view == vflag);
	}

	getMapperByRank(rank) {			// 指定したランクのマッパーを返す(同率でも別ランク)
		return this.mappers.find(u => u.rank === rank);
	}

	getMapperbyName(name) {			// 指定したユーザー名のマッパーを返す
		return this.mappers.find(u => u.name === name);
	}

	// マッパー一覧作成
	writeMappers() {
		console.log("writeMappers");
		let mapperlist = document.getElementById("mappers");
		mapperlist.insertAdjacentHTML('beforeend', Conf.mapperlist.html);
		this.mappers.forEach(mapper => {
			let color = this.colors[(mapper.rank - 1) % this.colors.length];
			let selected = mapper.view ? "selected" : "";
			mapperlist.insertAdjacentHTML('beforeend', `<div id="mapper_${mapper.rank}" class="${selected}" onclick="easycs.toggleMapper(${mapper.rank})"><span>${mapper.counts} : <span style='color:${color}'>&#9632</span> ${mapper.name}</span></div>`);
			this.writeComments(mapper.name);
		});
	}

	// コメント欄作成(既存コメントに追記)
	writeComments(username) {
		let commentlist = document.getElementById("comments");
		let contents = `<div><span><a href="https://osm.org/user/${username}" target="_blank">${username}</a></span><br>`;
		let mapper = this.getMapperbyName(username);
		if (mapper?.view) {
			mapper.comments.forEach(comment => {
				contents += `<a href="https://www.openstreetmap.org/changeset/${comment[0]}" target="_blank">${comment[1]}</a> : ${comment[2]}<br>`;
			});
			commentlist.insertAdjacentHTML('beforeend', contents + "</div>");
		}
		comments.scrollTo(0, 0);
	}
}
const cmapper = new Mapper();
