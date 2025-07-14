import React, { useRef, useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./Editor.css";

function Editor() {
  const location = useLocation();
  const data = location.state;
  const canvasRef = useRef(null);
  const offscreenRef = useRef(null);
  const navigate = useNavigate();

  const [selectedRegion, setSelectedRegion] = useState(0);
  const [hoveredRegion, setHoveredRegion] = useState(null);
  const [selectedColor, setSelectedColor] = useState("#ff0000");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]); // For undo
  const [showHighlight, setShowHighlight] = useState(true); // Control highlight visibility

  // --- Color conversion helpers ---
  const hexToRgb = (hex) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
        default: h = 0;
      }
      h /= 6;
    }
    return [h, s, l];
  }

  function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }
  // --- End color helpers ---

  // Draw blue diagonal lines overlay for the selected region
  function drawRegionHighlight(ctx, mask, overlayColor = "rgba(30,144,255,0.18)", lineColor = "rgba(30,144,255,0.65)", spacing = 10) {
    const height = mask.length;
    const width = mask[0].length;
    ctx.save();

    // Draw semi-transparent overlay for the region
    ctx.fillStyle = overlayColor;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y][x] === 1) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    // Draw diagonal lines over the region
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1;
    for (let d = -height; d < width; d += spacing) {
      ctx.beginPath();
      let started = false;
      for (let y = 0; y < height; y++) {
        let x = d + y;
        if (x >= 0 && x < width && mask[y][x] === 1) {
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        } else {
          if (started) {
            ctx.stroke();
            ctx.beginPath();
            started = false;
          }
        }
      }
      if (started) ctx.stroke();
    }
    ctx.restore();
  }

  // Redraw canvas with current image and highlight if needed
  const redrawCanvas = useCallback(() => {
  if (!canvasRef.current || !offscreenRef.current) return;
  const canvas = canvasRef.current;
  const ctx = canvas.getContext("2d");
  const offscreen = offscreenRef.current;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(offscreen, 0, 0);

  // Highlight hovered region if any, else selected region
  if (showHighlight && data.masks) {
    const regionToHighlight = hoveredRegion !== null ? hoveredRegion : selectedRegion;
    if (data.masks[regionToHighlight]) {
      drawRegionHighlight(ctx, data.masks[regionToHighlight]);
      }
    }
  }, [data, selectedRegion, hoveredRegion, showHighlight]);

  useEffect(() => {
    setIsLoading(true);
    setError("");
    if (!data?.originalImage || !canvasRef.current) {
      setIsLoading(false);
      setError("No image data received. Please go back and upload an image.");
      return;
    }
    const img = new window.Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      if (!offscreenRef.current) {
        offscreenRef.current = document.createElement("canvas");
      }
      const offscreen = offscreenRef.current;
      offscreen.width = img.width;
      offscreen.height = img.height;
      offscreen.getContext("2d").drawImage(img, 0, 0);

      setHistory([offscreen.toDataURL()]);
      setIsLoading(false);
      setShowHighlight(true); // Show highlight on initial load
      redrawCanvas();
    };
    img.onerror = () => {
      setIsLoading(false);
      setError("Failed to load image.");
    };
    img.src = `data:image/png;base64,${data.originalImage}`;
    // eslint-disable-next-line
  }, [data]);

  // Redraw highlight whenever region, history, or highlight state changes
  useEffect(() => {
    redrawCanvas();
  }, [selectedRegion, history, showHighlight, redrawCanvas]);

  // Select region by clicking
  const handleCanvasClick = (e) => {
    if (!data?.masks || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    for (let i = 0; i < data.masks.length; i++) {
      const mask = data.masks[i];
      if (
        mask &&
        mask.length === canvas.height &&
        mask[0].length === canvas.width &&
        mask[y][x] === 1
      ) {
        setSelectedRegion(i);
        setShowHighlight(true); // Show highlight on region select
        return;
      }
    }
  };

  // Apply color using HSL blending for realism
  const applyColor = useCallback(() => {
    if (!data?.masks || !canvasRef.current || !offscreenRef.current) {
      setError("Segmentation masks are missing or invalid.");
      return;
    }
    setHistory(prev => [...prev, offscreenRef.current.toDataURL()]);
    const mask = data.masks[selectedRegion];
    const offscreen = offscreenRef.current;
    const ctx = offscreen.getContext("2d");
    const { width, height } = offscreen;
    const rgb = hexToRgb(selectedColor);

    if (!mask || mask.length !== height || mask[0].length !== width) {
      setError("Segmentation mask shape does not match image dimensions.");
      return;
    }

    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    const [targetH, targetS] = rgbToHsl(rgb.r, rgb.g, rgb.b);
    const strength = 0.7; // 1 = full color, 0 = no color, try 0.6–0.8 for realism

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y][x] === 1) {
          const idx = (y * width + x) * 4;
          const [, , l] = rgbToHsl(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
          // Blend saturation for strength control
          const newS = strength * targetS;
          const [r, g, b] = hslToRgb(targetH, newS, l);
          pixels[idx] = r;
          pixels[idx + 1] = g;
          pixels[idx + 2] = b;
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Copy to visible canvas and remove highlight
    const visible = canvasRef.current;
    const vctx = visible.getContext("2d");
    vctx.clearRect(0, 0, width, height);
    vctx.drawImage(offscreen, 0, 0);
    setShowHighlight(false); // Remove highlight after applying color
    setError("");
  }, [data, selectedRegion, selectedColor]);

  // Undo last color change
  const undo = () => {
    if (history.length <= 1) return; // Nothing to undo
    const offscreen = offscreenRef.current;
    const ctx = offscreen.getContext("2d");
    const newHistory = [...history];
    newHistory.pop(); // Remove current state
    const lastState = newHistory[newHistory.length - 1];
    const img = new window.Image();
    img.onload = () => {
      ctx.clearRect(0, 0, offscreen.width, offscreen.height);
      ctx.drawImage(img, 0, 0);
      // Update visible canvas and redraw highlight (if enabled)
      const visible = canvasRef.current;
      const vctx = visible.getContext("2d");
      vctx.clearRect(0, 0, offscreen.width, offscreen.height);
      vctx.drawImage(offscreen, 0, 0);
      if (showHighlight && data.masks && data.masks[selectedRegion]) {
        drawRegionHighlight(vctx, data.masks[selectedRegion]);
      }
      setHistory(newHistory);
    };
    img.src = lastState;
  };

  // Reset to original image
  const reset = () => {
    if (!offscreenRef.current) return;
    const offscreen = offscreenRef.current;
    const ctx = offscreen.getContext("2d");
    const img = new window.Image();
    img.onload = () => {
      ctx.clearRect(0, 0, offscreen.width, offscreen.height);
      ctx.drawImage(img, 0, 0);
      // Update visible canvas and redraw highlight (if enabled)
      const visible = canvasRef.current;
      const vctx = visible.getContext("2d");
      vctx.clearRect(0, 0, offscreen.width, offscreen.height);
      vctx.drawImage(offscreen, 0, 0);
      if (showHighlight && data.masks && data.masks[selectedRegion]) {
        drawRegionHighlight(vctx, data.masks[selectedRegion]);
      }
      setHistory([offscreen.toDataURL()]);
    };
    img.src = `data:image/png;base64,${data.originalImage}`;
  };

  //hover highlight
  const handleCanvasMouseMove = (e) => {
  if (!data?.masks || !canvasRef.current) return;
  const canvas = canvasRef.current;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = Math.floor((e.clientX - rect.left) * scaleX);
  const y = Math.floor((e.clientY - rect.top) * scaleY);

  let found = null;
  for (let i = 0; i < data.masks.length; i++) {
    const mask = data.masks[i];
    if (
      mask &&
      mask.length === canvas.height &&
      mask[0].length === canvas.width &&
      y >= 0 && y < mask.length &&
      x >= 0 && x < mask[0].length &&
      mask[y][x] === 1
    ) {
      found = i;
      break;
    }
  }
  setHoveredRegion(found);
};



  // Go to review page with the edited image
  const goToReview = () => {
    if (offscreenRef.current) {
      const reviewImage = offscreenRef.current.toDataURL("image/png");
      navigate("/review", {
        state: {
          ...data,
          originalImage: data.originalImage,
          editedImage: reviewImage,
        },
      });
    }
  };

  if (error) {
    return <div className="loading">{error}</div>;
  }

  if (!data || !data.originalImage) {
    return (
      <div className="loading">
        No image data received. Please go back and upload an image.
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="editor-left">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => setHoveredRegion(null)}
          className="room-canvas"
          aria-label="Room editor canvas"
          style={{
            display: isLoading ? "none" : "block",
            border: "1px solid #ccc",
            background: "#f8f8f8",
          }}
        />
        {isLoading && <div className="loading-overlay">Loading image...</div>}
      </div>
      <div className="editor-right">
        <h2>Home Visualizer</h2>
        <p>
          Click a region, pick a color, and visualize.
        </p>
        <div className="color-controls">
          <label>
            Select Color:
            <input
              type="color"
              value={selectedColor}
              onChange={(e) => setSelectedColor(e.target.value)}
            />
          </label>
        </div>
        <div className="action-buttons">
          <button onClick={applyColor}>Apply Color</button>
          <button onClick={undo} disabled={history.length <= 1} style={{ marginLeft: "10px" }}>
            Undo
          </button>
          <button onClick={reset} style={{ marginLeft: "10px" }}>
            Reset
          </button>
        </div>
        <button className="go-to-review-button" onClick={goToReview}>
          Go to Review
        </button>
      </div>
    </div>
  );
}

export default Editor;
