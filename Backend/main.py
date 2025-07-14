import os
import sys
import io
import cv2
import numpy as np
import torch
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import base64

# === Ensure EfficientViT repo is in the Python path ===
sys.path.append(os.path.join(os.getcwd(), "efficientvit"))
from efficientvit.models.efficientvit.sam import efficientvit_sam_xl1, EfficientViTSamAutomaticMaskGenerator

app = FastAPI()

# === Enable CORS for all origins (adjust for production) ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Load EfficientViT-SAM XL1 model at startup ===
checkpoint_path = "efficientvit_sam_xl1.pt"  # Ensure this path is correct
model = efficientvit_sam_xl1(image_size=1024)
model.load_state_dict(torch.load(checkpoint_path, map_location="cpu"))
model.eval()
if torch.cuda.is_available():
    model = model.cuda()
print("Using device:", next(model.parameters()).device)

# === Create the automatic mask generator with Colab-matching parameters ===
mask_generator = EfficientViTSamAutomaticMaskGenerator(
    model,
    points_per_side=20,              # Finer masks, matches Colab
    pred_iou_thresh=0.75,
    stability_score_thresh=0.75,
    min_mask_region_area=1000,
)

# === Image resizing identical to Colab ===
def resize_image(image, max_dim=1024):
    h, w = image.shape[:2]
    scale = max_dim / max(h, w)
    if scale < 1.0:
        image = cv2.resize(image, (int(w * scale), int(h * scale)))
    return image

# === Utility: Convert image (RGB np.array) to base64 PNG ===
def image_to_base64(image_rgb):
    pil_img = Image.fromarray(image_rgb)
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode("utf-8")

@app.post("/segment")
async def segment_image(file: UploadFile = File(...)):
    try:
        # Read and decode image
        contents = await file.read()
        npimg = np.frombuffer(contents, np.uint8)
        image_bgr = cv2.imdecode(npimg, cv2.IMREAD_COLOR)
        if image_bgr is None:
            return JSONResponse(status_code=400, content={"error": "Invalid image file."})

        # Convert to RGB and resize (Colab logic)
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        image_rgb = resize_image(image_rgb, max_dim=1024)

        # Generate masks
        masks = mask_generator.generate(image_rgb)

        # Overlay visualization
        overlay = image_rgb.copy().astype(np.uint8)
        mask_arrays = []
        for mask in masks:
            segmentation = mask['segmentation']
            color = np.random.randint(0, 255, (3,), dtype=np.uint8)
            color_mask = np.zeros_like(image_rgb, dtype=np.uint8)
            for i in range(3):
                color_mask[:, :, i] = color[i]
            overlay = np.where(segmentation[:, :, None],
                               (0.6 * overlay + 0.4 * color_mask).astype(np.uint8),
                               overlay)
            mask_arrays.append(segmentation.astype(np.uint8).tolist())

        original_b64 = image_to_base64(image_rgb)
        overlay_b64 = image_to_base64(overlay)

        return {
            "original_image": original_b64,
            "segmented_overlay": overlay_b64,
            "masks": mask_arrays,
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
