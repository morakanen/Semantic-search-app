const express = require('express');
const app = express();
const path = require('path');
const fs = require('fs');

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Serve the dataset
app.get('/dataset.json', (req, res) => {
    const dataset = fs.readFileSync('./dataset.json', 'utf8');
    res.json(JSON.parse(dataset));
});

// Start server
const PORT = process.env.PORT || 5173;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

