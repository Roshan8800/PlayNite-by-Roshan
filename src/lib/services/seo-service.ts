export interface SEOMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  robots?: string;
  openGraph?: OpenGraphData;
  twitter?: TwitterCardData;
  structuredData?: StructuredData[];
  additionalMeta?: MetaTag[];
}

export interface OpenGraphData {
  title?: string;
  description?: string;
  url?: string;
  type?: 'website' | 'article' | 'video' | 'audio' | 'image';
  image?: string;
  siteName?: string;
  locale?: string;
  'article:author'?: string;
  'article:published_time'?: string;
  'article:modified_time'?: string;
  'article:section'?: string;
  'article:tag'?: string[];
  'video:duration'?: number;
  'video:release_date'?: string;
}

export interface TwitterCardData {
  card?: 'summary' | 'summary_large_image' | 'app' | 'player';
  site?: string;
  creator?: string;
  title?: string;
  description?: string;
  image?: string;
  'player'?: string;
  'player:width'?: number;
  'player:height'?: number;
  'app:name:iphone'?: string;
  'app:id:iphone'?: string;
  'app:name:ipad'?: string;
  'app:id:ipad'?: string;
  'app:name:googleplay'?: string;
  'app:id:googleplay'?: string;
}

export interface MetaTag {
  name?: string;
  property?: string;
  content: string;
  httpEquiv?: string;
}

export interface StructuredData {
  '@context': string;
  '@type': string;
  [key: string]: any;
}

export interface PageSEOConfig {
  pageType: 'home' | 'social' | 'reels' | 'stories' | 'images' | 'profile' | 'content' | 'category' | 'search' | 'admin' | 'auth';
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  url?: string;
  contentData?: {
    type?: 'image' | 'video' | 'story' | 'user' | 'category';
    id?: string;
    title?: string;
    description?: string;
    image?: string;
    author?: string;
    publishedTime?: string;
    modifiedTime?: string;
    tags?: string[];
    category?: string;
  };
}

class SEOService {
  private siteName = 'PlayNite';
  private siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playnite.com';
  private defaultImage = '/og-default.jpg';
  private twitterHandle = '@playnite';

  /**
   * Generate complete SEO metadata for a page
   */
  generateMetadata(config: PageSEOConfig): SEOMetadata {
    const baseMetadata = this.getBaseMetadata(config);
    const openGraph = this.generateOpenGraph(config);
    const twitter = this.generateTwitterCard(config);
    const structuredData = this.generateStructuredData(config);

    return {
      ...baseMetadata,
      openGraph,
      twitter,
      structuredData,
    };
  }

  /**
   * Get base metadata (title, description, canonical, etc.)
   */
  private getBaseMetadata(config: PageSEOConfig): Partial<SEOMetadata> {
    const { pageType, title, description, keywords, url } = config;

    // Generate title based on page type
    const pageTitle = title || this.generateTitle(config);

    // Generate description based on page type
    const pageDescription = description || this.generateDescription(config);

    // Generate keywords
    const pageKeywords = keywords || this.generateKeywords(config);

    // Generate canonical URL
    const canonical = url || this.generateCanonicalUrl(config);

    return {
      title: pageTitle,
      description: pageDescription,
      keywords: pageKeywords,
      canonical,
      robots: this.getRobotsDirective(config),
    };
  }

  /**
   * Generate page title based on page type and content
   */
  private generateTitle(config: PageSEOConfig): string {
    const { pageType, title, contentData } = config;

    switch (pageType) {
      case 'home':
        return `PlayNite - Your Premium Social Media Experience`;
      case 'social':
        return title || 'Social Feed - Connect with Friends | PlayNite';
      case 'reels':
        return title || 'Video Reels - Short Form Entertainment | PlayNite';
      case 'stories':
        return title || 'Stories - Share Your Moments | PlayNite';
      case 'images':
        return title || 'Image Gallery - Visual Content | PlayNite';
      case 'profile':
        return contentData?.title
          ? `${contentData.title} (@${contentData.title}) | PlayNite`
          : 'User Profile | PlayNite';
      case 'content':
        return contentData?.title
          ? `${contentData.title} | PlayNite`
          : 'Content | PlayNite';
      case 'category':
        return contentData?.category
          ? `${contentData.category} - Content Category | PlayNite`
          : 'Category | PlayNite';
      case 'search':
        return 'Search Results | PlayNite';
      case 'admin':
        return 'Admin Dashboard | PlayNite';
      case 'auth':
        return 'Login | PlayNite';
      default:
        return 'PlayNite';
    }
  }

  /**
   * Generate page description based on page type and content
   */
  private generateDescription(config: PageSEOConfig): string {
    const { pageType, description, contentData } = config;

    if (description) return description;

    switch (pageType) {
      case 'home':
        return 'Join PlayNite, the premium social media platform for sharing images, videos, and connecting with friends. Experience social features, reels, and stories.';
      case 'social':
        return 'Connect with friends, share content, and engage with the PlayNite community. Follow users, join conversations, and discover new content.';
      case 'reels':
        return 'Watch and share short-form video content on PlayNite. Discover trending reels, create your own, and engage with the video community.';
      case 'stories':
        return 'Share your daily moments through stories on PlayNite. Create engaging stories with photos, videos, and text overlays.';
      case 'images':
        return 'Browse and share high-quality images on PlayNite. Discover visual content from our community of photographers and creators.';
      case 'profile':
        return contentData?.description ||
          'View user profiles, posts, and activity on PlayNite. Connect with other users and explore their content.';
      case 'content':
        return contentData?.description ||
          'Discover amazing content on PlayNite. View images, videos, and stories from our creative community.';
      case 'category':
        return `Explore ${contentData?.category || 'curated'} content on PlayNite. Discover posts, images, and videos in this category.`;
      case 'search':
        return 'Search for users, posts, and content on PlayNite. Find what you\'re looking for in our community.';
      case 'admin':
        return 'Administrative dashboard for PlayNite. Manage users, content, and platform settings.';
      case 'auth':
        return 'Sign in to your PlayNite account to access premium social features, connect with friends, and share content.';
      default:
        return 'PlayNite - Premium social media platform for sharing and connecting.';
    }
  }

  /**
   * Generate keywords based on page type and content
   */
  private generateKeywords(config: PageSEOConfig): string[] {
    const { pageType, keywords, contentData } = config;
    const baseKeywords = ['PlayNite', 'social media', 'community'];

    if (keywords) return [...baseKeywords, ...keywords];

    switch (pageType) {
      case 'home':
        return [
          ...baseKeywords,
          'social platform',
          'content sharing',
          'social networking',
          'premium features'
        ];
      case 'social':
        return [
          ...baseKeywords,
          'social feed',
          'following',
          'friends',
          'social interaction',
          'community engagement'
        ];
      case 'reels':
        return [
          ...baseKeywords,
          'video reels',
          'short videos',
          'video content',
          'entertainment',
          'viral videos'
        ];
      case 'stories':
        return [
          ...baseKeywords,
          'stories',
          'daily moments',
          'temporary content',
          'story sharing',
          'social stories'
        ];
      case 'images':
        return [
          ...baseKeywords,
          'image gallery',
          'photos',
          'visual content',
          'photography',
          'image sharing'
        ];
      case 'profile':
        const profileKeywords = contentData?.tags || [];
        return [
          ...baseKeywords,
          'user profile',
          'social profile',
          ...profileKeywords
        ];
      case 'content':
        return [
          ...baseKeywords,
          'content',
          'posts',
          'media',
          ...(contentData?.tags || [])
        ];
      case 'category':
        return [
          ...baseKeywords,
          'content category',
          contentData?.category || 'category',
          'curated content'
        ];
      case 'search':
        return [
          ...baseKeywords,
          'search',
          'find users',
          'discover content'
        ];
      default:
        return baseKeywords;
    }
  }

  /**
   * Generate canonical URL
   */
  private generateCanonicalUrl(config: PageSEOConfig): string {
    const { pageType, url, contentData } = config;

    if (url) return url;

    const baseUrl = this.siteUrl;
    switch (pageType) {
      case 'home':
        return baseUrl;
      case 'social':
        return `${baseUrl}/social`;
      case 'reels':
        return `${baseUrl}/reels`;
      case 'stories':
        return `${baseUrl}/stories`;
      case 'images':
        return `${baseUrl}/images`;
      case 'profile':
        return contentData?.id
          ? `${baseUrl}/profile/${contentData.id}`
          : `${baseUrl}/profile`;
      case 'content':
        return contentData?.id
          ? `${baseUrl}/content/${contentData.id}`
          : `${baseUrl}/content`;
      case 'category':
        return contentData?.category
          ? `${baseUrl}/category/${encodeURIComponent(contentData.category)}`
          : `${baseUrl}/category`;
      case 'search':
        return `${baseUrl}/search`;
      case 'admin':
        return `${baseUrl}/admin`;
      case 'auth':
        return `${baseUrl}/login`;
      default:
        return baseUrl;
    }
  }

  /**
   * Get robots directive for the page
   */
  private getRobotsDirective(config: PageSEOConfig): string {
    const { pageType } = config;

    switch (pageType) {
      case 'admin':
        return 'noindex, nofollow';
      case 'auth':
        return 'noindex, nofollow';
      default:
        return 'index, follow';
    }
  }

  /**
   * Generate Open Graph data
   */
  private generateOpenGraph(config: PageSEOConfig): OpenGraphData {
    const { pageType, contentData } = config;

    const baseOG: OpenGraphData = {
      siteName: this.siteName,
      locale: 'en_US',
    };

    switch (pageType) {
      case 'home':
        return {
          ...baseOG,
          title: 'PlayNite - Premium Social Media Platform',
          description: 'Join PlayNite, the premium social media platform for sharing images, videos, and connecting with friends.',
          url: this.siteUrl,
          type: 'website',
          image: `${this.siteUrl}${this.defaultImage}`,
        };
      case 'social':
        return {
          ...baseOG,
          title: 'Social Feed - Connect with Friends | PlayNite',
          description: 'Connect with friends, share content, and engage with the PlayNite community.',
          url: `${this.siteUrl}/social`,
          type: 'website',
          image: `${this.siteUrl}${this.defaultImage}`,
        };
      case 'reels':
        return {
          ...baseOG,
          title: 'Video Reels - Short Form Entertainment | PlayNite',
          description: 'Watch and share short-form video content on PlayNite.',
          url: `${this.siteUrl}/reels`,
          type: 'website',
          image: `${this.siteUrl}${this.defaultImage}`,
        };
      case 'profile':
        if (contentData?.title) {
          return {
            ...baseOG,
            title: `${contentData.title} (@${contentData.title}) | PlayNite`,
            description: contentData.description || `View ${contentData.title}'s profile on PlayNite`,
            url: `${this.siteUrl}/profile/${contentData.id}`,
            type: 'website',
            image: contentData.image || `${this.siteUrl}${this.defaultImage}`,
          };
        }
        break;
      case 'content':
        if (contentData?.title) {
          return {
            ...baseOG,
            title: `${contentData.title} | PlayNite`,
            description: contentData.description || 'Amazing content on PlayNite',
            url: `${this.siteUrl}/content/${contentData.id}`,
            type: contentData.type === 'video' ? 'video' : 'article',
            image: contentData.image || `${this.siteUrl}${this.defaultImage}`,
            'article:author': contentData.author,
            'article:published_time': contentData.publishedTime,
            'article:modified_time': contentData.modifiedTime,
            'article:section': contentData.category,
            'article:tag': contentData.tags,
          };
        }
        break;
    }

    // Default fallback
    return {
      ...baseOG,
      title: 'PlayNite',
      description: 'Premium social media platform for sharing and connecting.',
      url: this.siteUrl,
      type: 'website',
      image: `${this.siteUrl}${this.defaultImage}`,
    };
  }

  /**
   * Generate Twitter Card data
   */
  private generateTwitterCard(config: PageSEOConfig): TwitterCardData {
    const { pageType, contentData } = config;

    const baseTwitter: TwitterCardData = {
      site: this.twitterHandle,
      card: 'summary_large_image',
    };

    switch (pageType) {
      case 'home':
        return {
          ...baseTwitter,
          title: 'PlayNite - Premium Social Media Platform',
          description: 'Join PlayNite, the premium social media platform for sharing images, videos, and connecting with friends.',
          image: `${this.siteUrl}${this.defaultImage}`,
        };
      case 'social':
        return {
          ...baseTwitter,
          title: 'Social Feed - Connect with Friends | PlayNite',
          description: 'Connect with friends, share content, and engage with the PlayNite community.',
          image: `${this.siteUrl}${this.defaultImage}`,
        };
      case 'reels':
        return {
          ...baseTwitter,
          title: 'Video Reels - Short Form Entertainment | PlayNite',
          description: 'Watch and share short-form video content on PlayNite.',
          image: `${this.siteUrl}${this.defaultImage}`,
        };
      case 'profile':
        if (contentData?.title) {
          return {
            ...baseTwitter,
            title: `${contentData.title} (@${contentData.title}) | PlayNite`,
            description: contentData.description || `View ${contentData.title}'s profile on PlayNite`,
            image: contentData.image || `${this.siteUrl}${this.defaultImage}`,
          };
        }
        break;
      case 'content':
        if (contentData?.title) {
          return {
            ...baseTwitter,
            title: `${contentData.title} | PlayNite`,
            description: contentData.description || 'Amazing content on PlayNite',
            image: contentData.image || `${this.siteUrl}${this.defaultImage}`,
          };
        }
        break;
    }

    // Default fallback
    return {
      ...baseTwitter,
      title: 'PlayNite',
      description: 'Premium social media platform for sharing and connecting.',
      image: `${this.siteUrl}${this.defaultImage}`,
    };
  }

  /**
   * Generate structured data (JSON-LD)
   */
  private generateStructuredData(config: PageSEOConfig): StructuredData[] {
    const { pageType, contentData } = config;
    const structuredData: StructuredData[] = [];

    // Website structured data (always included)
    structuredData.push({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: this.siteName,
      url: this.siteUrl,
      description: 'Premium social media platform for sharing images, videos, and connecting with friends.',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${this.siteUrl}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string',
      },
    });

    // Page-specific structured data
    switch (pageType) {
      case 'home':
        structuredData.push({
          '@context': 'https://schema.org',
          '@type': 'Organization',
          name: this.siteName,
          url: this.siteUrl,
          logo: `${this.siteUrl}/logo.png`,
          sameAs: [
            'https://twitter.com/playnite',
            'https://facebook.com/playnite',
            'https://instagram.com/playnite',
          ],
        });
        break;

      case 'profile':
        if (contentData?.title) {
          structuredData.push({
            '@context': 'https://schema.org',
            '@type': 'ProfilePage',
            mainEntity: {
              '@type': 'Person',
              name: contentData.title,
              identifier: contentData.id,
              image: contentData.image,
              description: contentData.description,
            },
          });
        }
        break;

      case 'content':
        if (contentData?.title) {
          const baseEntity = {
            '@type': contentData.type === 'video' ? 'VideoObject' : 'CreativeWork',
            name: contentData.title,
            description: contentData.description,
            url: `${this.siteUrl}/content/${contentData.id}`,
            image: contentData.image,
            author: contentData.author ? {
              '@type': 'Person',
              name: contentData.author,
            } : undefined,
            datePublished: contentData.publishedTime,
            dateModified: contentData.modifiedTime,
          };

          if (contentData.type === 'video') {
            (baseEntity as any).duration = contentData.tags?.find(tag => tag.includes('duration'));
            (baseEntity as any).contentUrl = contentData.image; // Video URL would go here
          }

          structuredData.push({
            '@context': 'https://schema.org',
            ...baseEntity,
          });
        }
        break;
    }

    return structuredData;
  }

  /**
   * Generate meta tags array for Next.js Head component
   */
  generateMetaTags(metadata: SEOMetadata): MetaTag[] {
    const tags: MetaTag[] = [];

    // Basic meta tags
    if (metadata.title) {
      tags.push({ name: 'title', content: metadata.title });
    }

    if (metadata.description) {
      tags.push({ name: 'description', content: metadata.description });
    }

    if (metadata.keywords && metadata.keywords.length > 0) {
      tags.push({ name: 'keywords', content: metadata.keywords.join(', ') });
    }

    if (metadata.canonical) {
      tags.push({ name: 'canonical', content: metadata.canonical });
    }

    if (metadata.robots) {
      tags.push({ name: 'robots', content: metadata.robots });
    }

    // Open Graph tags
    if (metadata.openGraph) {
      const og = metadata.openGraph;
      if (og.title) tags.push({ property: 'og:title', content: og.title });
      if (og.description) tags.push({ property: 'og:description', content: og.description });
      if (og.url) tags.push({ property: 'og:url', content: og.url });
      if (og.type) tags.push({ property: 'og:type', content: og.type });
      if (og.image) tags.push({ property: 'og:image', content: og.image });
      if (og.siteName) tags.push({ property: 'og:site_name', content: og.siteName });
      if (og.locale) tags.push({ property: 'og:locale', content: og.locale });

      // Article-specific tags
      if (og['article:author']) tags.push({ property: 'article:author', content: og['article:author'] });
      if (og['article:published_time']) tags.push({ property: 'article:published_time', content: og['article:published_time'] });
      if (og['article:modified_time']) tags.push({ property: 'article:modified_time', content: og['article:modified_time'] });
      if (og['article:section']) tags.push({ property: 'article:section', content: og['article:section'] });
      if (og['article:tag']) {
        og['article:tag'].forEach(tag => {
          tags.push({ property: 'article:tag', content: tag });
        });
      }

      // Video-specific tags
      if (og['video:duration']) tags.push({ property: 'video:duration', content: og['video:duration'].toString() });
      if (og['video:release_date']) tags.push({ property: 'video:release_date', content: og['video:release_date'] });
    }

    // Twitter Card tags
    if (metadata.twitter) {
      const twitter = metadata.twitter;
      if (twitter.card) tags.push({ name: 'twitter:card', content: twitter.card });
      if (twitter.site) tags.push({ name: 'twitter:site', content: twitter.site });
      if (twitter.creator) tags.push({ name: 'twitter:creator', content: twitter.creator });
      if (twitter.title) tags.push({ name: 'twitter:title', content: twitter.title });
      if (twitter.description) tags.push({ name: 'twitter:description', content: twitter.description });
      if (twitter.image) tags.push({ name: 'twitter:image', content: twitter.image });

      // Player-specific tags
      if (twitter['player']) tags.push({ name: 'twitter:player', content: twitter['player'] });
      if (twitter['player:width']) tags.push({ name: 'twitter:player:width', content: twitter['player:width'].toString() });
      if (twitter['player:height']) tags.push({ name: 'twitter:player:height', content: twitter['player:height'].toString() });
    }

    // Additional custom meta tags
    if (metadata.additionalMeta) {
      tags.push(...metadata.additionalMeta);
    }

    return tags;
  }

  /**
   * Generate JSON-LD scripts
   */
  generateJSONLDScripts(structuredData: StructuredData[]): string[] {
    return structuredData.map(data => JSON.stringify(data, null, 0));
  }
}

// Export singleton instance
export const seoService = new SEOService();