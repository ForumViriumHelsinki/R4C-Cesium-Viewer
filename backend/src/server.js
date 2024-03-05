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

app.get('/terrain-proxy/*', async (req, res) => {
    let terrainUrl = 'https://kartta.hel.fi/3d/datasource-data/4383570b-33a3-4a9f-ae16-93373aff5ffa/' + req.params[0] + (req.url.includes('?') ? '&' : '?') + req.url.split('?')[1];
        // Specific version substring to remove if present at the end of the URL
        let versionSubstring = '&v=1.1708423032937557';

        let und = '?undefined';

        // Check if terrainUrl ends with the versionSubstring, and remove it if present
        if (terrainUrl.endsWith(versionSubstring)) {
            terrainUrl = terrainUrl.substring(0, terrainUrl.length - versionSubstring.length);
        }

        // Check if terrainUrl ends with the versionSubstring, and remove it if present
        if (terrainUrl.endsWith(und)) {
            terrainUrl = terrainUrl.substring(0, terrainUrl.length - und.length);
        }
    
    console.log('Proxying request to:', terrainUrl);

    try {
        const response = await axios({
            method: 'get',
            url: terrainUrl,
            responseType: 'arraybuffer',
            httpsAgent: new https.Agent({  
                rejectUnauthorized: false, // Ignore invalid SSL certificates if necessary
            }),
        });

        // Set content type to the type of the terrain data
        res.setHeader('Content-Type', response.headers['content-type']);
        
        // Send the response body back to the client
        res.send(Buffer.from(response.data));
    } catch (error) {
        console.error('Error proxying terrain data:', error.message);
        res.status(500).send('Error proxying terrain data');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));