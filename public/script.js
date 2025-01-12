// Declare global variables
let model; // Universal Sentence Encoder model
let dataset = []; // Dataset array
let datasetEmbeddings; // Array of embeddings with precomputed magnitudes
const TOP_N = 10; // Number of top results to display

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
    resultsDiv.innerHTML = "<h2>Results:</h2>"; // Add header for results

    topScores.forEach(({ index, similarity }) => {
        const originalItem = dataset[index]; // Retrieve original dataset item
        const title = originalItem.title || "No Title Available"; // Title fallback
        const author = originalItem.creator || "Unknown Author"; // Author fallback

        const resultItem = document.createElement("p"); // Create a result element
        resultItem.textContent = `Title: ${title}, Author: ${author} (Similarity: ${similarity.toFixed(2)})`;
        resultsDiv.appendChild(resultItem); // Append result to resultsDiv
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
        .filter(content => content.trim() !== ""); // Ensure only valid content

    if (contents.length === 0) {
        throw new Error("No valid content to encode in the dataset.");
    }

    datasetEmbeddings = []; // Initialize the embeddings array
    const batchSize = 100; // Batch size for encoding to avoid memory issues

    for (let i = 0; i < contents.length; i += batchSize) {
        const batch = contents.slice(i, i + batchSize); // Create a batch
        const batchEmbeddings = await model.embed(batch); // Encode the batch

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
    model = await use.load(); // Load the Universal Sentence Encoder model
    console.log("Model loaded successfully!");

    console.log("Fetching and preparing dataset...");
    await fetchDataset(); // Fetch the dataset
    await loadDatasetEmbeddings(); // Load or encode dataset embeddings
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

// Initialize application on page load
(async function initialize() {
    try {
        await loadModelAndPrepareDataset(); // Load model and prepare dataset
    } catch (error) {
        console.error("Error initializing application:", error.message);
        alert("Failed to initialize application. Check the console for more details.");
    }
})();