export interface SitemapUrl {
  url: string;
  lastModified?: string;
  changeFrequency?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export interface SitemapConfig {
  baseUrl: string;
  urls: SitemapUrl[];
}

class SitemapService {
  private baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playnite.com';

  /**
   * Generate sitemap XML for all pages
   */
  generateSitemapXML(): string {
    const urls = this.getAllUrls();
    const urlEntries = urls.map(url => this.generateUrlEntry(url)).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
  }

  /**
   * Generate sitemap for images
   */
  generateImageSitemapXML(): string {
    const imageUrls = this.getImageUrls();
    const urlEntries = imageUrls.map(url => this.generateImageUrlEntry(url)).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries}
</urlset>`;
  }

  /**
   * Generate robots.txt content
   */
  generateRobotsTxt(): string {
    return `User-agent: *
Allow: /

# Sitemap locations
Sitemap: ${this.baseUrl}/sitemap.xml
Sitemap: ${this.baseUrl}/sitemap-images.xml

# Disallow admin and auth pages from search engines
Disallow: /admin/
Disallow: /login
Disallow: /signup

# Allow crawling of public content
Allow: /social
Allow: /reels
Allow: /stories
Allow: /images

# Crawl-delay for respectful crawling
Crawl-delay: 1`;
  }

  /**
   * Get all page URLs for the sitemap
   */
  getAllUrls(): SitemapUrl[] {
    const currentDate = new Date().toISOString();

    return [
      {
        url: `${this.baseUrl}`,
        lastModified: currentDate,
        changeFrequency: 'daily',
        priority: 1.0,
      },
      {
        url: `${this.baseUrl}/social`,
        lastModified: currentDate,
        changeFrequency: 'daily',
        priority: 0.9,
      },
      {
        url: `${this.baseUrl}/reels`,
        lastModified: currentDate,
        changeFrequency: 'daily',
        priority: 0.9,
      },
      {
        url: `${this.baseUrl}/stories`,
        lastModified: currentDate,
        changeFrequency: 'daily',
        priority: 0.8,
      },
      {
        url: `${this.baseUrl}/images`,
        lastModified: currentDate,
        changeFrequency: 'weekly',
        priority: 0.8,
      },
      {
        url: `${this.baseUrl}/about`,
        lastModified: currentDate,
        changeFrequency: 'monthly',
        priority: 0.7,
      },
      {
        url: `${this.baseUrl}/premium`,
        lastModified: currentDate,
        changeFrequency: 'weekly',
        priority: 0.7,
      },
      {
        url: `${this.baseUrl}/18plus`,
        lastModified: currentDate,
        changeFrequency: 'monthly',
        priority: 0.6,
      },
      {
        url: `${this.baseUrl}/search`,
        lastModified: currentDate,
        changeFrequency: 'monthly',
        priority: 0.6,
      },
    ];
  }

  /**
   * Get image URLs for image sitemap
   */
  private getImageUrls(): Array<SitemapUrl & { images: string[] }> {
    const currentDate = new Date().toISOString();

    return [
      {
        url: `${this.baseUrl}/images`,
        lastModified: currentDate,
        changeFrequency: 'weekly',
        priority: 0.8,
        images: [
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
          'https://images.unsplash.com/photo-1494790108755-2616b612b786',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
          'https://images.unsplash.com/photo-1438761681033-6461ffad8d80',
        ],
      },
    ];
  }

  /**
   * Generate XML entry for a URL
   */
  private generateUrlEntry(urlData: SitemapUrl): string {
    return `  <url>
    <loc>${urlData.url}</loc>
    ${urlData.lastModified ? `<lastmod>${urlData.lastModified}</lastmod>` : ''}
    ${urlData.changeFrequency ? `<changefreq>${urlData.changeFrequency}</changefreq>` : ''}
    ${urlData.priority ? `<priority>${urlData.priority}</priority>` : ''}
  </url>`;
  }

  /**
   * Generate XML entry for an image URL
   */
  private generateImageUrlEntry(urlData: SitemapUrl & { images: string[] }): string {
    const imageEntries = urlData.images.map(image =>
      `      <image:image>
        <image:loc>${image}</image:loc>
      </image:image>`
    ).join('\n');

    return `  <url>
    <loc>${urlData.url}</loc>
    ${urlData.lastModified ? `<lastmod>${urlData.lastModified}</lastmod>` : ''}
    ${urlData.changeFrequency ? `<changefreq>${urlData.changeFrequency}</changefreq>` : ''}
    ${urlData.priority ? `<priority>${urlData.priority}</priority>` : ''}
${imageEntries}
  </url>`;
  }

  /**
   * Generate sitemap index for multiple sitemaps
   */
  generateSitemapIndex(sitemaps: Array<{ url: string; lastModified?: string }>): string {
    const sitemapEntries = sitemaps.map(sitemap => `  <sitemap>
    <loc>${sitemap.url}</loc>
    ${sitemap.lastModified ? `<lastmod>${sitemap.lastModified}</lastmod>` : ''}
  </sitemap>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</sitemapindex>`;
  }

  /**
   * Add dynamic URLs (for content that changes frequently)
   */
  addDynamicUrls(urls: SitemapUrl[]): void {
    // This would typically save to a database or cache
    // For now, we'll just return the combined URLs
    const allUrls = [...this.getAllUrls(), ...urls];
    console.log('Dynamic URLs added to sitemap:', allUrls.length);
  }

  /**
   * Generate sitemap for API endpoints (if applicable)
   */
  generateApiSitemapXML(): string {
    // Only include if you have public APIs that should be indexed
    return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- No public APIs to index -->
</urlset>`;
  }
}

// Export singleton instance
export const sitemapService = new SitemapService();