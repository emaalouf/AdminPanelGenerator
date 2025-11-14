const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dbRoutes = require('./routes/db');
const generatorRoutes = require('./routes/generator');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/db', dbRoutes);
app.use('/api/generator', generatorRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Developer panel backend is running' });
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
  console.log(`Developer Panel Backend running on port ${PORT}`);
});
