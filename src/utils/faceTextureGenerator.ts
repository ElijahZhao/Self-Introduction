import * as THREE from 'three';

/**
 * Generates an ultra-high-resolution 2048x2048 canvas texture for an anime chibi/Nendoroid face.
 * Features:
 * - Gradient hazel-brown anime irises with depth, star highlights, and specular catchlights
 * - Elegant anime upper eyelid crease & tapered eyelashes
 * - Soft airbrushed peach-pink blush on chubby cheeks
 * - Delicate button nose and subtle smiling lips
 */
export function createAnimeFaceTexture(): THREE.CanvasTexture {
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    const fallbackTexture = new THREE.CanvasTexture(canvas);
    return fallbackTexture;
  }

  // 1. Soft porcelain/clay skin background with warm peach undertone
  ctx.fillStyle = '#ffede3';
  ctx.fillRect(0, 0, size, size);

  // Subtle radial gradient to simulate cheek softness and depth
  const skinGrad = ctx.createRadialGradient(
    size / 2, size * 0.48, size * 0.1,
    size / 2, size * 0.5, size * 0.6
  );
  skinGrad.addColorStop(0, '#fff3eb');
  skinGrad.addColorStop(0.65, '#ffede3');
  skinGrad.addColorStop(1, '#fde2d4');
  ctx.fillStyle = skinGrad;
  ctx.fillRect(0, 0, size, size);

  // 2. Airbrushed Rosy Peach Blush on Chubby Cheeks
  const drawBlush = (cx: number, cy: number) => {
    ctx.save();
    const blushGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 160);
    blushGrad.addColorStop(0, 'rgba(255, 128, 150, 0.48)');
    blushGrad.addColorStop(0.45, 'rgba(255, 150, 170, 0.28)');
    blushGrad.addColorStop(0.8, 'rgba(255, 180, 195, 0.1)');
    blushGrad.addColorStop(1, 'rgba(255, 180, 195, 0)');
    ctx.fillStyle = blushGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 160, 95, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cute tiny cheek highlights
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(cx - 35, cy - 20, 14, 8, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawBlush(size * 0.28, size * 0.56);
  drawBlush(size * 0.72, size * 0.56);

  // 3. Cute Tiny Button Nose
  ctx.save();
  ctx.fillStyle = '#df8f79';
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 0.53, 10, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  // Nose tip tiny highlight
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.arc(size * 0.5 - 2, size * 0.53 - 3, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 4. Delicate anime mouth with subtle smile and lower lip highlight
  ctx.save();
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#c45a4a';
  ctx.beginPath();
  // Soft curved smile arc
  ctx.arc(size * 0.5, size * 0.62, 54, 0.2 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();

  // Tiny corner smile dimples
  ctx.fillStyle = '#be5242';
  ctx.beginPath();
  ctx.arc(size * 0.5 - 46, size * 0.655, 6, 0, Math.PI * 2);
  ctx.arc(size * 0.5 + 46, size * 0.655, 6, 0, Math.PI * 2);
  ctx.fill();

  // Soft glossy lower lip reflection
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(size * 0.5, size * 0.672, 22, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 5. Detailed Anime Eyes
  const drawEye = (cx: number, cy: number, isLeft: boolean) => {
    ctx.save();
    const eyeWidth = 240;
    const eyeHeight = 310;

    // Eye White (Sclera) with soft top eyelid shadow
    ctx.beginPath();
    ctx.ellipse(cx, cy, eyeWidth * 0.5, eyeHeight * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Soft top shadow in sclera
    const scleraShadow = ctx.createLinearGradient(cx, cy - eyeHeight * 0.5, cx, cy);
    scleraShadow.addColorStop(0, 'rgba(215, 218, 230, 0.6)');
    scleraShadow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = scleraShadow;
    ctx.fill();

    // Clip to eye contour for iris
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, eyeWidth * 0.5, eyeHeight * 0.5, 0, 0, Math.PI * 2);
    ctx.clip();

    // Iris Oval
    const irisX = isLeft ? cx + 10 : cx - 10;
    const irisY = cy + 10;
    const irisRx = eyeWidth * 0.44;
    const irisRy = eyeHeight * 0.48;

    // Iris multi-layer gradient (Chocolate -> Warm Amber -> Golden Caramel)
    const irisGrad = ctx.createLinearGradient(
      irisX, irisY - irisRy,
      irisX, irisY + irisRy
    );
    irisGrad.addColorStop(0, '#2b1c18');
    irisGrad.addColorStop(0.35, '#4a2f26');
    irisGrad.addColorStop(0.7, '#8f5c44');
    irisGrad.addColorStop(0.9, '#c68b65');
    irisGrad.addColorStop(1, '#e3ad86');

    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.ellipse(irisX, irisY, irisRx, irisRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // Deep Inner Pupil
    ctx.fillStyle = '#170e0b';
    ctx.beginPath();
    ctx.ellipse(irisX, irisY - 10, irisRx * 0.46, irisRy * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();

    // Inner glowing crescent reflections (Anime classic)
    ctx.strokeStyle = 'rgba(255, 220, 185, 0.55)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(irisX, irisY + 25, irisRx * 0.65, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 240, 210, 0.35)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(irisX, irisY + 45, irisRx * 0.45, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    // Tiny radiant iris lines
    ctx.strokeStyle = 'rgba(255, 215, 180, 0.22)';
    ctx.lineWidth = 3;
    for (let a = 0.15; a <= 0.85; a += 0.1) {
      const angle = a * Math.PI;
      const lx1 = irisX + Math.cos(angle) * (irisRx * 0.5);
      const ly1 = irisY + Math.sin(angle) * (irisRy * 0.5);
      const lx2 = irisX + Math.cos(angle) * (irisRx * 0.88);
      const ly2 = irisY + Math.sin(angle) * (irisRy * 0.88);
      ctx.beginPath();
      ctx.moveTo(lx1, ly1);
      ctx.lineTo(lx2, ly2);
      ctx.stroke();
    }

    // Specular Catchlights (The secret to lively anime eyes!)
    // 1. Big Oval Main Highlight
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(irisX + (isLeft ? 38 : 35), irisY - 45, 42, 54, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // 2. Secondary Star Highlight (Bottom Opposite)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.ellipse(irisX - (isLeft ? 35 : 32), irisY + 48, 22, 28, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // 3. Tiny Sparkle Dot
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(irisX + (isLeft ? 65 : 62), irisY - 10, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore(); // remove clip

    // 6. Upper Eyelid & Eyelashes (Sculpted anime outline)
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2d1d17';
    ctx.beginPath();
    const lashStart = isLeft ? cx - eyeWidth * 0.58 : cx - eyeWidth * 0.48;
    const lashEnd = isLeft ? cx + eyeWidth * 0.48 : cx + eyeWidth * 0.58;
    ctx.arc(cx, cy - 25, eyeWidth * 0.54, 1.15 * Math.PI, 1.88 * Math.PI);
    ctx.stroke();

    // Elegant Outer Tapered Lash Wing
    ctx.fillStyle = '#2d1d17';
    ctx.beginPath();
    if (isLeft) {
      ctx.moveTo(cx - eyeWidth * 0.48, cy - 80);
      ctx.quadraticCurveTo(cx - eyeWidth * 0.68, cy - 90, cx - eyeWidth * 0.72, cy - 110);
      ctx.quadraticCurveTo(cx - eyeWidth * 0.62, cy - 98, cx - eyeWidth * 0.44, cy - 94);
    } else {
      ctx.moveTo(cx + eyeWidth * 0.48, cy - 80);
      ctx.quadraticCurveTo(cx + eyeWidth * 0.68, cy - 90, cx + eyeWidth * 0.72, cy - 110);
      ctx.quadraticCurveTo(cx + eyeWidth * 0.62, cy - 98, cx + eyeWidth * 0.44, cy - 94);
    }
    ctx.closePath();
    ctx.fill();

    // Double Eyelid Crease
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(160, 95, 75, 0.45)';
    ctx.beginPath();
    ctx.arc(cx, cy - 65, eyeWidth * 0.48, 1.25 * Math.PI, 1.75 * Math.PI);
    ctx.stroke();

    // Subtle Lower Eyelid Lash Line
    ctx.lineWidth = 7;
    ctx.strokeStyle = 'rgba(75, 45, 38, 0.65)';
    ctx.beginPath();
    ctx.arc(cx, cy + 20, eyeWidth * 0.48, 0.3 * Math.PI, 0.7 * Math.PI);
    ctx.stroke();

    ctx.restore();
  };

  drawEye(size * 0.35, size * 0.42, true);
  drawEye(size * 0.65, size * 0.42, false);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Creates a soft radial contact shadow texture to eliminate floating models.
 */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, size, size);
    const grad = ctx.createRadialGradient(
      size / 2, size / 2, size * 0.05,
      size / 2, size / 2, size * 0.46
    );
    grad.addColorStop(0, 'rgba(15, 23, 42, 0.68)');
    grad.addColorStop(0.3, 'rgba(15, 23, 42, 0.45)');
    grad.addColorStop(0.65, 'rgba(15, 23, 42, 0.15)');
    grad.addColorStop(1, 'rgba(15, 23, 42, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}
