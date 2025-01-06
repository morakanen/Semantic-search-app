let model;
let dataset = [];
let datasetEmbeddings;


async function fetchDataset() {
    console.log("Fetching dataset...");
    const response = await fetch('dataset.json'); 
    dataset = await response.json();
    console.log("Dataset fetched successfully!");
}

const TOP_N = 10; 

function displayTopResults(scores) {
    const topScores = scores.slice(0, TOP_N);

    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "<h2>Results:</h2>";

    topScores.forEach(({ index, similarity }) => {
        const originalItem = dataset[index];
        const title = originalItem.title || "No Title Available"; // Replace 'content' with your title field
        const author = originalItem.creator || "Unknown Author";   // Replace 'creator' with your author field

        const resultItem = document.createElement("p");
        resultItem.textContent = `Title: ${title}, Author: ${author} (Similarity: ${similarity.toFixed(2)})`;
        resultsDiv.appendChild(resultItem);
    });

    if (topScores.length === 0) {
        resultsDiv.innerHTML += "<p>No relevant results found.</p>";
    }
}


async function loadModelAndPrepareDataset() {
    console.log("Loading Universal Sentence Encoder model...");
    model = await use.load();
    console.log("Model loaded successfully!");

    console.log("Encoding dataset...");
    
    const contents = dataset.map(item => item.content || item.description || "").filter(content => content.trim() !== "");
    if (contents.length === 0) {
        throw new Error("No valid content to encode in the dataset.");
    }
     
     datasetEmbeddings = [];
     const batchSize = 100; 
     for (let i = 0; i < contents.length; i += batchSize) {
         const batch = contents.slice(i, i + batchSize);
         const batchEmbeddings = await model.embed(batch);
         datasetEmbeddings.push(...batchEmbeddings.arraySync());
     }
 
     console.log("Dataset encoded!");
     console.log("Dataset Embeddings:", datasetEmbeddings);
     
 }


function cosineSimilarity(vectorA, vectorB) {
    const dotProduct = vectorA.dot(vectorB).dataSync()[0];
    const magnitudeA = vectorA.norm().dataSync()[0];
    const magnitudeB = vectorB.norm().dataSync()[0];
    return dotProduct / (magnitudeA * magnitudeB);
}

async function handleSearch() {
    const query = document.getElementById("searchQuery").value;
    if (!query) {
        alert("Please enter a search query.");
        return;
    }

    console.log(`Searching for: ${query}`);
    const queryEmbedding = await model.embed([query]);
    console.log("Query Embedding:", queryEmbedding.arraySync());

    // Calculates similarity scores
    const scores = [];
    for (let i = 0; i < datasetEmbeddings.length; i++) {
        const similarity = cosineSimilarity(
            tf.tensor(queryEmbedding.arraySync()[0]), // Convert query tensor to array and back
            tf.tensor(datasetEmbeddings[i]) // Use individual embeddings
        );
        scores.push({ index: i, similarity });
    }
    console.log("Similarity Scores:", scores);

    // Sort results by similarity score in descending order
    scores.sort((a, b) => b.similarity - a.similarity);

    // Limits to the top 10 results
    const topScores = scores.slice(0, 10);

    // Displays results
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "<h2>Results:</h2>";
    topScores.forEach(({ index, similarity }) => {
        const originalItem = dataset[index];
        const title = originalItem.title || "No Title Available"; // Replace 'content' with your title field
        const author = originalItem.creator || "Unknown Author";   // Replace 'creator' with your author field

        const resultItem = document.createElement("p");
        resultItem.textContent = `Title: ${title}, Author: ${author} (Similarity: ${similarity.toFixed(2)})`;
        resultsDiv.appendChild(resultItem);
    });

    if (topScores.length === 0) {
        resultsDiv.innerHTML += "<p>No relevant results found.</p>";
    }
}


// this is the vent listener for the search button
document.getElementById("searchButton").addEventListener("click", handleSearch);

// Fetchs the dataset, loads the model, and prepares the dataset on page load
(async function initialize() {
    try {
        await fetchDataset();
        await loadModelAndPrepareDataset();
    } catch (error) {
        console.error("Error initializing application:", error.message);
        alert("Failed to initialize application. Check the console for more details.");
    }
})();