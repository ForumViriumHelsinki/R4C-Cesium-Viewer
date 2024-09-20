// backend/src/server.js
const express = require( 'express' );
const Redis = require( 'ioredis' );
const cors = require( 'cors' );
const bodyParser = require( 'body-parser' );
const axios = require( 'axios' );
const https = require( 'https' );

const app = express();
app.use( cors() ); // Enable CORS for all routes
app.use( bodyParser.json( { limit: '100mb' } ) );
app.use( bodyParser.urlencoded( { extended: true, limit: '100mb' } ) );

// Connect to Redis
const redis = new Redis( { host: 'redis' } );

// Flush the Redis cache on server start
redis.flushall()
  .then(() => console.log('Redis cache flushed on server start'))
  .catch(error => console.error('Error flushing Redis cache:', error));

// Existing cache endpoints
app.get( '/api/cache/get', async ( req, res ) => {
	const key = req.query.key;
	const data = await redis.get( key );
	res.json( data ? JSON.parse( data ) : null );
} );

app.post( '/api/cache/set', async ( req, res ) => {
	const { key, value } = req.body;
	await redis.set( key, JSON.stringify( value ) );
	res.status( 200 ).send( { message: 'Cached successfully' } );
} );

// New Paavo endpoint
app.get( '/paavo', async ( req, res ) => {
	const wfsUrl = 'https://geo.stat.fi/geoserver/postialue/wfs';
	const params = new URLSearchParams( {
		service: 'WFS',
		request: 'GetFeature',
		typename: 'postialue:pno_tilasto_2024',
		version: '2.0.0',
		outputFormat: 'application/json',
		CQL_FILTER: 'kunta IN (\'091\',\'092\',\'049\',\'235\')',
		srsName: 'EPSG:4326'
	} );

	const requestUrl = `${wfsUrl}?${params.toString()}`;
	const httpsAgent = new https.Agent( {
		rejectUnauthorized: false, // Bypass SSL certificate verification 
	} ); // add this line

	try {
		let data = await redis.get( requestUrl );

		if ( !data ) {
			const response = await axios.get( requestUrl, { httpsAgent } ); // Add httpsAgent here
			data = response.data;
			await redis.set( requestUrl, JSON.stringify( data ) ); // Cache the data
		} else {
			data = JSON.parse( data ); // Parse the cached data
		}
        
		res.json( data ); 
	} catch ( error ) {
		console.error( 'Error fetching Paavo data:', error );
		res.status( 500 ).json( { error: 'Failed to fetch data' } );
	}
} );

app.get( '/wms/proxy', async ( req, res ) => {

	// The base URL of the WMS server you're proxying
	const baseUrl = 'https://kartta.hsy.fi/geoserver/wms';

	// Construct the full URL by appending the original query parameters received by the proxy
	const urlParams = new URLSearchParams( req.query ).toString();
	const fullUrl = `${baseUrl}?${urlParams}`;

	// Generate a unique cache key based on the full URL
	const cacheKey = `wms:${fullUrl}`;

	// Try to retrieve the cached response
	const cachedResponse = await redis.get( cacheKey );

	if ( cachedResponse ) {
		// Parse the cached response
		const parsedResponse = JSON.parse( cachedResponse );
		// Set the content type based on what was cached
		res.type( parsedResponse.contentType );
		res.status( parsedResponse.statusCode );
		// Convert the base64-encoded data back to a buffer and send it as the response
		res.send( Buffer.from( parsedResponse.data, 'base64' ) );
		return;
	}

	const httpsAgent = new https.Agent( {
		rejectUnauthorized: false, // Bypass SSL certificate verification
	} );

	try {
		const response = await axios.get( fullUrl, { httpsAgent, responseType: 'arraybuffer', validateStatus: false } );
		// Cache the response from the WMS server
		// Store the response as a base64-encoded string along with its content type and status code
		const cacheValue = JSON.stringify( {
			contentType: response.headers['content-type'],
			statusCode: response.status,
			data: Buffer.from( response.data ).toString( 'base64' ),
		} );

		// Save the cacheValue in Redis; consider setting an expiration time for the cache
		await redis.set( cacheKey, cacheValue );

		// Forward the content type and status code from the WMS server response
		res.type( response.headers['content-type'] );
		res.status( response.status );
		res.send( response.data );
	} catch ( error ) {
		console.error( 'Proxy request failed:', error );
		res.status( 500 ).send( 'Failed to proxy request' );
	}
} );

app.get( '/terrain-proxy/*', async ( req, res ) => {
	let terrainUrl = 'https://kartta.hel.fi/3d/datasource-data/4383570b-33a3-4a9f-ae16-93373aff5ffa/' + req.params[0] + ( req.url.includes( '?' ) ? '&' : '?' ) + req.url.split( '?' )[1];
	// Specific version substring to remove if present at the end of the URL
	let versionSubstring = '&v=1.1708423032937557';

	let und = '?undefined';

	// Check if terrainUrl ends with the versionSubstring, and remove it if present
	if ( terrainUrl.endsWith( versionSubstring ) ) {
		terrainUrl = terrainUrl.substring( 0, terrainUrl.length - versionSubstring.length );
	}

	// Check if terrainUrl ends with the versionSubstring, and remove it if present
	if ( terrainUrl.endsWith( und ) ) {
		terrainUrl = terrainUrl.substring( 0, terrainUrl.length - und.length );
	}
    
	console.log( 'Proxying request to:', terrainUrl );

	try {
		const response = await axios( {
			method: 'get',
			url: terrainUrl,
			responseType: 'arraybuffer',
			httpsAgent: new https.Agent( {  
				rejectUnauthorized: false, // Ignore invalid SSL certificates if necessary
			} ),
		} );

		// Set content type to the type of the terrain data
		res.setHeader( 'Content-Type', response.headers['content-type'] );
        
		// Send the response body back to the client
		res.send( Buffer.from( response.data ) );
	} catch ( error ) {
		console.error( 'Error proxying terrain data:', error.message );
		res.status( 500 ).send( 'Error proxying terrain data' );
	}
} );

const PORT = process.env.PORT || 3000;
app.listen( PORT, () => console.log( `Server running on port ${PORT}` ) );