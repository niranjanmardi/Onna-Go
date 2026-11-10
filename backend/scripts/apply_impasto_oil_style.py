"""
ONNA-GO — High-Fidelity Impasto Oil Painting Shader Pipeline
Translates source artwork into authentic traditional impressionist oil paintings
matching the Howrah Bridge master reference:
- Vectorized Multi-Sector Kuwahara Filter (painterly brush dabs)
- 3D Surface Normal Relief & Directional Shading (thick palette-knife paint ridges)
- Stretched Canvas Linen Weave Texture Overlay
- Impressionist Pigment Vibrancy & Chromatic Warmth Tuning
"""

import os
import sys
import numpy as np
from PIL import Image, ImageFilter, ImageEnhance
from scipy.ndimage import uniform_filter

def kuwahara_filter(image_np, radius=5):
    """
    Vectorized Kuwahara filter for oil-painting painterly grouping.
    Clusters pixels into expressive paint strokes with sharp stroke boundaries.
    """
    h, w, c = image_np.shape
    img_f = image_np.astype(np.float32) / 255.0
    
    # Grayscale for variance calculation
    gray = 0.299 * img_f[:, :, 0] + 0.587 * img_f[:, :, 1] + 0.114 * img_f[:, :, 2]
    
    win_size = radius + 1
    
    # 4 Quadrants offsets: top-left, top-right, bottom-left, bottom-right
    # Using uniform_filter for fast convolution
    # Calculate means and variances for each quadrant
    means = []
    variances = []
    
    # Define the 4 subwindows by shifting
    shifts = [
        (-radius // 2, -radius // 2),
        (-radius // 2, radius // 2),
        (radius // 2, -radius // 2),
        (radius // 2, radius // 2)
    ]
    
    for dy, dx in shifts:
        # Shifted grayscale
        shifted_gray = np.roll(np.roll(gray, dy, axis=0), dx, axis=1)
        mean_gray = uniform_filter(shifted_gray, size=win_size)
        sq_mean_gray = uniform_filter(shifted_gray**2, size=win_size)
        var_gray = sq_mean_gray - mean_gray**2
        var_gray = np.maximum(var_gray, 0)
        
        # Shifted RGB means
        mean_rgb = np.zeros_like(img_f)
        for ch in range(c):
            shifted_ch = np.roll(np.roll(img_f[:, :, ch], dy, axis=0), dx, axis=1)
            mean_rgb[:, :, ch] = uniform_filter(shifted_ch, size=win_size)
            
        means.append(mean_rgb)
        variances.append(var_gray)
        
    variances = np.stack(variances, axis=-1) # (H, W, 4)
    means = np.stack(means, axis=-1)         # (H, W, C, 4)
    
    # Find quadrant with minimum variance
    min_var_idx = np.argmin(variances, axis=-1) # (H, W)
    
    # Select corresponding mean RGB
    out = np.zeros_like(img_f)
    for ch in range(c):
        out[:, :, ch] = np.take_along_axis(means[:, :, ch, :], min_var_idx[:, :, np.newaxis], axis=-1).squeeze(-1)
        
    return out

def apply_impasto_relief(painted_f, relief_strength=1.8):
    """
    Computes 3D surface height normals from brushstroke contours,
    applying directional lighting (upper-left light) to simulate
    thick oil paint ridges (impasto) catching light.
    """
    h, w, _ = painted_f.shape
    gray = 0.299 * painted_f[:, :, 0] + 0.587 * painted_f[:, :, 1] + 0.114 * painted_f[:, :, 2]
    
    # Gradients for surface height map
    gy, gx = np.gradient(gray)
    
    # Normal vectors: (-gx * scale, -gy * scale, 1.0)
    scale = relief_strength
    nx = -gx * scale
    ny = -gy * scale
    nz = np.ones((h, w), dtype=np.float32)
    
    norm = np.sqrt(nx**2 + ny**2 + nz**2)
    nx /= norm
    ny /= norm
    nz /= norm
    
    # Directional light source from top-left (classic art studio gallery lighting)
    lx, ly, lz = -0.45, -0.65, 0.70
    l_norm = np.sqrt(lx**2 + ly**2 + lz**2)
    lx, ly, lz = lx / l_norm, ly / l_norm, lz / l_norm
    
    # Diffuse lighting component
    diffuse = nx * lx + ny * ly + nz * lz
    diffuse = np.clip(diffuse, 0.0, 1.0)
    
    # Specular sheen on oil ridges (Blinn-Phong)
    # View vector is straight on (0, 0, 1)
    hx, hy, hz = lx, ly, lz + 1.0
    h_norm = np.sqrt(hx**2 + hy**2 + hz**2)
    hx, hy, hz = hx / h_norm, hy / h_norm, hz / h_norm
    
    specular = np.clip(nx * hx + ny * hy + nz * hz, 0.0, 1.0) ** 14.0
    
    # Modulate color
    lighting = 0.82 + 0.26 * diffuse + 0.18 * specular
    lighting = np.clip(lighting[:, :, np.newaxis], 0.70, 1.35)
    
    shaded = np.clip(painted_f * lighting, 0.0, 1.0)
    return shaded

def apply_canvas_texture(image_f, strength=0.035):
    """
    Generates a tactile fine-linen stretched canvas weave pattern.
    """
    h, w, c = image_f.shape
    y = np.arange(h)
    x = np.arange(w)
    xx, yy = np.meshgrid(x, y)
    
    # High frequency orthogonal weave
    freq = 0.85
    weave = np.sin(xx * freq) * np.sin(yy * freq)
    weave = weave[:, :, np.newaxis]
    
    out = np.clip(image_f * (1.0 + strength * weave), 0.0, 1.0)
    return out

def transform_to_impressionist_oil(src_path, dst_path, thumb_path=None, warm_boost=1.10):
    """
    Transforms any source image into a gallery-grade traditional impressionist oil painting.
    """
    print(f"Transforming: {os.path.basename(src_path)}...")
    img = Image.open(src_path).convert('RGB')
    
    # Standard 9:16 target resolution
    TARGET_W, TARGET_H = 768, 1376
    img_resized = img.resize((TARGET_W, TARGET_H), Image.Resampling.LANCZOS)
    
    # 1. Subtle preliminary painterly blur to melt harsh photo artifacts
    pre_smooth = img_resized.filter(ImageFilter.GaussianBlur(radius=1.2))
    img_np = np.array(pre_smooth)
    
    # 2. Multi-sector Kuwahara filter for expressive thick brush strokes
    painted = kuwahara_filter(img_np, radius=6)
    
    # Second pass with radius 3 for layered micro-texture
    painted = kuwahara_filter((painted * 255).astype(np.uint8), radius=3)
    
    # 3. Impasto height-field relief lighting (thick paint ridges)
    impasto = apply_impasto_relief(painted, relief_strength=2.2)
    
    # 4. Canvas linen weave texture
    with_canvas = apply_canvas_texture(impasto, strength=0.04)
    
    # Convert back to PIL Image
    result_img = Image.fromarray((with_canvas * 255).astype(np.uint8))
    
    # 5. Chromatic warmth & oil pigment vibrance tuning
    # Enhance color saturation like rich oil pigments
    enhancer_col = ImageEnhance.Color(result_img)
    result_img = enhancer_col.enhance(1.22)
    
    # Subtle contrast curve matching impressionist oil paintings
    enhancer_con = ImageEnhance.Contrast(result_img)
    result_img = enhancer_con.enhance(1.08)
    
    # Subtle sharpness to make brush boundaries crisp
    result_img = result_img.filter(ImageFilter.UnsharpMask(radius=2, percent=120, threshold=3))
    
    # Save full resolution WebP
    os.makedirs(os.path.dirname(dst_path), exist_ok=True)
    result_img.save(dst_path, 'WEBP', quality=92, method=6)
    
    # Save thumbnail if requested
    if thumb_path:
        os.makedirs(os.path.dirname(thumb_path), exist_ok=True)
        thumb = result_img.resize((400, 716), Image.Resampling.LANCZOS)
        thumb.save(thumb_path, 'WEBP', quality=88, method=6)
        
    print(f"Saved: {dst_path}")

if __name__ == '__main__':
    print("Impasto Oil Shader ready.")

