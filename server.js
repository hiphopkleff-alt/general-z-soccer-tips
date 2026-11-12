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

function getApiKey() {
  return process.env.GOV_API_KEY;
}

async function getProviderData(resource, query = {}) {
  const apiKey = getApiKey();

  if (!apiKey) {
    throw new Error('GOV_API_KEY is missing from Render.');
  }

  const allowedResources = [
    'fixtures',
    'results',
    'standings'
  ];

  if (!allowedResources.includes(resource)) {
    throw new Error('Invalid data resource.');
  }

  const params = new URLSearchParams();

  const limit = Number(query.limit || 25);
  const offset = Number(query.offset || 0);

  if (!Number.isInteger(limit) || limit < 1 || limit > 25) {
    throw new Error('Limit must be between 1 and 25.');
  }

  if (!Number.isInteger(offset) || offset < 0) {
    throw new Error('Offset must be zero or greater.');
  }

  params.set('limit', String(limit));
  params.set('offset', String(offset));

  if (query.event_id) {
    params.set('event_id', String(query.event_id));
  }

  // IMPORTANT: Use backticks for this URL.
  const endpoint =
    `${API_BASE}/platforms/${PLATFORM}/${resource}/?${params.toString()}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    const data = await response.json();

    if (!response.ok) {
      const message =
        data?.error?.message ||
        data?.message ||
        'Provider request failed.';

      const error = new Error(message);
      error.status = response.status;
      throw error;
    }

    return data;

  } finally {
    clearTimeout(timeout);
  }
}

async function sendProviderData(req, res, resource) {
  try {
    const data = await getProviderData(resource, req.query);

    res.set('Cache-Control', 'no-store');

    res.json({
      success: true,
      platform: PLATFORM,
      resource,
      providerResponse: data
    });

  } catch (error) {
    console.error(`${resource} request failed:`, error.message);

    res.status(error.status || 502).json({
      success: false,
      error: 'DATA_REQUEST_FAILED',
      message: error.message
    });
  }
}

// HEALTH CHECK
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    application: 'GENERAL Z-SOCCER TIPS V1.0',
    platform: 'BET9JA ZOOM SOCCER',
    status: 'online',
    dataSource: getApiKey() ? 'configured' : 'not_configured',
    predictionEngine: 'awaiting_verified_data'
  });
});

// FIXTURES
app.get('/api/fixtures', (req, res) => {
  return sendProviderData(req, res, 'fixtures');
});

// RESULTS
app.get('/api/results', (req, res) => {
  return sendProviderData(req, res, 'results');
});

// INDIVIDUAL RESULT
app.get('/api/results/:eventId', (req, res) => {
  req.query.event_id = req.params.eventId;
  return sendProviderData(req, res, 'results');
});

// STANDINGS
app.get('/api/standings', (req, res) => {
  return sendProviderData(req, res, 'standings');
});

// MATCH ANALYSIS
app.get('/api/match/:id/analysis', (req, res) => {
  res.status(503).json({
    success: false,
    error: 'ANALYSIS_NOT_AVAILABLE',
    message: 'Verified historical match data is required.'
  });
});

// FRONTEND
app.use(express.static(__dirname));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ERROR HANDLER
app.use((error, req, res, next) => {
  console.error('Server error:', error.message);

  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR'
  });
});

// START SERVER
app.listen(PORT, () => {
  console.log(
    `GENERAL Z-SOCCER TIPS V1.0 running on port ${PORT}`
  );
});
