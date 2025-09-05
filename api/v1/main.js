// File: api/check.js
// VERSI FINAL DENGAN PESAN BANTUAN DI ROOT

import { connect as netConnect } from 'net';
import { connect as tlsConnect } from 'tls';

const IP_RESOLVER = "api.fevex52293.workers.dev";
const PATH_RESOLVER = "/";
const TIMEOUT = 8000; // 8 detik

function fetchTargetAPI(options) {
    return new Promise((resolve, reject) => {
        const payload = `GET ${options.path} HTTP/1.1\r\nHost: ${options.host}\r\nUser-Agent: Mozilla/5.0\r\nConnection: close\r\n\r\n`;
        const connectOptions = {
            host: options.proxy.ip,
            port: options.proxy.port,
            timeout: TIMEOUT,
        };
        const socket = netConnect(connectOptions, () => {
            const tlsSocket = tlsConnect({ socket: socket, servername: options.host, rejectUnauthorized: false }, () => {
                tlsSocket.write(payload);
            });
            let response = '';
            tlsSocket.on('data', chunk => { response += chunk.toString(); });
            tlsSocket.on('end', () => {
                try {
                    const [, body] = response.split('\r\n\r\n', 2);
                    if (body) resolve(JSON.parse(body));
                    else reject(new Error('Empty response'));
                } catch (e) { reject(new Error('JSON Parse Error')); }
            });
            tlsSocket.on('error', err => reject(err));
        });
        socket.on('timeout', () => { socket.destroy(new Error('Timeout')); });
        socket.on('error', err => reject(err));
    });
}

export default async function handler(req, res) {
    // --- PERUBAHAN DI SINI: Tambahkan pesan bantuan untuk root path ---
    // Cek jika tidak ada query parameter sama sekali
    if (Object.keys(req.query).length === 0) {
        return res.status(200).json({
            message: "Selamat datang di API Pengecek Kesehatan Proksi.",
            usage: "Gunakan parameter 'ip' untuk mengecek proksi.",
            example: "/api/v1?ip=8.8.8.8:53",
            author: "Mayumi"
        });
    }

    const { ip: proxyAddress } = req.query;
    if (!proxyAddress) {
        return res.status(400).json({ error: "Parameter 'ip' harus diberikan. Contoh: /api/v1?ip=1.2.3.4:8080" });
    }

    const cleanedProxy = proxyAddress
        .replace(/^(https?:\/\/)/, '')
        .replace(/,/g, ':')
        .replace(/\//g, '')
        .trim();

    const parts = cleanedProxy.split(':');
    const ip = parts[0];
    const port = parts.length > 1 ? parseInt(parts[1], 10) : 443;

    if (!ip || isNaN(port)) {
        return res.status(400).json({ error: "Format parameter 'ip' tidak valid." });
    }

    const startTime = Date.now();
    try {
        const pxy = await fetchTargetAPI({ host: IP_RESOLVER, path: PATH_RESOLVER, proxy: { ip, port } });
        const delay = Date.now() - startTime;
        
        const responseData = {
            status: "success",
            proxy_ip: ip,
            proxy_port: port,
            is_alive: true,
            message: `Proxy Alive ${ip}:${port}`,
            delay: `${delay} ms`,
            as_organization: pxy.asOrganization || 'N/A',
            country_code: pxy.country || 'N/A',
            asn: pxy.asn || 'N/A',
            latitude: pxy.latitude || 'N/A',
            longitude: pxy.longitude || 'N/A',
            http_protocol: pxy.httpProtocol || 'Unknown',
        };

        if (pxy.city) responseData.city = pxy.city;
        if (pxy.continent) responseData.continent = pxy.continent;
        if (pxy.region) responseData.region = pxy.region;
        if (pxy.regionCode) responseData.region_code = pxy.regionCode;
        if (pxy.timezone) responseData.timezone = pxy.timezone;

        res.status(200).json(responseData);

    } catch (error) {
        res.status(200).json({
            status: "error",
            proxy_ip: ip,
            proxy_port: port,
            is_alive: false,
            message: `Proxy Dead: ${error.message}`
        });
    }
}
