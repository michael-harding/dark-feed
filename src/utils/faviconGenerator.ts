// Utility to generate favicon variants based on accent color
export class FaviconGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private baseImage: HTMLImageElement | null = null;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }

  async loadBaseImage(): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.baseImage = img;
        resolve();
      };
      img.onerror = reject;
      img.src = '/lovable-uploads/7b15f711-6d21-4031-aa2e-9b2a71c0cb88.png';
    });
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    h = h / 360;
    s = s / 100;
    l = l / 100;

    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  private parseHSL(hslString: string): [number, number, number] {
    const matches = hslString.match(/(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/);
    if (!matches) {
      // Fallback to default yellow
      return [46, 87, 65];
    }
    return [parseFloat(matches[1]), parseFloat(matches[2]), parseFloat(matches[3])];
  }

  async generateColoredFavicon(accentColorHSL: string, size: number = 32): Promise<string> {
    if (!this.baseImage) {
      await this.loadBaseImage();
    }

    if (!this.baseImage) {
      throw new Error('Failed to load base image');
    }

    this.canvas.width = size;
    this.canvas.height = size;

    // Clear canvas
    this.ctx.clearRect(0, 0, size, size);

    // Draw the base image
    this.ctx.drawImage(this.baseImage, 0, 0, size, size);

    // Get image data
    const imageData = this.ctx.getImageData(0, 0, size, size);
    const data = imageData.data;

    // Parse the new accent color
    const [h, s, l] = this.parseHSL(accentColorHSL);
    const [newR, newG, newB] = this.hslToRgb(h, s, l);

    // Recolor the icon (replace yellow with new accent color)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Check if pixel is yellowish (original color)
      if (r > 200 && g > 180 && b < 150 && a > 0) {
        // Replace with new accent color, maintaining relative brightness
        const brightness = (r + g + b) / (3 * 255);
        data[i] = newR * brightness;
        data[i + 1] = newG * brightness;
        data[i + 2] = newB * brightness;
      }
    }

    // Put the modified image data back
    this.ctx.putImageData(imageData, 0, 0);

    // Return as data URL
    return this.canvas.toDataURL('image/png');
  }

  updateFavicon(dataUrl: string): void {
    // Remove existing favicon
    const existingFavicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (existingFavicon) {
      existingFavicon.href = dataUrl;
    }

    // Update apple touch icon
    const existingAppleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    if (existingAppleIcon) {
      existingAppleIcon.href = dataUrl;
    }
  }

  async generateAndUpdateFavicon(accentColorHSL: string): Promise<void> {
    try {
      const faviconDataUrl = await this.generateColoredFavicon(accentColorHSL, 32);
      this.updateFavicon(faviconDataUrl);
    } catch (error) {
      console.error('Failed to generate colored favicon:', error);
    }
  }
}

// Singleton instance
export const faviconGenerator = new FaviconGenerator();