// Utility to generate favicon variants based on accent color
export class FaviconGenerator {
  private svgText: string | null = null;

  constructor() {}

  async loadSvgFavicon(): Promise<void> {
    if (this.svgText) return;
    const response = await fetch('/favicon.svg');
    if (!response.ok) throw new Error('Failed to load SVG favicon');
    this.svgText = await response.text();
  }

  // Utility to validate HSL string
  private validateHSL(hslString: string): string {
    // Accepts hsl(46, 87%, 65%) or 46,87%,65%
    if (/^hsl\(\d{1,3},\s*\d{1,3}%?,\s*\d{1,3}%?\)$/.test(hslString)) {
      return hslString;
    }
    const matches = hslString.match(/(\d{1,3})[,\s]+(\d{1,3})%?[,\s]+(\d{1,3})%?/);
    if (matches) {
      return `hsl(${matches[1]}, ${matches[2]}%, ${matches[3]}%)`;
    }
    // fallback to default yellow
    return 'hsl(46, 87%, 65%)';
  }

  async generateColoredFaviconSVG(accentColorHSL: string): Promise<string> {
    await this.loadSvgFavicon();
    if (!this.svgText) throw new Error('SVG favicon not loaded');
    const accent = this.validateHSL(accentColorHSL);
    // Replace all accent color occurrences
    const coloredSvg = this.svgText.replace(/hsl\(46, 87%, 65%\)/g, accent);
    // Also replace in class="accent" fill
    return `data:image/svg+xml;base64,${btoa(coloredSvg)}`;
  }

  updateFavicon(dataUrl: string): void {
    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
    if (!favicon) {
      favicon = document.createElement('link');
      favicon.rel = 'icon';
      document.head.appendChild(favicon);
    }
    favicon.type = 'image/svg+xml';
    favicon.href = dataUrl;

    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      document.head.appendChild(appleIcon);
    }
    appleIcon.href = dataUrl;
  }

  async generateAndUpdateFavicon(accentColorHSL: string): Promise<void> {
    try {
      const faviconDataUrl = await this.generateColoredFaviconSVG(accentColorHSL);
      this.updateFavicon(faviconDataUrl);
    } catch (error) {
      console.error('Failed to generate colored SVG favicon:', error);
    }
  }
}

// Singleton instance
export const faviconGenerator = new FaviconGenerator();