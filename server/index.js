require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());

// Routes (batch routes declared before /:id routes)
app.use('/api/plant-types', require('./routes/plant-types'));
app.use('/api/plants',      require('./routes/plants'));
app.use('/api/push',        require('./routes/push'));
app.use('/api/settings',    require('./routes/settings'));

// Serve built React app in production
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  const { setup } = require('./db/setup');
  const { initScheduler } = require('./lib/scheduler');
  setup()
    .then(() => {
      initScheduler();
      app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    })
    .catch(err => { console.error('Startup failed:', err); process.exit(1); });
}

module.exports = app;
