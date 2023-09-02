
class Marker {

	constructor() {
		this.markers = [];
	}

	clearMarker() {
		this.markers.forEach(m => m.remove());
		this.markers = [];
	}

	writeMarkers(changesets) {
		console.log("writeMarkers");
		this.clearMarker();
		changesets.forEach(element => {
			let mapper = cmapper.getMapperbyName(element.getAttribute("user"));
			if (mapper?.view) {
				let polygon = this.makeMarker(element, mapper);
				this.markers.push(polygon);
			}
		});
	}

	makeMarker(element, mapper) {		// 指定したelementからマーカーを作成
		const parser = new DOMParser();
		let minlat = element.getAttribute("min_lat");
		let minlon = element.getAttribute("min_lon");
		let maxlat = element.getAttribute("max_lat");
		let maxlon = element.getAttribute("max_lon");
		let dttime = new Date(element.getAttribute("closed_at"));
		let chgsetid = element.getAttribute("id");
		let username = element.getAttribute("user");
		let rank = mapper.rank;
		let counts = parseInt(element.getAttribute("changes_count"));
		let tagdom = parser.parseFromString(element.innerHTML, "text/html");
		let tagcom = tagdom.querySelector("tag[k='comment']");
		let comment = tagcom !== null ? tagcom.getAttribute("v") : "";
		let contents = `User Name: <a href="https://osm.org/user/${username}">${username}</a><br>`;
		contents += basic.formatDate(dttime, "DateTime: YYYY/MM/DD hh:mm:ss<br>");
		contents += `ChangeSet: <a href="https://osm.org/changeset/${chgsetid}" target="_blank">${chgsetid}</a><br>`;
		contents += "Changes Count: " + counts + "<br>";
		contents += "Comment: " + comment + "<br>";
		contents += `<button onclick="easycs.toggleMapper(${rank})">check clear</button>`;
		let marker;
		if ((minlat - maxlat) == 0 && (minlon - maxlon) == 0) {	// polygonでは表現出来ない時
			let lat = (parseFloat(minlat) + parseFloat(maxlat)) / 2;
			let lon = (parseFloat(minlon) + parseFloat(maxlon)) / 2;
			marker = L.circleMarker([lat, lon], {
				"weight": 3, "color": mapper.color, "opacity": 0.6, "fillColor": mapper.color, "fillOpacity": 0.6
			}).bindPopup(contents).addTo(map);
		} else {
			let latlngs = [[minlat, minlon], [minlat, maxlon], [maxlat, maxlon], [maxlat, minlon]];
			marker = L.polygon(latlngs, {
				"weight": 3, "color": mapper.color, "opacity": 0.9, "fillColor": mapper.color, "fillOpacity": 0.6
			}).bindPopup(contents).addTo(map);
		}
		return marker;
	}

}
const cmarker = new Marker();
