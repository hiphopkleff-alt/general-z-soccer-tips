'use strict';

const express = require('express');
const path = require('path');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(express.json({ limit: '100kb' }));

// Serve the main application
app.use(express.static(__dirname));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    application: 'GENERAL Z-SOCCER TIPS V1.0',
    platform: 'BET9JA ZOOM SOCCER',
    status: 'online',
    dataSource: 'not_connected',
    predictionEngine: 'awaiting_verified_data'
  });
});

// Fixture endpoint
app.get('/api/fixtures', (req, res) => {
  res.status(503).json({
    success: false,
    error: 'ZOOM_SOCCER_DATA_SOURCE_NOT_CONNECTED',
    message: 'An authorized Zoom Soccer fixture source is required.'
  });
});

// Match analysis endpoint
app.get('/api/match/:id/analysis', (req, res) => {
  res.status(503).json({
    success: false,
    error: 'ANALYSIS_NOT_AVAILABLE',
    message: 'Verified match data is required before analysis.'
  });
});

// Main application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);

  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR'
  });
});

app.listen(PORT, () => {
  console.log(
    `GENERAL Z-SOCCER TIPS V1.0 running on port ${PORT}`
  );
});
