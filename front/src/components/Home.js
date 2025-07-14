import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Home.css";

const API_URL = "http://localhost:8000/segment"; // Update if your endpoint changes

const Home = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Clean up object URL on unmount
    return () => {
      
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);
  useEffect(() => {
  let interval;
  if (isLoading) {
    setProgress(1);
    interval = setInterval(() => {
      setProgress((old) => (old < 99 ? old + 1 : old));
    }, 800); // 600ms per percent, 1% to 90% in ~54s
  } else {
    setProgress(100); // Jump to 100% when loading finishes
    setTimeout(() => setProgress(0), 500); // Optional: reset after short delay
  }
  return () => clearInterval(interval);
}, [isLoading]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Please select an image smaller than 5MB.");
      return;
    }
    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleContinue = async () => {
    if (!selectedImage) {
      alert("Please upload an image first.");
      return;
    }
    setIsLoading(true);

    const formData = new FormData();
    formData.append("file", selectedImage);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }
      const data = await response.json();

      if (!data.segmented_overlay) {
        throw new Error("Backend did not return segmentation data.");
      }

      navigate("/editor", {
        state: {
          originalImage: data.original_image,
          segmentedOverlay: data.segmented_overlay,
          masks: data.masks, // array of mask data, if provided
        },
      });
    } catch (error) {
      alert(`Error: ${error.message}`);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="home-container">
      {isLoading && (
        <div className="loading-overlay">
          <div className="progress-bar">
            <div
              className="progress-bar-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="loading-text">Processing image... {progress}%</div>
        </div>
      )}
      <h1 className="home-title">Select a Room Image to Start Painting</h1>
      <div className="upload-section">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="upload-input"
          ref={fileInputRef}
          aria-label="Upload room image"
          disabled={isLoading}
        />
        {previewUrl && (
          <div className="preview-image">
            <img src={previewUrl} alt="Preview" />
          </div>
        )}
        <button
          className="continue-button"
          onClick={handleContinue}
          disabled={isLoading || !selectedImage}
          aria-label="Continue to editor"
        >
          {isLoading ? "Processing..." : "Continue"}
        </button>
      </div>
    </div>
  );
};

export default Home;
