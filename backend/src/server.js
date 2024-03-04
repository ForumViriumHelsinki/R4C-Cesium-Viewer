// backend/src/server.js
const express = require('express');
const Redis = require('ioredis');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const https = require('https');

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Connect to Redis
const redis = new Redis({ host: 'redis' });

// Existing cache endpoints
app.get('/api/cache/get', async (req, res) => {
    const key = req.query.key;
    const data = await redis.get(key);
    res.json(data ? JSON.parse(data) : null);
});

app.post('/api/cache/set', async (req, res) => {
    const { key, value } = req.body;
    await redis.set(key, JSON.stringify(value));
    res.status(200).send({ message: 'Cached successfully' });
});

app.get('/wms/proxy', async (req, res) => {
    // The base URL of the WMS server you're proxying
    const baseUrl = 'https://kartta.hsy.fi/geoserver/wms';

    // Construct the full URL by appending the original query parameters received by the proxy
    const urlParams = new URLSearchParams(req.query).toString();
    const fullUrl = `${baseUrl}?${urlParams}`;

    const httpsAgent = new https.Agent({  
        rejectUnauthorized: false, // Bypass SSL certificate verification
    });

    try {
        const response = await axios.get(fullUrl, { httpsAgent, responseType: 'arraybuffer', validateStatus: false });
        // Forward the content type and status code from the WMS server response
        res.type(response.headers['content-type']);
        res.status(response.status);
        res.send(response.data);
    } catch (error) {
        console.error("Proxy request failed:", error);
        res.status(500).send('Failed to proxy request');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));