// backend/src/server.js
const express = require('express');
const Redis = require('ioredis');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors()); // Enable CORS for all routes
// Increase limits for both JSON and URL-encoded bodies
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Connect to Redis
const redis = new Redis({ host: 'redis' }); // 'redis' is the service name in docker-compose

// GET endpoint
app.get('/api/cache/get', async (req, res) => {
    const key = req.query.key;
    const data = await redis.get(key);
    res.json(data ? JSON.parse(data) : null);
});

// POST endpoint
app.post('/api/cache/set', async (req, res) => {
    const { key, value } = req.body;
    await redis.set(key, JSON.stringify(value));
    res.status(200).send({ message: 'Cached successfully' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));