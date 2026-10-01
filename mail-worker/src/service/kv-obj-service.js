const kvObjService = {

	async putObj(c, key, content, metadata) {
		await c.env.kv.put(key, content, { metadata: metadata });
	},

	async deleteObj(c, keys) {

		if (typeof keys === 'string') {
			keys = [keys];
		}

		if (keys.length === 0) {
			return;
		}

		await Promise.all(keys.map( key => c.env.kv.delete(key)));
	},

	async getObj(c, key) {
		const obj = await c.env.kv.getWithMetadata(key, { type: "arrayBuffer"});
		if (!obj.value) {
			return null;
		}

		const headers = new Headers({
			'Content-Type': obj.metadata?.contentType || 'application/octet-stream',
			'Content-Length': String(obj.value.byteLength),
		});
		if (obj.metadata?.contentDisposition) headers.set('Content-Disposition', obj.metadata.contentDisposition);
		if (obj.metadata?.cacheControl) headers.set('Cache-Control', obj.metadata.cacheControl);
		return new Response(obj.value, { headers });
	},

	async toObjResp(c, key, request) {
		if (request && !['GET', 'HEAD'].includes(request.method)) {
			return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
		}
		const response = await this.getObj(c, key);
		if (!response) return new Response('Not Found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
		return request?.method === 'HEAD' ? new Response(null, { headers: response.headers }) : response;

	}

};

export default kvObjService;
