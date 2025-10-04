import { seoService, type SEOMetadata } from './seo-service';

export interface ContentAnalysis {
  wordCount: number;
  readingTime: number;
  keywords: string[];
  entities: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  topics: string[];
  summary: string;
  metaDescription: string;
  suggestedTitle: string;
}

export interface SEOEnhancement {
  suggestedTitle: string;
  suggestedDescription: string;
  suggestedKeywords: string[];
  suggestedTags: string[];
  seoScore: number;
  improvements: SEOImprovement[];
}

export interface SEOImprovement {
  type: 'title' | 'description' | 'keywords' | 'content' | 'structure';
  priority: 'low' | 'medium' | 'high';
  message: string;
  suggestion: string;
}

class ContentSEOService {
  private readonly STOP_WORDS = new Set([
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
    'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
    'to', 'was', 'will', 'with', 'would', 'could', 'should', 'may',
    'might', 'must', 'shall', 'can', 'this', 'these', 'those', 'i',
    'you', 'they', 'we', 'us', 'them', 'me', 'him', 'her', 'it'
  ]);

  private readonly MIN_WORD_LENGTH = 3;
  private readonly MAX_KEYWORDS = 10;
  private readonly OPTIMAL_TITLE_LENGTH = { min: 30, max: 60 };
  private readonly OPTIMAL_DESCRIPTION_LENGTH = { min: 120, max: 160 };

  /**
   * Analyze content and extract SEO-relevant information
   */
  analyzeContent(content: string, title?: string): ContentAnalysis {
    const words = this.extractWords(content);
    const wordCount = words.length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed

    const keywords = this.extractKeywords(content, title);
    const entities = this.extractEntities(content);
    const sentiment = this.analyzeSentiment(content);
    const topics = this.extractTopics(content, keywords);
    const summary = this.generateSummary(content, title);
    const metaDescription = this.generateMetaDescription(content, title);

    return {
      wordCount,
      readingTime,
      keywords,
      entities,
      sentiment,
      topics,
      summary,
      metaDescription,
      suggestedTitle: title || this.generateSuggestedTitle(content, keywords),
    };
  }

  /**
   * Generate SEO enhancements for content
   */
  generateSEOEnhancements(content: string, currentTitle?: string, currentDescription?: string): SEOEnhancement {
    const analysis = this.analyzeContent(content, currentTitle);
    const improvements = this.identifyImprovements(content, currentTitle, currentDescription, analysis);
    const seoScore = this.calculateSEOScore(content, currentTitle, currentDescription, analysis);

    return {
      suggestedTitle: analysis.suggestedTitle,
      suggestedDescription: analysis.metaDescription,
      suggestedKeywords: analysis.keywords.slice(0, this.MAX_KEYWORDS),
      suggestedTags: analysis.topics,
      seoScore,
      improvements,
    };
  }

  /**
   * Extract words from content, filtering out stop words and short words
   */
  private extractWords(content: string): string[] {
    return content
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length >= this.MIN_WORD_LENGTH && !this.STOP_WORDS.has(word))
      .map(word => word.toLowerCase());
  }

  /**
   * Extract keywords using TF-IDF-like approach
   */
  private extractKeywords(content: string, title?: string): string[] {
    const words = this.extractWords(content);
    const titleWords = title ? this.extractWords(title) : [];

    // Count word frequency
    const wordFreq = new Map<string, number>();
    [...words, ...titleWords].forEach(word => {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    });

    // Calculate TF-IDF-like score (simplified)
    const scoredWords = Array.from(wordFreq.entries()).map(([word, freq]) => ({
      word,
      score: freq * Math.log(words.length / Math.max(1, freq)),
    }));

    // Sort by score and return top keywords
    return scoredWords
      .sort((a, b) => b.score - a.score)
      .slice(0, this.MAX_KEYWORDS)
      .map(item => item.word);
  }

  /**
   * Extract named entities (simplified implementation)
   */
  private extractEntities(content: string): string[] {
    // Simple regex-based entity extraction
    const patterns = [
      // Email addresses
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      // URLs
      /https?:\/\/[^\s]+/g,
      // Hashtags
      /#[A-Za-z0-9_]+/g,
      // @mentions
      /@[A-Za-z0-9_]+/g,
    ];

    const entities = new Set<string>();
    patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => entities.add(match));
      }
    });

    return Array.from(entities);
  }

  /**
   * Analyze sentiment (simplified)
   */
  private analyzeSentiment(content: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'like', 'awesome', 'brilliant'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'dislike', 'worst', 'horrible', 'ugly', 'stupid', 'boring'];

    const lowerContent = content.toLowerCase();
    const positiveCount = positiveWords.reduce((count, word) =>
      count + (lowerContent.includes(word) ? 1 : 0), 0);
    const negativeCount = negativeWords.reduce((count, word) =>
      count + (lowerContent.includes(word) ? 1 : 0), 0);

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  /**
   * Extract topics from content
   */
  private extractTopics(content: string, keywords: string[]): string[] {
    // Simple topic extraction based on keywords and common patterns
    const topics = new Set<string>();

    // Add keyword-based topics
    keywords.forEach(keyword => {
      if (keyword.length > 4) {
        topics.add(keyword);
      }
    });

    // Look for category-indicating words
    const categoryWords = ['tutorial', 'guide', 'review', 'tips', 'news', 'story', 'art', 'design', 'technology', 'lifestyle'];
    categoryWords.forEach(word => {
      if (content.toLowerCase().includes(word)) {
        topics.add(word);
      }
    });

    return Array.from(topics).slice(0, 5);
  }

  /**
   * Generate content summary
   */
  private generateSummary(content: string, title?: string): string {
    // Extract first meaningful paragraph or create summary from first 150 characters
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const firstSentence = sentences[0]?.trim();

    if (firstSentence && firstSentence.length < 200) {
      return firstSentence;
    }

    // Fallback: create summary from first 150 characters
    const truncated = content.substring(0, 150).trim();
    return truncated + (content.length > 150 ? '...' : '');
  }

  /**
   * Generate meta description
   */
  private generateMetaDescription(content: string, title?: string): string {
    const summary = this.generateSummary(content, title);

    // Ensure description is within optimal length
    if (summary.length >= this.OPTIMAL_DESCRIPTION_LENGTH.min &&
        summary.length <= this.OPTIMAL_DESCRIPTION_LENGTH.max) {
      return summary;
    }

    // Truncate or expand as needed
    if (summary.length > this.OPTIMAL_DESCRIPTION_LENGTH.max) {
      return summary.substring(0, this.OPTIMAL_DESCRIPTION_LENGTH.max - 3) + '...';
    }

    // If too short, try to add more content
    const words = content.split(' ');
    let description = summary;
    let i = 0;

    while (description.length < this.OPTIMAL_DESCRIPTION_LENGTH.min && i < words.length) {
      description += ' ' + words[i];
      i++;
    }

    return description.length > this.OPTIMAL_DESCRIPTION_LENGTH.max
      ? description.substring(0, this.OPTIMAL_DESCRIPTION_LENGTH.max - 3) + '...'
      : description;
  }

  /**
   * Generate suggested title
   */
  private generateSuggestedTitle(content: string, keywords: string[]): string {
    const firstSentence = content.split(/[.!?]+/)[0]?.trim();

    // Use first sentence if it's a good length
    if (firstSentence &&
        firstSentence.length >= this.OPTIMAL_TITLE_LENGTH.min &&
        firstSentence.length <= this.OPTIMAL_TITLE_LENGTH.max) {
      return this.capitalizeFirst(firstSentence);
    }

    // Generate title from keywords
    const topKeywords = keywords.slice(0, 3);
    const title = topKeywords.join(' ');

    return this.capitalizeFirst(title);
  }

  /**
   * Identify SEO improvements needed
   */
  private identifyImprovements(
    content: string,
    currentTitle?: string,
    currentDescription?: string,
    analysis?: ContentAnalysis
  ): SEOImprovement[] {
    const improvements: SEOImprovement[] = [];
    const contentAnalysis = analysis || this.analyzeContent(content, currentTitle);

    // Title improvements
    if (!currentTitle) {
      improvements.push({
        type: 'title',
        priority: 'high',
        message: 'Missing title',
        suggestion: 'Add a descriptive title that includes your main keywords',
      });
    } else if (currentTitle.length < this.OPTIMAL_TITLE_LENGTH.min) {
      improvements.push({
        type: 'title',
        priority: 'medium',
        message: 'Title is too short',
        suggestion: `Expand title to ${this.OPTIMAL_TITLE_LENGTH.min}-${this.OPTIMAL_TITLE_LENGTH.max} characters`,
      });
    } else if (currentTitle.length > this.OPTIMAL_TITLE_LENGTH.max) {
      improvements.push({
        type: 'title',
        priority: 'medium',
        message: 'Title is too long',
        suggestion: `Shorten title to ${this.OPTIMAL_TITLE_LENGTH.min}-${this.OPTIMAL_TITLE_LENGTH.max} characters`,
      });
    }

    // Description improvements
    if (!currentDescription) {
      improvements.push({
        type: 'description',
        priority: 'high',
        message: 'Missing meta description',
        suggestion: 'Add a compelling description that summarizes your content',
      });
    } else if (currentDescription.length < this.OPTIMAL_DESCRIPTION_LENGTH.min) {
      improvements.push({
        type: 'description',
        priority: 'medium',
        message: 'Description is too short',
        suggestion: `Expand description to ${this.OPTIMAL_DESCRIPTION_LENGTH.min}-${this.OPTIMAL_DESCRIPTION_LENGTH.max} characters`,
      });
    } else if (currentDescription.length > this.OPTIMAL_DESCRIPTION_LENGTH.max) {
      improvements.push({
        type: 'description',
        priority: 'medium',
        message: 'Description is too long',
        suggestion: `Shorten description to ${this.OPTIMAL_DESCRIPTION_LENGTH.min}-${this.OPTIMAL_DESCRIPTION_LENGTH.max} characters`,
      });
    }

    // Content improvements
    if (contentAnalysis.wordCount < 300) {
      improvements.push({
        type: 'content',
        priority: 'low',
        message: 'Content is quite short',
        suggestion: 'Consider adding more detailed content (aim for 300+ words)',
      });
    }

    // Keyword improvements
    if (contentAnalysis.keywords.length < 3) {
      improvements.push({
        type: 'keywords',
        priority: 'medium',
        message: 'Limited keyword diversity',
        suggestion: 'Include more relevant keywords naturally in your content',
      });
    }

    return improvements;
  }

  /**
   * Calculate SEO score (0-100)
   */
  private calculateSEOScore(
    content: string,
    currentTitle?: string,
    currentDescription?: string,
    analysis?: ContentAnalysis
  ): number {
    let score = 0;
    const contentAnalysis = analysis || this.analyzeContent(content, currentTitle);

    // Title score (25 points)
    if (currentTitle) {
      if (currentTitle.length >= this.OPTIMAL_TITLE_LENGTH.min &&
          currentTitle.length <= this.OPTIMAL_TITLE_LENGTH.max) {
        score += 25;
      } else if (currentTitle.length > 0) {
        score += 15;
      }
    }

    // Description score (25 points)
    if (currentDescription) {
      if (currentDescription.length >= this.OPTIMAL_DESCRIPTION_LENGTH.min &&
          currentDescription.length <= this.OPTIMAL_DESCRIPTION_LENGTH.max) {
        score += 25;
      } else if (currentDescription.length > 0) {
        score += 15;
      }
    }

    // Content length score (20 points)
    if (contentAnalysis.wordCount >= 300) {
      score += 20;
    } else if (contentAnalysis.wordCount >= 150) {
      score += 10;
    }

    // Keywords score (15 points)
    if (contentAnalysis.keywords.length >= 5) {
      score += 15;
    } else if (contentAnalysis.keywords.length >= 3) {
      score += 10;
    } else if (contentAnalysis.keywords.length > 0) {
      score += 5;
    }

    // Structure score (15 points)
    const hasHeadings = /\n#{1,6}\s/g.test(content);
    const hasEntities = contentAnalysis.entities.length > 0;
    const hasTopics = contentAnalysis.topics.length > 0;

    if (hasHeadings && hasEntities && hasTopics) {
      score += 15;
    } else if (hasHeadings || hasEntities || hasTopics) {
      score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Generate SEO metadata for content
   */
  generateContentSEO(
    content: string,
    contentData?: {
      title?: string;
      type?: 'image' | 'video' | 'story' | 'post';
      id?: string;
      author?: string;
      publishedTime?: string;
      tags?: string[];
      category?: string;
    }
  ): SEOMetadata {
    const analysis = this.analyzeContent(content, contentData?.title);
    const enhancements = this.generateSEOEnhancements(content, contentData?.title);

    return seoService.generateMetadata({
      pageType: 'content',
      title: enhancements.suggestedTitle,
      description: enhancements.suggestedDescription,
      keywords: enhancements.suggestedKeywords,
      contentData: {
        type: contentData?.type === 'post' ? 'image' : (contentData?.type || 'image'),
        id: contentData?.id,
        title: enhancements.suggestedTitle,
        description: enhancements.suggestedDescription,
        author: contentData?.author,
        publishedTime: contentData?.publishedTime,
        tags: enhancements.suggestedTags,
        category: contentData?.category,
      },
    });
  }

  /**
   * Utility function to capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Generate breadcrumb structured data
   */
  generateBreadcrumbStructuredData(items: Array<{ name: string; url: string }>) {
    return {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    };
  }

  /**
   * Generate FAQ structured data
   */
  generateFAQStructuredData(faqs: Array<{ question: string; answer: string }>) {
    return {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    };
  }

  /**
   * Generate review structured data
   */
  generateReviewStructuredData(review: {
    name: string;
    reviewBody: string;
    rating: number;
    author: string;
    datePublished: string;
    itemReviewed: {
      name: string;
      type: string;
    };
  }) {
    return {
      '@context': 'https://schema.org',
      '@type': 'Review',
      name: review.name,
      reviewBody: review.reviewBody,
      reviewRating: {
        '@type': 'Rating',
        ratingValue: review.rating,
        bestRating: 5,
      },
      author: {
        '@type': 'Person',
        name: review.author,
      },
      datePublished: review.datePublished,
      itemReviewed: {
        '@type': review.itemReviewed.type,
        name: review.itemReviewed.name,
      },
    };
  }
}

// Export singleton instance
export const contentSEOService = new ContentSEOService();