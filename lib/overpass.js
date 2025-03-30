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
            .replace(/ /g, '%20')     // スペースを %20 に
            .replace(/"/g, '%22');    // ダブルクォーテーションを %22 に
        let stdt = basic.formatDate(new Date(params.stdate), "YYYY-MM-DDThh:mm:ss");
        let eddt = basic.formatDate(new Date(params.eddate), "YYYY-MM-DDThh:mm:ss");
        let tz = params.tz
        const query = `[out:json];nwr(user:'${user}')(changed:"${stdt}Z${tz}:00","${eddt}Z${tz}:00");out geom;`;
        let osmxml = await this.fetchOverpassData(query);
        let geojsons = osmtogeojson(osmxml, { flatProperties: true });
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
        console.log(this.overpassUrl + "?data=" + query)
        const response = await fetch(this.overpassUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: query
        })
        if (!response.ok) {
            throw new Error(`Overpass API error: ${response.status}`);
        }
        return await response.json();
    }

}
