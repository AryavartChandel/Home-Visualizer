# Home Visualizer

A full-stack application for interactive room image segmentation and color editing, powered by **EfficientViT-SAM** and **FastAPI** on the backend, and a **React** frontend. Upload a room photo, segment it into regions using state-of-the-art vision models, and experiment with virtual painting in your browser.

---

## Features

- Automatic Room Segmentation: Uses EfficientViT-SAM XL1 for fast, high-quality segmentation.
- Interactive Editor: Select, highlight, and recolor segmented regions with real-time feedback.
- Undo/Redo & Reset: Flexible editing with history support.
- Progress Bar & Loading Feedback: User-friendly simulated progress bar during backend processing.
- Modern Tech Stack: FastAPI backend, React frontend, and GPU-accelerated inference (if available).

---

## Project Structure

project-root/
├── backend/ # FastAPI backend (main.py, requirements.txt)
├   ├── requirements.txt # Python dependencies
├   ├── efficientvit/ # Cloned EfficientViT repo
├   ├── efficientvit_sam_xl1.pt # Model checkpoint
├
├── frontend/ # React app (src/, public/, etc.)
└── README.md # This file


---

## Getting Started

### 1. Clone the Repository

- git clone https://github.com/AryavartChandel/Home Visualizer/
- cd Home Visualizer

### 2. Clone EfficientViT Repository

- git clone https://github.com/mit-han-lab/efficientvit.git

### 3. Download the Model Checkpoint

- wget https://huggingface.co/mit-han-lab/efficientvit-sam/resolve/main/efficientvit_sam_xl1.pt -O efficientvit_sam_xl1.pt  
- Place the downloaded `efficientvit_sam_xl1.pt` file in your project root.

### 4. Install Python Dependencies

It is recommended to use a virtual environment:

- python -m venv venv
- Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
- Activate it:  
  - On macOS/Linux: `source venv/bin/activate`  
  - On Windows: `.\venv\Scripts\activate`
- pip install -r requirements.txt

### 5. Start the Backend

From the project root (where `main.py` is located):

- uvicorn main:app --reload --host 0.0.0.0 --port 8000  
- Backend will be available at: http://localhost:8000/segment

---

### 6. Start the Frontend

- cd frontend  
- npm install  
- npm start  
- Frontend will be available at: http://localhost:3000

---

## Usage

1. Open the frontend in your browser.
2. Upload a room image (JPG/PNG, under 5MB).
3. Wait for segmentation (a progress bar will appear).
4. In the editor, click on regions to highlight and recolor them.
5. Use Save, Undo, or Reset as needed.

---

## Deployment Notes

- GPU Acceleration: For fast segmentation, run the backend on a machine with an NVIDIA CUDA-compatible GPU. CPU-only systems will work but are slower.
- Production:
  - Restrict CORS origins
  - Set file size limits
  - Secure API endpoints
- Cloud Hosting: Deploy the backend on a GPU-enabled instance (AWS EC2, GCP, Azure, etc.) to support multiple users.

---

## Troubleshooting

- Slow Processing: If the backend is slow, it may be running on CPU instead of GPU.
- Missing Dependencies: Ensure all Python and Node.js dependencies are installed.
- Model/Repo Not Found: Make sure `efficientvit/` and `efficientvit_sam_xl1.pt` exist in the correct location.
- Frontend Cannot Reach Backend: Confirm that the backend is running and CORS is enabled properly.

---

## License

This project is for **educational and research purposes**.  
Please check the licenses of:

- EfficientViT by MIT HAN Lab
- Segment Anything by Meta AI
- FastAPI, React, and other dependencies

for their respective terms.

---

## Acknowledgements

- EfficientViT by MIT HAN Lab  
- Segment Anything by Meta AI  
- FastAPI  
- React

---

## Happy Virtual Painting!


