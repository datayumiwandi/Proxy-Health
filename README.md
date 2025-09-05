buka clodflare buat cloudflare wolkers dan tempel ini


```js
export default {
  async fetch(request) {
    const cfInfo = request.cf || {};

    // Ambil IP klien dari header Cloudflare
    const clientIp =
      request.headers.get("CF-Connecting-IP") ||
      request.headers.get("x-forwarded-for") ||
      "unknown";

    // Gabungkan IP ke awal objek cfInfo
    const result = {
      ip: clientIp,
      ...cfInfo
    };

    return new Response(JSON.stringify(result, null, 2), {
      headers: {
        "Content-Type": "application/json"
      }
    });
  }
}
```

____
lalu pada bagian IP_RESOLVER di dalam index.js ganti dengan domain wolkers milik mu.
