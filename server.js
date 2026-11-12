'use strict';

const express = require('express');
const path = require('path');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

const API_BASE = 'https://godofvirtuals.com/api/v1';
const PLATFORM = 'bet9ja';

app.disable('x-powered-by');

app.use(helmet({
contentSecurityPolicy: false
}));

app.use(express.json({ limit: '100kb' }));

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

function getApiKey() {
return process.env.GOV_API_KEY;
}

// --------------------------------------------------
// SAFE REQUEST TO GOD OF VIRTUALS
// --------------------------------------------------

async function requestProvider(resource, query = {}) {
const apiKey = getApiKey();

if (!apiKey) {
const error = new Error('API key is not configured.');
error.status = 503;
throw error;
}

const allowedResources = [
'fixtures',
'odds',
'results',
'standings'
];

if (!allowedResources.includes(resource)) {
const error = new Error('Invalid API resource.');
error.status = 400;
throw error;
}

const params = new URLSearchParams();

const allowedFilters = [
'limit',
'offset',
'event_id',
'league',
'team',
'week',
'kickoff_after',
'kickoff_before'
];

for (const name of allowedFilters) {
if (query[name] !== undefined && query[name] !== '') {
params.set(name, String(query[name]));
}
}

// Trial page size is limited to 25 rows.
const limit = Number(params.get('limit') || 25);
const offset = Number(params.get('offset') || 0);

if (
!Number.isInteger(limit) ||
limit < 1 ||
limit > 25 ||
!Number.isInteger(offset) ||
offset < 0 ||
offset > 1000
) {
const error = new Error(
'Invalid pagination. Limit must be 1-25 and offset 0-1000.'
);
error.status = 400;
throw error;
}

params.set('limit', String(limit));
params.set('offset', String(offset));

const endpoint =
"${API_BASE}/platforms/${PLATFORM}/${resource}/?${params.toString()}";

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 15000);

try {
const response = await fetch(endpoint, {
method: 'GET',
headers: {
'Authorization': "Bearer ${apiKey}",
'Accept': 'application/json'
},
signal: controller.signal
});

const body = await response.json().catch(() => ({
  ok: false,
  error: {
    message: 'The data provider returned an invalid response.'
  }
}));

if (!response.ok) {
  const error = new Error(
    body?.error?.message || 'The data provider request failed.'
  );

  error.status = response.status;
  error.providerCode = body?.error?.code || 'provider_error';

  throw error;
}

return body;

} catch (error) {
if (error.name === 'AbortError') {
const timeoutError = new Error('The data provider timed out.');
timeoutError.status = 504;
throw timeoutError;
}

throw error;

} finally {
clearTimeout(timeout);
}
}

// --------------------------------------------------
// COMMON API ROUTE HANDLER
// --------------------------------------------------

async function handleResource(req, res, resource) {
try {
const data = await requestProvider(resource, req.query);

res.set('Cache-Control', 'private, no-store');

res.json({
  success: true,
  platform: PLATFORM,
  resource,
  ...data
});

} catch (error) {
console.error(
"${resource} request failed:",
error.status || 500,
error.providerCode || 'server_error'
);

res.status(error.status || 500).json({
  success: false,
  error: error.providerCode || 'DATA_REQUEST_FAILED',
  message: error.message || 'Unable to retrieve data.'
});

}
}

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get('/api/health', (req, res) => {
res.json({
success: true,
application: 'GENERAL Z-SOCCER TIPS V1.0',
platform: 'BET9JA ZOOM SOCCER',
status: 'online',
dataSource: getApiKey()
? 'configured'
: 'not_configured',
predictionEngine: 'awaiting_verified_data'
});
});

// --------------------------------------------------
// FIXTURES
// --------------------------------------------------

app.get('/api/fixtures', (req, res) => {
return handleResource(req, res, 'fixtures');
});

// --------------------------------------------------
// ODDS
// --------------------------------------------------

app.get('/api/odds', (req, res) => {
return handleResource(req, res, 'odds');
});

// --------------------------------------------------
// COMPLETED MATCH RESULTS
// --------------------------------------------------

app.get('/api/results', (req, res) => {
return handleResource(req, res, 'results');
});

// --------------------------------------------------
// INDIVIDUAL MATCH RESULT
// --------------------------------------------------

app.get('/api/results/:eventId', (req, res) => {
return handleResource(
{
query: {
...req.query,
event_id: req.params.eventId
}
},
res,
'results'
);
});

// --------------------------------------------------
// LEAGUE STANDINGS
// --------------------------------------------------

app.get('/api/standings', (req, res) => {
return handleResource(req, res, 'standings');
});

// --------------------------------------------------
// MATCH ANALYSIS - NOT YET ENABLED
// --------------------------------------------------

app.get('/api/match/:id/analysis', (req, res) => {
res.status(503).json({
success: false,
error: 'ANALYSIS_NOT_AVAILABLE',
message:
'Verified historical data and a validated prediction model are required before match analysis is enabled.'
});
});

// --------------------------------------------------
// MAIN APPLICATION
// --------------------------------------------------

app.use(express.static(__dirname));

app.get('*', (req, res) => {
res.sendFile(path.join(__dirname, 'index.html'));
});

// --------------------------------------------------
// ERROR HANDLER
// --------------------------------------------------

app.use((err, req, res, next) => {
console.error('Server error:', err.message);

res.status(500).json({
success: false,
error: 'INTERNAL_SERVER_ERROR'
});
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, () => {
console.log(
"GENERAL Z-SOCCER TIPS V1.0 running on port ${PORT}"
);
});
