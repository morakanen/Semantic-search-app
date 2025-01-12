const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();


// Serve static files
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// Serve the dataset
app.get('/dataset.json', (req, res) => {
    try {
        const dataset = fs.readFileSync(path.join(__dirname, "dataset.json"), "utf8");
        res.json(JSON.parse(dataset));
    } catch (error) {
        console.error("Error reading dataset:", error.message);
        res.status(500).json({ error: "Failed to load dataset." });
    }
});

app.post("/translate", async (req, res) => {
    const { texts } = req.body;

    if (!texts || !Array.isArray(texts)) {
        return res.status(400).json({ error: "'texts' must be an array of strings." });
    }

    try {
        const translatedTexts = await Promise.all(
            texts.map(async (text) => {
                const response = await fetch("http://localhost:5000/translate", {  // Ensure correct translation endpoint
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        q: text,
                        source: "auto",
                        target: "en",
                        format: "text",
                    }),
                });

                if (!response.ok) {
                    throw new Error(`Translation API failed: ${response.statusText}`);
                }

                const data = await response.json();
                return data.translatedText;
            })
        );

        res.json({ translatedTexts });
    } catch (error) {
        console.error("Error during translation:", error.message);
        res.status(500).json({ error: "Translation failed." });
    }
});


// Start server
const PORT = process.env.PORT || 5173;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});

