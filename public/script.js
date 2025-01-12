let model; // Universal Sentence Encoder model
let dataset = []; // Dataset array
let datasetEmbeddings; // Array of embeddings with precomputed magnitudes
const TOP_N = 10; 

// Fetch dataset from JSON file
async function fetchDataset() {
    console.log("Fetching dataset...");
    const response = await fetch("dataset.json"); // Fetch dataset from a file
    dataset = await response.json(); // Parse the dataset
    console.log("Dataset fetched successfully!");
}

// Display the top N results based on similarity scores
function displayTopResults(scores) {
    const topScores = scores.slice(0, TOP_N); // Select top N scores
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "<h2>Results:</h2>"; 

    topScores.forEach(({ index, similarity }) => {
        const originalItem = dataset[index]; 
        const title = originalItem.title || "No Title Available"; // Title fallback
        const author = originalItem.creator || "Unknown Author"; // Author fallback

        const resultItem = document.createElement("p"); 
        resultItem.textContent = `Title: ${title}, Author: ${author} (Similarity: ${similarity.toFixed(2)})`;
        resultsDiv.appendChild(resultItem); 
    });

    if (topScores.length === 0) {
        resultsDiv.innerHTML += "<p>No relevant results found.</p>"; // Handle no results case
    }
}

// Encode the dataset into embeddings with magnitudes
async function encodeDataset() {
    console.log("Encoding dataset...");
    const contents = dataset
        .map(item => item.content || item.description || "")
        .filter(content => content.trim() !== ""); 

    if (contents.length === 0) {
        throw new Error("No valid content to encode in the dataset.");
    }

    datasetEmbeddings = [];
    const batchSize = 100; 

    for (let i = 0; i < contents.length; i += batchSize) {
        const batch = contents.slice(i, i + batchSize); 
        const batchEmbeddings = await model.embed(batch); 

        const embeddingsWithMagnitudes = batchEmbeddings.arraySync().map(embedding => {
            const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0)); // Precompute magnitude
            return { embedding, magnitude };
        });

        datasetEmbeddings.push(...embeddingsWithMagnitudes); // Add embeddings to the array
        console.log(`Encoded batch ${Math.ceil(i / batchSize) + 1}/${Math.ceil(contents.length / batchSize)}`);
    }

    console.log("Dataset encoded!");
}

// Load the model and prepare the dataset embeddings
async function loadModelAndPrepareDataset() {
    console.log("Loading Universal Sentence Encoder model...");
    model = await use.load(); 
    console.log("Model loaded successfully!");

    console.log("Fetching and preparing dataset...");
    await fetchDataset(); 
    await loadDatasetEmbeddings(); 
}

// Load dataset embeddings from IndexedDB or encode them if not cached
async function loadDatasetEmbeddings() {
    try {
        const cachedEmbeddings = await loadEmbeddingsFromIndexedDB(); // Load from IndexedDB
        if (cachedEmbeddings.length > 0) {
            console.log("Using cached embeddings.");
            datasetEmbeddings = cachedEmbeddings; // Use cached embeddings
        } else {
            await encodeDataset(); // Encode if no cached embeddings
            await saveEmbeddingsToIndexedDB(datasetEmbeddings); // Cache the embeddings
            console.log("Embeddings cached for future use.");
        }
    } catch (error) {
        console.error("Error loading or caching embeddings:", error.message);
    }
}

// Save embeddings to IndexedDB
async function saveEmbeddingsToIndexedDB(embeddings) {
    const db = await openDatabase(); // Open IndexedDB
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("embeddings", "readwrite");
        const store = transaction.objectStore("embeddings");
        store.put({ id: "datasetEmbeddings", data: embeddings }); // Save embeddings
        transaction.oncomplete = () => resolve();
        transaction.onerror = event => reject(event.target.error);
    });
}

// Load embeddings from IndexedDB
async function loadEmbeddingsFromIndexedDB() {
    const db = await openDatabase(); // Open IndexedDB
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("embeddings", "readonly");
        const store = transaction.objectStore("embeddings");
        const request = store.get("datasetEmbeddings");
        request.onsuccess = event => resolve(event.target.result?.data || []);
        request.onerror = event => reject(event.target.error);
    });
}

// Open IndexedDB connection
async function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open("EmbeddingDatabase", 1);
        request.onupgradeneeded = event => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains("embeddings")) {
                db.createObjectStore("embeddings", { keyPath: "id" });
            }
        };
        request.onsuccess = event => resolve(event.target.result);
        request.onerror = event => reject(event.target.error);
    });
}

// Compute cosine similarity using precomputed magnitudes
function cosineSimilarity(queryEmbedding, embeddingObj) {
    const { embedding, magnitude } = embeddingObj; // Use precomputed embedding and magnitude
    const dotProduct = queryEmbedding.reduce((sum, val, i) => sum + val * embedding[i], 0);
    const queryMagnitude = Math.sqrt(queryEmbedding.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (queryMagnitude * magnitude);
}

// Handle search queries
async function handleSearch() {
    const query = document.getElementById("searchQuery").value;
    if (!query) {
        alert("Please enter a search query.");
        return;
    }

    console.log(`Searching for: ${query}`);
    const queryEmbedding = (await model.embed([query])).arraySync()[0]; // Embed query

    // Calculate similarity scores
    const scores = datasetEmbeddings.map((embeddingObj, index) => ({
        index,
        similarity: cosineSimilarity(queryEmbedding, embeddingObj),
    }));

    scores.sort((a, b) => b.similarity - a.similarity); // Sort by similarity

    displayTopResults(scores); // Display top results
}

// Add event listener for search button
document.getElementById("searchButton").addEventListener("click", handleSearch);

const servers = [
    "http://localhost:5000",
    "http://localhost:5001",
    "http://localhost:5002"
];

async function translateText(text) {
    // Rotate through the servers to avoid hitting the same one repeatedly
    const server = servers[Math.floor(Math.random() * servers.length)];

    const response = await fetch(`${server}/translate`, {
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
        throw new Error(`Translation failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.translatedText;
}

document.getElementById("translateButton").addEventListener("click", async () => {
    console.log("Translate button clicked."); // Log to confirm the button is clicked

    // Capture all visible text
    const elements = Array.from(document.body.querySelectorAll("*")).filter((el) => {
        return el.children.length === 0 && el.textContent.trim() !== ""; // Only leaf nodes with text
    });

    const texts = elements.map((el) => el.textContent.trim());

    console.log("Texts to translate (captured from DOM):", texts); // Log the texts to be translated

    try {
        console.log("Sending texts to backend for translation..."); // Log before sending the request
        const response = await fetch("/translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texts }), // Send texts to be translated
        });

        console.log("Response received from backend:", response.status); // Log the HTTP status of the response

        const data = await response.json();

        if (data.translatedTexts) {
            console.log("Translated texts received from backend:", data.translatedTexts); // Log translated texts
            // Update the text content with translations
            data.translatedTexts.forEach((translatedText, i) => {
                elements[i].textContent = translatedText;
            });
        } else {
            console.error("Translation failed. Backend error:", data.error); // Log backend error message
        }
    } catch (err) {
        console.error("Error during translation request:", err); // Log any network or fetch errors
    }
});


// Initialize application on page load
(async function initialize() {
    try {
        await loadModelAndPrepareDataset(); // Load model and prepare dataset
    } catch (error) {
        console.error("Error initializing application:", error.message);
        alert("Failed to initialize application. Check the console for more details.");
    }
})();