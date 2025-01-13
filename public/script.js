// Declare global variables
let model; // Universal Sentence Encoder model
let dataset = []; // Dataset array
let datasetEmbeddings; // Array of embeddings with precomputed magnitudes
const TOP_N = 10; 

let currentPage = 1;
const RESULTS_PER_PAGE = 10;

document.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent triggering other event listeners
    });
});


const header = document.querySelector('.header'); 
let lastScrollPos = 0;

function handleScroll() {
    const currentScrollPos = window.scrollY;
    const scrollThreshold = 5; // Minimum scroll distance to trigger the behavior

    if (Math.abs(currentScrollPos - lastScrollPos) > scrollThreshold) {
        if (currentScrollPos > lastScrollPos) {
            header.classList.add('header-hidden'); //header will dissapear when scrolling down
        } else {
            header.classList.remove('header-hidden'); // header will reappear when scrolling up
        }
        lastScrollPos = currentScrollPos;
    }
}

// Toggle the header-hidden class on scroll or click
header.addEventListener('click', () => {
    if (header.classList.contains('header-hidden')) {
        header.classList.remove('header-hidden');
    }
});

window.addEventListener('scroll', handleScroll);

function displayPaginatedResults(scores) {
    console.log("Displaying paginated results for page:", currentPage);

    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "<h2>Results:</h2>";

    const topResults = scores.slice(0, 10); // First 10 results
    const remainingResults = scores.slice(10); // Results after the first 10

    let currentResults = [];
    let offset = 0; // Define offset to handle numbering

    if (currentPage === 1) {
        // Show the top 10 results on the first page
        currentResults = topResults;
        offset = 0; // No additional offset for the first page
    } else {
        // Show paginated results from the remaining scores
        const startIndex = (currentPage - 2) * RESULTS_PER_PAGE;
        const endIndex = startIndex + RESULTS_PER_PAGE;
        currentResults = remainingResults.slice(startIndex, endIndex);
        offset = 10 + (currentPage - 2) * RESULTS_PER_PAGE; // Offset starts after top 10
    }

    if (currentResults.length === 0) {
        resultsDiv.innerHTML += "<p>No relevant results found.</p>";
        return;
    }

    currentResults.forEach(({ index, similarity }, resultIndex) => {
        const originalItem = dataset[index];
        const title = originalItem.title || "No Title Available";
        const author = originalItem.creator || "Unknown Author";
        const link = originalItem.link || "#";

        // Create the card container
        const card = document.createElement("div");
        card.className = "result-card";

        // Add numbering
        const resultNumber = document.createElement("h3");
        resultNumber.textContent = `#${offset + resultIndex + 1}`;
        card.appendChild(resultNumber);

        // Add the title
        const cardTitle = document.createElement("h3");
        cardTitle.textContent = title;
        cardTitle.className = "title";
        card.appendChild(cardTitle);

        // Add the author
        const cardAuthor = document.createElement("p");
        cardAuthor.textContent = `Author: ${author}`;
        cardAuthor.className = "author";
        card.appendChild(cardAuthor);

        // Add the similarity score
        const similarityScore = document.createElement("p");
        similarityScore.textContent = `Similarity: ${similarity.toFixed(2)}`;
        similarityScore.className = "similarity";
        card.appendChild(similarityScore);

        // Add the link
        const cardLink = document.createElement("div");
        cardLink.className = "links";
        const linkElement = document.createElement("a");
        linkElement.href = link;
        linkElement.target = "_blank";

        // Shorten the displayed link text if it's too long
        const maxLength = 30; // Maximum length of the displayed link
        const shortenedLinkText = link.length > maxLength
            ? link.substring(0, maxLength - 3) + "..." // Add ellipsis for long links
            : link;

        linkElement.textContent = shortenedLinkText; // Display shortened text
        linkElement.title = link; // Show full URL on hover as a tooltip
        cardLink.appendChild(linkElement);
        card.appendChild(cardLink);

        // Add hidden metadata
        const additionalInfo = document.createElement("div");
        additionalInfo.className = "additional-info collapsed"; // Initially collapsed
        additionalInfo.style.maxHeight = "0px"; // Start with 0 height
        Object.keys(originalItem).forEach((key) => {
            const value = originalItem[key];
            if (value && key !== "title" && key !== "creator" && key !== "link") {
                const infoLine = document.createElement("p");
                infoLine.textContent = `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`;
                additionalInfo.appendChild(infoLine);
            }
        });
        card.appendChild(additionalInfo);

        // Add toggle functionality
        card.addEventListener("click", () => {
            if (additionalInfo.classList.contains("collapsed")) {
                additionalInfo.style.maxHeight = `${additionalInfo.scrollHeight}px`;
                additionalInfo.classList.remove("collapsed");
                additionalInfo.classList.add("expanded");
            } else {
                additionalInfo.style.maxHeight = "0px";
                additionalInfo.classList.remove("expanded");
                additionalInfo.classList.add("collapsed");
            }
        });

        // Append the card to the results container
        resultsDiv.appendChild(card);
    });

    updatePaginationControls(scores); // Update pagination controls
}
function updatePaginationControls(scores) {
    const paginationControls = document.getElementById("paginationControls");

    if (!paginationControls) {
        console.error("Pagination controls container not found in the DOM.");
        return;
    }
    console.log("Pagination controls container found. Updating controls...");

    const totalPages = Math.ceil((scores.length - 10) / RESULTS_PER_PAGE) + 1; // Total pages including top 10
    paginationControls.innerHTML = ""; // Clear previous controls

  // Create Previous Button
const prevButton = document.createElement("button");
prevButton.textContent = "Previous";

// Apply visually-hidden class if on the first page
if (currentPage === 1) {
    prevButton.classList.add("visually-hidden");
} else {
    prevButton.classList.remove("visually-hidden");
}

prevButton.disabled = currentPage === 1; // Disable on the first page
prevButton.onclick = () => {
    if (currentPage > 1) {
        currentPage--;
        displayPaginatedResults(scores);

        // Show the button again if not on the first page
        if (currentPage > 1) {
            prevButton.classList.remove("visually-hidden");
        }
    }
};
paginationControls.appendChild(prevButton);

// Create Next Button
const nextButton = document.createElement("button");
nextButton.textContent = "Next";
nextButton.disabled = currentPage >= totalPages; // Disable on the last page
nextButton.onclick = () => {
    if (currentPage < totalPages) {
        currentPage++;
        displayPaginatedResults(scores);

        // Add the visually-hidden class if reaching the last page
        if (currentPage >= totalPages) {
            nextButton.classList.add("visually-hidden");
        } else {
            nextButton.classList.remove("visually-hidden");
        }
    }
};
paginationControls.appendChild(nextButton);

    paginationControls.appendChild(nextButton);

    console.log("Pagination controls updated.");
}

// Fetch dataset from JSON file
async function fetchDataset() {
    console.log("Fetching dataset...");
    const response = await fetch("dataset.json"); 
    dataset = await response.json(); 
    console.log("Dataset fetched successfully!");
}
async function clearOldEmbeddings() {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction("embeddings", "readwrite");
        const store = transaction.objectStore("embeddings");
        const request = store.clear(); // Clears all old embeddings
        request.onsuccess = () => resolve();
        request.onerror = event => reject(event.target.error);
    });
}
// Displays the top N results based on similarity scores
function displayTopResults(scores) {
    const topScores = scores.slice(0, TOP_N); // Selects top N scores
    const resultsDiv = document.getElementById("results");
    resultsDiv.innerHTML = "<h2></h2>";

    if (topScores.length === 0) {
        resultsDiv.innerHTML += "<p>No relevant results found.</p>";
        return;
    }

    topScores.forEach(({ index, similarity }) => {
        const originalItem = dataset[index];
        const title = originalItem.title || "No Title Available";
        const author = originalItem.creator || "Unknown Author";
        const link = originalItem.link || "#";
    
        // Create the card container
        const card = document.createElement("div");
        card.className = "result-card";
    
        // Add the title
        const cardTitle = document.createElement("h3");
        cardTitle.textContent = title;
        cardTitle.className = "title";
        card.appendChild(cardTitle);
    
        // Add the author
        const cardAuthor = document.createElement("p");
        cardAuthor.textContent = `Author: ${author}`;
        cardAuthor.className = "author";
        card.appendChild(cardAuthor);
    
        // Add the similarity score
        const similarityScore = document.createElement("p");
        similarityScore.textContent = `Similarity: ${similarity.toFixed(2)}`;
        similarityScore.className = "similarity";
        card.appendChild(similarityScore);
    
        // Add the link
        const cardLink = document.createElement("div");
        cardLink.className = "links";
        const linkElement = document.createElement("a");
        linkElement.href = link;
        linkElement.target = "_blank";
    
        // Shorten the displayed link text if it's too long
        const maxLength = 30; // Maximum length of the displayed link
        const shortenedLinkText = link.length > maxLength
            ? link.substring(0, maxLength - 3) + "..." // Add ellipsis for long links
            : link;
    
        linkElement.textContent = shortenedLinkText; // Display shortened text
        linkElement.title = link; // Show full URL on hover as a tooltip
        cardLink.appendChild(linkElement);
        card.appendChild(cardLink);
    
        // Add hidden metadata
        const additionalInfo = document.createElement("div");
        additionalInfo.className = "additional-info collapsed"; // Initially collapsed
        additionalInfo.style.maxHeight = "0px"; // Start with 0 height
        Object.keys(originalItem).forEach((key) => {
            const value = originalItem[key];
            if (value && key !== "title" && key !== "creator" && key !== "link") {
                const infoLine = document.createElement("p");
                infoLine.textContent = `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`;
                additionalInfo.appendChild(infoLine);
            }
        });
        card.appendChild(additionalInfo);
    
        // Add toggle functionality
        card.addEventListener("click", () => {
            if (additionalInfo.classList.contains("collapsed")) {
                additionalInfo.style.maxHeight = `${additionalInfo.scrollHeight}px`;
                additionalInfo.classList.remove("collapsed");
                additionalInfo.classList.add("expanded");
            } else {
                additionalInfo.style.maxHeight = "0px";
                additionalInfo.classList.remove("expanded");
                additionalInfo.classList.add("collapsed");
            }
        });
    
        // Append the card to the results container
        resultsDiv.appendChild(card);
    });
    
}


// Encode the dataset into embeddings with magnitudes
async function encodeDataset() {
    console.log("Encoding dataset...");

// Combine relevant fields into a single string for embedding
const contents = dataset
.map(item => {
    const metadata = [
        item.title || "",             
        (item.keywords || []).join(" "), 
        item.creator || "",           
        item.content || "",           
        item.description || ""        
    ];
    return metadata.join(" ").trim(); 
})
.filter(content => content !== ""); 

if (contents.length === 0) {
throw new Error("No valid content to encode in the dataset.");
}

datasetEmbeddings = [];
const batchSize = 100; // Process in batches for large datasets

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
    saveHistory(query); // Save the search query to history
    console.log(`Searching for: ${query}`);
    const queryEmbedding = (await model.embed([query])).arraySync()[0]; // Embed query

    // Calculate similarity scores
    const scores = datasetEmbeddings.map((embeddingObj, index) => ({
        index,
        similarity: cosineSimilarity(queryEmbedding, embeddingObj),
    }));

    scores.sort((a, b) => b.similarity - a.similarity); // Sort by similarity

    currentPage = 1; // Reset to the first page
    //displayTopResults(scores); // Display top results
    displayPaginatedResults(scores);
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


document.addEventListener('DOMContentLoaded', () => {
    const toggleThemeButton = document.getElementById('toggleThemeButton');
    toggleThemeButton.addEventListener('click', () => {
        const isDarkMode = document.body.classList.toggle('dark-mode');
        const cards = document.querySelectorAll('.result-card');

        // Toggle dark mode class for all result cards
        cards.forEach((card) => {
            if (isDarkMode) {
                card.classList.add('dark-mode');
            } else {
                card.classList.remove('dark-mode');
            }
        });

        // Update button text
        toggleThemeButton.textContent = isDarkMode
            ? 'Switch to Light Mode'
            : 'Switch to Dark Mode';
    });
});




const mainElement = document.querySelector('main');
const resultsSection = document.getElementById('results-section');

// Observe changes to the #results-section
const observer = new MutationObserver(() => {
    // Add the "expanded" class to the main element
    if (!mainElement.classList.contains('expanded')) {
        mainElement.classList.add('expanded');
    }
});

// Start observing the results section for changes
observer.observe(resultsSection, { childList: true, subtree: true });



const historyButton = document.getElementById('historyButton');
const historyDropdown = document.getElementById('historyDropdown');
const historyList = document.getElementById('historyList');
const clearHistoryButton = document.getElementById('clearHistoryButton');

// Load search history from localStorage
let searchHistory = JSON.parse(localStorage.getItem('searchHistory')) || [];


function toggleHistoryButton() {
    const historyButton = document.getElementById('historyButton');
    if (searchHistory.length > 0) {
        historyButton.style.display = 'block'; // Show the button if history exists
    } else {
        historyButton.style.display = 'none'; // Hide the button if no history
    }
}


function renderHistory() {
    historyList.innerHTML = ''; // Clear existing list

    // Populate the list with search history
    if (searchHistory.length > 0) {
        searchHistory.forEach((query) => {
            const li = document.createElement('li');
            li.textContent = query;
            li.addEventListener('click', () => {
                document.getElementById('searchQuery').value = query; // Populate search box
                document.getElementById('searchButton').click(); // Trigger search
            });
            historyList.appendChild(li);
        });
        clearHistoryButton.style.display = 'block'; // Show the "Clear History" button
    } else {
        clearHistoryButton.style.display = 'none'; // Hide the "Clear History" button if no history
    }

    toggleHistoryButton(); // Ensure "Search History" button visibility is updated
}




historyButton.addEventListener('click', () => {
    if (historyDropdown.classList.contains('visible')) {
        // Hide the dropdown
        historyDropdown.classList.remove('visible');
        setTimeout(() => {
            historyDropdown.style.display = 'none'; // Fully hide after animation
        }, 300); // Match the CSS transition duration
    } else {
        // Show the dropdown
        historyDropdown.style.display = 'flex'; // Make dropdown visible
        setTimeout(() => {
            historyDropdown.classList.add('visible'); // Trigger slide-in animation
        }, 10); // Small delay to ensure display is applied
        renderHistory(); // Render history list when opening
    }
});


clearHistoryButton.addEventListener('click', () => {
    searchHistory = []; // Clear the history array
    localStorage.removeItem('searchHistory'); // Clear from localStorage
    renderHistory(); // Update the dropdown
    historyDropdown.classList.remove('visible'); // Hide the dropdown
});


function saveHistory(query) {
    if (query && !searchHistory.includes(query)) {
        searchHistory.unshift(query); // Add to the beginning of the array
        if (searchHistory.length > 10) {
            searchHistory.pop(); // Limit to the last 10 searches
        }
        localStorage.setItem('searchHistory', JSON.stringify(searchHistory)); // Save to localStorage

        renderHistory(); // Update the dropdown list
        toggleHistoryButton(); // Ensure the "Search History" button is updated
    }
}


document.addEventListener('DOMContentLoaded', () => {
    renderHistory(); // Render the initial history dropdown
    toggleHistoryButton(); // Ensure the "Search History" button is shown/hidden
});




// Initialize application on page load
(async function initialize() {
    try {
/*         await clearOldEmbeddings() */
        await loadModelAndPrepareDataset(); // Load model and prepare dataset
    } catch (error) {
        console.error("Error initializing application:", error.message);
        alert("Failed to initialize application. Check the console for more details.");
    }
})();