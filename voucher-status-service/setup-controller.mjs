import https from 'node:https';
import { rootCertificates } from 'node:tls';
import { readFileSync } from 'node:fs';

let input = '';
for await (const chunk of process.stdin) input += chunk;
try {
    const config = JSON.parse(input);
    const agent = new https.Agent({ ca: [...rootCertificates, readFileSync(config.pem, 'utf8')] });
    async function request(path, body, token) {
        return new Promise((resolve, reject) => {
            const req = https.request(new URL(path, config.controller), {
                agent, method: body ? 'POST' : 'GET',
                headers: { 'Content-Type': 'application/json', ...(token ? {Authorization: 'AccessToken=' + token} : {}) }
            }, res => {
                let text = '';
                res.setEncoding('utf8');
                res.on('data', chunk => { text += chunk; });
                res.on('error', reject);
                res.on('end', () => {
                    try {
                        if (res.statusCode !== 200) throw new Error('Controller HTTP ' + res.statusCode);
                        let data;
                        try { data = JSON.parse(text); } catch { throw new Error('Controller returned invalid JSON. Check the HTTPS API address.'); }
                        if (data.errorCode !== 0) throw new Error('Controller rejected request (' + data.errorCode + '). Check credentials and site permissions.');
                        resolve(data.result);
                    } catch (error) { reject(error); }
                });
            });
            req.setTimeout(12000, () => req.destroy(new Error('Controller connection timed out.')));
            req.on('error', reject);
            req.end(body ? JSON.stringify(body) : undefined);
        });
    }
    try {
        const auth = await request('/openapi/authorize/token?grant_type=client_credentials', {
            omadacId: config.omadaId, client_id: config.clientId, client_secret: config.secret
        });
        if (!auth.accessToken) throw new Error('Controller did not return an access token.');
        const sites = [];
        let complete = false;
        for (let page = 1; page <= 100; page++) {
            const result = await request('/openapi/v1/' + encodeURIComponent(config.omadaId) + '/sites?page=' + page + '&pageSize=100', null, auth.accessToken);
            if (!Array.isArray(result.data)) throw new Error('Unexpected site-list response.');
            sites.push(...result.data.map(site => ({ name: site.name || 'Unnamed site', siteId: site.siteId })));
            if (result.data.length < 100 || (result.totalRows != null && sites.length >= Number(result.totalRows))) {
                complete = true;
                break;
            }
        }
        if (!complete) throw new Error('Site list exceeds the setup limit. Use manual discovery.');
        process.stdout.write(JSON.stringify({sites}));
    } finally { agent.destroy(); }
} catch (error) {
    process.stdout.write(JSON.stringify({error: error.code ? 'Connection failed (' + error.code + '). Check network access, certificate trust and address.' : error.message}));
    process.exitCode = 1;
}
