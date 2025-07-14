import React from "react";
import { useLocation } from "react-router-dom";
import "./Review.css";

const Review = () => {
  const location = useLocation();
  const originalImage = location.state?.originalImage;
  const editedImage = location.state?.editedImage;

  const handleDownload = () => {
    if (!editedImage) return;
    const link = document.createElement("a");
    link.href = editedImage;
    link.download = "colored-room.png";
    link.click();
  };

  if (!originalImage || !editedImage) {
    return (
      <div className="review-container">
        <p className="review-warning">
          No image to review. Please go back and upload one.
        </p>
      </div>
    );
  }

  return (
    <div className="review-container">
      <h2 className="review-title">Compare Your Design</h2>
      <div className="review-images-row">
        <div className="review-image-block">
          <div className="review-image-label">Original</div>
          <img
            src={`data:image/png;base64,${originalImage}`}
            alt="Original Room"
            className="review-image"
          />
        </div>
        <div className="review-image-block">
          <div className="review-image-label">Recoloured</div>
          <img
            src={editedImage}
            alt="Recoloured Room"
            className="review-image"
          />
        </div>
      </div>
      <div className="review-buttons">
        <button className="download-button" onClick={handleDownload}>
          Download Image
        </button>
      </div>
    </div>
  );
};

export default Review;
