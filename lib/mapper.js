"use strict";
const TEMPLATES = [
    "#e6194b", "#3cb44b", "#ffe119", "#4363d8", "#f58231", "#911eb4",
    "#46f0f0", "#f032e6", "#bcf60c", "#fabebe", "#008080", "#e6beff",
    "#9a6324", "#fffac8", "#800000", "#aaffc3", "#808000", "#ffd8b1",
    "#000075", "#808080", "#ffffff", "#000000", "#ff7f00", "#1f78b4",
    "#33a02c", "#e31a1c", "#fdbf6f", "#cab2d6", "#6a3d9a", "#b15928",
    "#a6cee3", "#b2df8a", "#fb9a99", "#fdbf6f", "#ffff99", "#b3de69",
    "#8dd3c7", "#ffffb3", "#bebada", "#fb8072", "#80b1d3", "#fdb462",
    "#b3de69", "#fccde5", "#d9d9d9", "#bc80bd", "#ccebc5", "#ffed6f",
    "#d73027", "#fc8d59", "#fee08b", "#d9ef8b", "#91cf60", "#1a9850",
    "#4575b4", "#74add1", "#abd9e9", "#e0f3f8", "#ffffbf", "#fee090",
    "#fdae61", "#f46d43", "#d53e4f", "#9e0142", "#66c2a5", "#fc8d62",
    "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f", "#e5c494", "#b3b3b3",
    "#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02",
    "#a6761d", "#666666", "#c7e9b4", "#7fcdbb"
];

class Mapper {

    constructor() {
        this.busy = false;
        this.mappers = [];				// changesetから抽出したマッパーリスト
        this.colors = [];
        for (let x = 0; x <= 12; x++) {
            for (let y = 0; y <= 6; y++) {
                this.colors.push(TEMPLATES[y * 12 + x]);
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
            let minlat = parseFloat(element.getAttribute("min_lat"));	// 南
            let minlon = parseFloat(element.getAttribute("min_lon"));	// 西
            let maxlat = parseFloat(element.getAttribute("max_lat"));	// 北
            let maxlon = parseFloat(element.getAttribute("max_lon"));	// 東
            return { minlat: minlat, minlon: minlon, maxlat: maxlat, maxlon: maxlon };
        }
        const checkInner = function (latlng) {		// element範囲が画面内か判定（element範囲が全て画面外ならfalseを返す）
            let LL = { "NW": map.getBounds().getNorthWest(), "SE": map.getBounds().getSouthEast() };
            LL.SE.lat = LL.SE.lat * 0.9998;
            LL.NW.lat = LL.NW.lat * 1.0002;
            LL.NW.lng = LL.NW.lng * (LL.NW.lng < 0 ? 1.0002 : 0.9998);
            LL.SE.lng = LL.SE.lng * (LL.SE.lng < 0 ? 0.9998 : 1.0002);
            return latlng.minlat >= LL.SE.lat && latlng.maxlat <= LL.NW.lat && latlng.minlon >= LL.NW.lng && latlng.maxlon <= LL.SE.lng;
        }

        this.clearMapper();
        if (changesets[0] == undefined) return;
        changesets.forEach((element, idx) => {
            let username = basic.htmlspecialchars(element.getAttribute("user"));
            let counts = parseInt(element.getAttribute("changes_count"));
            let chgsetid = element.getAttribute("id");
            let tagdom = parser.parseFromString(element.innerHTML, "text/html");
            let tagcom = tagdom.querySelector("tag[k='comment']");
            let dttime = basic.formatDate(new Date(element.getAttribute("closed_at")), "YYYY/MM/DD hh:mm:ss");
            let comment = tagcom !== null ? [chgsetid, dttime, basic.htmlspecialchars(tagcom.getAttribute("v"))] : [chgsetid, dttime, "(no comment)"];
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
