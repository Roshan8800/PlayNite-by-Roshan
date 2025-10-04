export interface SEOAnalytics {
  overview: {
    totalImpressions: number;
    totalClicks: number;
    averageCTR: number;
    averagePosition: number;
    totalPages: number;
    indexedPages: number;
  };
  topPages: Array<{
    page: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  }>;
  topKeywords: Array<{
    keyword: string;
    impressions: number;
    clicks: number;
    ctr: number;
    position: number;
  }>;
  trends: {
    impressions: Array<{ date: string; value: number }>;
    clicks: Array<{ date: string; value: number }>;
    ctr: Array<{ date: string; value: number }>;
    position: Array<{ date: string; value: number }>;
  };
  technical: {
    coreWebVitals: {
      lcp: number; // Largest Contentful Paint
      fid: number; // First Input Delay
      cls: number; // Cumulative Layout Shift
    };
    pageSpeed: {
      mobile: number;
      desktop: number;
    };
    crawlErrors: Array<{
      url: string;
      error: string;
      date: string;
    }>;
  };
}

export interface SEOPerformanceReport {
  period: string;
  summary: {
    totalSessions: number;
    organicSessions: number;
    bounceRate: number;
    avgSessionDuration: number;
    conversionRate: number;
  };
  acquisition: {
    organicSearch: number;
    direct: number;
    referral: number;
    social: number;
    email: number;
  };
  topLandingPages: Array<{
    page: string;
    sessions: number;
    bounceRate: number;
    conversionRate: number;
  }>;
}

class SEOAnalyticsService {
  private baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://playnite.com';

  /**
   * Get comprehensive SEO analytics
   */
  async getSEOAnalytics(period: 'day' | 'week' | 'month' | 'year' = 'month'): Promise<SEOAnalytics> {
    // In a real implementation, this would fetch from Google Search Console API,
    // Google Analytics, or other SEO tools

    return {
      overview: {
        totalImpressions: 12543,
        totalClicks: 1234,
        averageCTR: 9.8,
        averagePosition: 4.2,
        totalPages: 15,
        indexedPages: 12,
      },
      topPages: [
        {
          page: `${this.baseUrl}/social`,
          impressions: 4521,
          clicks: 445,
          ctr: 9.8,
          position: 3.2,
        },
        {
          page: `${this.baseUrl}/reels`,
          impressions: 3124,
          clicks: 298,
          ctr: 9.5,
          position: 4.1,
        },
        {
          page: `${this.baseUrl}/`,
          impressions: 2898,
          clicks: 256,
          ctr: 8.8,
          position: 2.8,
        },
        {
          page: `${this.baseUrl}/images`,
          impressions: 1654,
          clicks: 145,
          ctr: 8.8,
          position: 5.2,
        },
        {
          page: `${this.baseUrl}/stories`,
          impressions: 346,
          clicks: 90,
          ctr: 26.0,
          position: 6.8,
        },
      ],
      topKeywords: [
        {
          keyword: 'playnite social',
          impressions: 1203,
          clicks: 145,
          ctr: 12.1,
          position: 2.3,
        },
        {
          keyword: 'social media platform',
          impressions: 987,
          clicks: 98,
          ctr: 9.9,
          position: 4.5,
        },
        {
          keyword: 'video reels',
          impressions: 756,
          clicks: 67,
          ctr: 8.9,
          position: 3.8,
        },
        {
          keyword: 'content sharing',
          impressions: 543,
          clicks: 45,
          ctr: 8.3,
          position: 5.1,
        },
        {
          keyword: 'social community',
          impressions: 432,
          clicks: 38,
          ctr: 8.8,
          position: 4.9,
        },
      ],
      trends: {
        impressions: this.generateTrendData(30, 400, 50),
        clicks: this.generateTrendData(30, 40, 5),
        ctr: this.generateTrendData(30, 10, 1),
        position: this.generateTrendData(30, 4, 0.5),
      },
      technical: {
        coreWebVitals: {
          lcp: 2.1, // Good: < 2.5s
          fid: 95,  // Good: < 100ms
          cls: 0.05, // Good: < 0.1
        },
        pageSpeed: {
          mobile: 78,
          desktop: 92,
        },
        crawlErrors: [
          {
            url: `${this.baseUrl}/old-page`,
            error: '404 Not Found',
            date: '2024-01-15T10:30:00Z',
          },
          {
            url: `${this.baseUrl}/test-page`,
            error: 'Server Error',
            date: '2024-01-14T15:45:00Z',
          },
        ],
      },
    };
  }

  /**
   * Get SEO performance report
   */
  async getSEOPerformanceReport(period: string = '30d'): Promise<SEOPerformanceReport> {
    return {
      period,
      summary: {
        totalSessions: 15420,
        organicSessions: 8234,
        bounceRate: 0.32,
        avgSessionDuration: 245, // seconds
        conversionRate: 0.034,
      },
      acquisition: {
        organicSearch: 53.4,
        direct: 28.7,
        referral: 12.3,
        social: 4.1,
        email: 1.5,
      },
      topLandingPages: [
        {
          page: `${this.baseUrl}/social`,
          sessions: 3420,
          bounceRate: 0.28,
          conversionRate: 0.041,
        },
        {
          page: `${this.baseUrl}/`,
          sessions: 2890,
          bounceRate: 0.31,
          conversionRate: 0.035,
        },
        {
          page: `${this.baseUrl}/reels`,
          sessions: 2156,
          bounceRate: 0.35,
          conversionRate: 0.029,
        },
        {
          page: `${this.baseUrl}/images`,
          sessions: 1876,
          bounceRate: 0.33,
          conversionRate: 0.032,
        },
        {
          page: `${this.baseUrl}/stories`,
          sessions: 1234,
          bounceRate: 0.38,
          conversionRate: 0.025,
        },
      ],
    };
  }

  /**
   * Track SEO event (click, impression, etc.)
   */
  trackSEOEvent(event: {
    type: 'impression' | 'click' | 'conversion';
    page: string;
    keyword?: string;
    position?: number;
    referrer?: string;
  }): void {
    // In a real implementation, this would send data to analytics service
    console.log('SEO Event tracked:', event);

    // Store in local storage for demo purposes
    const events = this.getStoredEvents();
    events.push({
      ...event,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 1000 events
    if (events.length > 1000) {
      events.splice(0, events.length - 1000);
    }

    localStorage.setItem('playnite_seo_events', JSON.stringify(events));
  }

  /**
   * Get stored SEO events
   */
  private getStoredEvents(): Array<any> {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem('playnite_seo_events');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Generate mock trend data
   */
  private generateTrendData(days: number, baseValue: number, variance: number): Array<{ date: string; value: number }> {
    const data = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      const value = baseValue + (Math.random() - 0.5) * variance * 2;
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.round(Math.max(0, value)),
      });
    }

    return data;
  }

  /**
   * Calculate SEO score based on various metrics
   */
  calculateSEOScore(analytics: SEOAnalytics): {
    overall: number;
    content: number;
    technical: number;
    authority: number;
    improvements: string[];
  } {
    const { overview, technical } = analytics;

    // Content score (40% weight)
    const ctrScore = Math.min(100, (overview.averageCTR / 0.15) * 100);
    const positionScore = Math.max(0, 100 - (overview.averagePosition - 1) * 20);
    const contentScore = (ctrScore * 0.6) + (positionScore * 0.4);

    // Technical score (35% weight)
    const lcpScore = Math.max(0, 100 - (technical.coreWebVitals.lcp - 2.5) * 20);
    const fidScore = Math.max(0, 100 - (technical.coreWebVitals.fid - 100) * 1);
    const clsScore = Math.max(0, 100 - technical.coreWebVitals.cls * 1000);
    const speedScore = (technical.pageSpeed.mobile + technical.pageSpeed.desktop) / 2;
    const technicalScore = (lcpScore * 0.3) + (fidScore * 0.2) + (clsScore * 0.2) + (speedScore * 0.3);

    // Authority score (25% weight)
    const indexedRatio = (overview.indexedPages / overview.totalPages) * 100;
    const authorityScore = Math.min(100, indexedRatio + (overview.totalClicks / 100));

    const overall = Math.round(
      (contentScore * 0.4) +
      (technicalScore * 0.35) +
      (authorityScore * 0.25)
    );

    const improvements: string[] = [];

    if (overview.averageCTR < 5) {
      improvements.push('Improve meta descriptions and titles to increase CTR');
    }
    if (overview.averagePosition > 5) {
      improvements.push('Focus on content quality and backlinks to improve rankings');
    }
    if (technical.coreWebVitals.lcp > 2.5) {
      improvements.push('Optimize images and server response times for better LCP');
    }
    if (technical.pageSpeed.mobile < 80) {
      improvements.push('Improve mobile page speed for better user experience');
    }
    if (overview.indexedPages < overview.totalPages) {
      improvements.push('Fix crawl errors and ensure all pages are indexable');
    }

    return {
      overall,
      content: Math.round(contentScore),
      technical: Math.round(technicalScore),
      authority: Math.round(authorityScore),
      improvements,
    };
  }

  /**
   * Get SEO recommendations based on current performance
   */
  getSEORecommendations(analytics: SEOAnalytics): Array<{
    category: 'content' | 'technical' | 'authority' | 'ux';
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
  }> {
    const recommendations = [];
    const { overview, technical } = analytics;

    // High priority recommendations
    if (technical.coreWebVitals.lcp > 4) {
      recommendations.push({
        category: 'technical' as const,
        priority: 'high' as const,
        title: 'Improve Largest Contentful Paint',
        description: 'Optimize images, reduce server response times, and eliminate render-blocking resources.',
        impact: 'high' as const,
      });
    }

    if (overview.averageCTR < 3) {
      recommendations.push({
        category: 'content' as const,
        priority: 'high' as const,
        title: 'Enhance Meta Descriptions',
        description: 'Write compelling meta descriptions that better match user search intent.',
        impact: 'high' as const,
      });
    }

    // Medium priority recommendations
    if (technical.pageSpeed.mobile < 70) {
      recommendations.push({
        category: 'technical' as const,
        priority: 'medium' as const,
        title: 'Mobile Page Speed Optimization',
        description: 'Implement AMP or optimize mobile loading performance.',
        impact: 'medium' as const,
      });
    }

    if (overview.averagePosition > 7) {
      recommendations.push({
        category: 'authority' as const,
        priority: 'medium' as const,
        title: 'Build Quality Backlinks',
        description: 'Focus on earning high-quality backlinks from authoritative websites.',
        impact: 'medium' as const,
      });
    }

    // Low priority recommendations
    if (technical.crawlErrors.length > 0) {
      recommendations.push({
        category: 'technical' as const,
        priority: 'low' as const,
        title: 'Fix Crawl Errors',
        description: 'Address 404 errors and server issues that prevent proper indexing.',
        impact: 'low' as const,
      });
    }

    return recommendations;
  }

  /**
   * Export SEO report as CSV or JSON
   */
  exportSEOReport(analytics: SEOAnalytics, format: 'csv' | 'json' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(analytics, null, 2);
    }

    // CSV format for spreadsheet analysis
    const csvData = [
      'Metric,Value',
      `Total Impressions,${analytics.overview.totalImpressions}`,
      `Total Clicks,${analytics.overview.totalClicks}`,
      `Average CTR,${analytics.overview.averageCTR}%`,
      `Average Position,${analytics.overview.averagePosition}`,
      `Indexed Pages,${analytics.overview.indexedPages}/${analytics.overview.totalPages}`,
      '',
      'Top Pages',
      'Page,Impressions,Clicks,CTR,Position',
      ...analytics.topPages.map(page =>
        `"${page.page}",${page.impressions},${page.clicks},${page.ctr}%,${page.position}`
      ),
      '',
      'Top Keywords',
      'Keyword,Impressions,Clicks,CTR,Position',
      ...analytics.topKeywords.map(keyword =>
        `"${keyword.keyword}",${keyword.impressions},${keyword.clicks},${keyword.ctr}%,${keyword.position}`
      ),
    ];

    return csvData.join('\n');
  }
}

// Export singleton instance
export const seoAnalyticsService = new SEOAnalyticsService();