const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Dynamically load all routes from the routes directory
const routesDir = path.join(__dirname, 'routes');

if (fs.existsSync(routesDir)) {
  const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'));

  routeFiles.forEach(file => {
    const routeName = file.replace('.js', '');
    const route = require(path.join(routesDir, file));
    app.use(`/api/${routeName}`, route);
    console.log(`Loaded route: /api/${routeName}`);
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Generated admin panel backend is running',
    routes: fs.existsSync(routesDir)
      ? fs.readdirSync(routesDir)
          .filter(file => file.endsWith('.js'))
          .map(file => `/api/${file.replace('.js', '')}`)
      : []
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message
  });
});

app.listen(PORT, () => {
  console.log(`Generated Admin Panel Backend running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT}/health for status`);
});
