class OSMChangesetPolygonFetcher {
    constructor() {
        this.osmBaseUrl = 'https://api.openstreetmap.org/api/0.6';
        this.overpassUrl = 'https://overpass-api.de/api/interpreter';
    }

    /**
    * changesetIdからnode,way,relationを取得し、Overpass APIでオブジェクトを返す
    * @param {number|string} changesetId 
    * @returns {Promise<Object>} Overpass API JSONレスポンス
    */
    async getFullDataFromChangeset(changesetId) {
        const xml = await this.fetchChangeset(changesetId);
        const { nodeIds, wayIds, relationIds } = this.extractIdsFromXML(xml);

        if (nodeIds.length === 0 && wayIds.length === 0 && relationIds.length === 0) {
            throw new Error('このチェンジセットにはOSMオブジェクトが含まれていません。');
        }

        const query = this.buildOverpassQuery(nodeIds, wayIds, relationIds);
        let osmxml = await this.fetchOverpassData(query);
        let geojsons = osmtogeojson(osmxml, { flatProperties: true });
        return geojsons;
    }

    /**
    * userNameからnode,way,relationを取得し、Overpass APIでオブジェクトを返す
    * @param {number|string} userName, stdate, eddate, tz
    * @returns {Promise<Object>} Overpass API JSONレスポンス
    */
    async getFullDataFromUserName(params) {
        let user = params.username
            .replace(/ /g, '%20')
            .replace(/"/g, '%22');

        // タイムゾーンオフセットを分単位で取得（例: "+09:30" → -570）
        const parseTimezoneOffset = (tz) => {
            const match = tz.match(/^([+-])(\d{2})(?::?(\d{2}))?$/);
            if (!match) throw new Error("Invalid timezone format: " + tz);
            const sign = match[1] === '+' ? -1 : 1; // +ならUTCにするにはマイナス
            const hours = parseInt(match[2], 10);
            const minutes = parseInt(match[3] || '0', 10);
            return sign * (hours * 60 + minutes);
        };

        const tzOffsetMinutes = parseTimezoneOffset(params.tz);

        // ローカル日時（文字列）＋タイムゾーン補正 → UTC ISO形式へ
        const adjustToUTC = (dateStr) => {
            const date = new Date(dateStr);
            // UTCにするために offset を適用
            const utcMs = date.getTime() + tzOffsetMinutes * 60 * 1000;
            return new Date(utcMs).toISOString().slice(0, 19) + "Z";
        };

        const stdt = adjustToUTC(params.stdate);
        const eddt = adjustToUTC(params.eddate);

        const query = `[out:json];nwr(user:'${user}')(changed:"${stdt}","${eddt}");out geom;`;
        const osmxml = await this.fetchOverpassData(query);
        const geojsons = osmtogeojson(osmxml, { flatProperties: true });
        return geojsons;
    }

    async fetchChangeset(changesetId) {
        const url = `${this.osmBaseUrl}/changeset/${changesetId}/download`;
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`OSM API error: ${response.status}`);
        }
        return await response.text();
    }

    extractIdsFromXML(xml) {
        const nodeIds = [...xml.matchAll(/<node id="(\d+)"/g)].map(m => m[1]);
        const wayIds = [...xml.matchAll(/<way id="(\d+)"/g)].map(m => m[1]);
        const relationIds = [...xml.matchAll(/<relation id="(\d+)"/g)].map(m => m[1]);
        return { nodeIds, wayIds, relationIds };
    }

    buildOverpassQuery(nodeIds, wayIds, relationIds) {
        return `
        [out:json];
        (
          ${nodeIds.map(id => `node(${id});`).join('\n')}
          ${wayIds.map(id => `way(${id});`).join('\n')}
          ${relationIds.map(id => `relation(${id});`).join('\n')}
        );
        (._;>;);
        out body;
      `;
    }

    async fetchOverpassData(query) {
        const url = this.overpassUrl + "?data=" + query;
        console.log("Overpass GET URL:", url);
        const response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' } });
        if (!response.ok) { throw new Error(`Overpass API error: ${response.status}`); }
        return await response.json();
    }

}
