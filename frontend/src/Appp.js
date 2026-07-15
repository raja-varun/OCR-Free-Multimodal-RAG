import React, { useState } from "react";
import axios from "axios";

function App() {

  const [file, setFile] = useState(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // -----------------------------
  // Upload PDF
  // -----------------------------
  const uploadPDF = async () => {

    if (!file) {
      alert("Choose a PDF first");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    try {

      const res = await axios.post(
        "http://127.0.0.1:8000/upload",
        formData
      );

      alert(res.data.message);

    } catch (err) {

      console.error(err);
      alert("Upload failed");

    }

    setLoading(false);
  };

  // -----------------------------
  // Search
  // -----------------------------
  const searchPDF = async () => {

    if (!query) return;

    setLoading(true);

    try {

      const res = await axios.get(
        `http://127.0.0.1:8000/search?query=${query}`
      );

      setResults(res.data.results);

    } catch (err) {

      console.error(err);
      alert("Search failed");

    }

    setLoading(false);
  };

  return (
    <div style={{ padding: "30px", fontFamily: "Arial" }}>

      <h1>🔥 Multimodal PDF Search</h1>

      {/* Upload */}
      <div style={{ marginBottom: "20px" }}>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
        />

        <button onClick={uploadPDF}>
          Upload PDF
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: "20px" }}>

        <input
          type="text"
          placeholder="Enter search query..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "300px",
            padding: "8px"
          }}
        />

        <button onClick={searchPDF}>
          Search
        </button>

      </div>

      {/* Loading */}
      {loading && <p>⏳ Processing...</p>}

      {/* Results */}
      <div>

        {results.map((r, idx) => (

          <div
            key={idx}
            style={{
              border: "1px solid gray",
              marginBottom: "20px",
              padding: "10px"
            }}
          >

            <h3>Page {r.page}</h3>

            <p>Score: {r.score}</p>

            <img
              src={r.image_url}
              alt="result"
              width="400"
            />

          </div>

        ))}

      </div>

    </div>
  );
}

export default App;