"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  Eye,
  Download,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  Globe,
  Settings,
  FileText,
  Image,
  Video,
  Link as LinkIcon,
  Zap
} from 'lucide-react';
import { seoService, type SEOMetadata, type PageSEOConfig } from '@/lib/services/seo-service';
import { sitemapService } from '@/lib/services/sitemap-service';
import { contentSEOService } from '@/lib/services/content-seo-service';

interface SEOSettings {
  siteName: string;
  siteUrl: string;
  defaultImage: string;
  twitterHandle: string;
  facebookUrl: string;
  instagramUrl: string;
  description: string;
  keywords: string[];
}

interface SEOPreview {
  title: string;
  description: string;
  url: string;
  image: string;
}

export default function SEOManagementPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [settings, setSettings] = useState<SEOSettings>({
    siteName: 'PlayNite',
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://playnite.com',
    defaultImage: '/og-default.jpg',
    twitterHandle: '@playnite',
    facebookUrl: 'https://facebook.com/playnite',
    instagramUrl: 'https://instagram.com/playnite',
    description: 'Premium social media platform for sharing images, videos, and connecting with friends.',
    keywords: ['social media', 'community', 'content sharing', 'social networking'],
  });

  const [preview, setPreview] = useState<SEOPreview>({
    title: 'PlayNite - Premium Social Media Platform',
    description: 'Join PlayNite, the premium social media platform for sharing images, videos, and connecting with friends.',
    url: 'https://playnite.com',
    image: '/og-default.jpg',
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);

  // Generate sitemap and robots.txt
  const handleGenerateSitemap = async () => {
    setIsGenerating(true);
    try {
      // In a real implementation, this would save to files or database
      const sitemap = sitemapService.generateSitemapXML();
      const robotsTxt = sitemapService.generateRobotsTxt();

      console.log('Sitemap generated:', sitemap.length, 'characters');
      console.log('Robots.txt generated:', robotsTxt.length, 'characters');

      setLastGenerated(new Date());

      // Show success message
      alert('Sitemap and robots.txt generated successfully!');
    } catch (error) {
      console.error('Error generating sitemap:', error);
      alert('Error generating sitemap. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Update preview when settings change
  useEffect(() => {
    const metadata = seoService.generateMetadata({
      pageType: 'home',
      title: settings.siteName,
      description: settings.description,
      keywords: settings.keywords,
    });

    setPreview({
      title: metadata.title || settings.siteName,
      description: metadata.description || settings.description,
      url: settings.siteUrl,
      image: settings.defaultImage,
    });
  }, [settings]);

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">SEO Management</h1>
          <p className="text-muted-foreground">
            Manage search engine optimization, meta tags, sitemaps, and monitor SEO performance.
          </p>
        </div>

        {/* SEO Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">SEO Score</p>
                  <p className="text-2xl font-bold text-green-600">85/100</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Indexed Pages</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <Globe className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Backlinks</p>
                  <p className="text-2xl font-bold">156</p>
                </div>
                <LinkIcon className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Organic Traffic</p>
                  <p className="text-2xl font-bold">+23%</p>
                </div>
                <Users className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="sitemap">Sitemap</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SEO Health Check */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    SEO Health Check
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Meta tags configured</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Open Graph tags active</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Twitter Cards enabled</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Structured data implemented</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm">Sitemap needs updating</span>
                  </div>
                </CardContent>
              </Card>

              {/* Recent SEO Activities */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-blue-500" />
                    Recent Activities
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-green-100 rounded">
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Meta tags updated</p>
                      <p className="text-xs text-muted-foreground">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-blue-100 rounded">
                      <Globe className="h-3 w-3 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">Sitemap generated</p>
                      <p className="text-xs text-muted-foreground">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-purple-100 rounded">
                      <LinkIcon className="h-3 w-3 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">New backlinks detected</p>
                      <p className="text-xs text-muted-foreground">3 days ago</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    onClick={handleGenerateSitemap}
                    disabled={isGenerating}
                    className="flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    Generate Sitemap
                  </Button>

                  <Button variant="outline" className="flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Preview Meta Tags
                  </Button>

                  <Button variant="outline" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    Export SEO Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  SEO Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      value={settings.siteName}
                      onChange={(e) => setSettings(prev => ({ ...prev, siteName: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="siteUrl">Site URL</Label>
                    <Input
                      id="siteUrl"
                      value={settings.siteUrl}
                      onChange={(e) => setSettings(prev => ({ ...prev, siteUrl: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitterHandle">Twitter Handle</Label>
                    <Input
                      id="twitterHandle"
                      value={settings.twitterHandle}
                      onChange={(e) => setSettings(prev => ({ ...prev, twitterHandle: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="defaultImage">Default OG Image</Label>
                    <Input
                      id="defaultImage"
                      value={settings.defaultImage}
                      onChange={(e) => setSettings(prev => ({ ...prev, defaultImage: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Default Description</Label>
                  <Textarea
                    id="description"
                    rows={3}
                    value={settings.description}
                    onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keywords">Default Keywords (comma-separated)</Label>
                  <Input
                    id="keywords"
                    value={settings.keywords.join(', ')}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                    }))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="facebookUrl">Facebook URL</Label>
                    <Input
                      id="facebookUrl"
                      value={settings.facebookUrl}
                      onChange={(e) => setSettings(prev => ({ ...prev, facebookUrl: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instagramUrl">Instagram URL</Label>
                    <Input
                      id="instagramUrl"
                      value={settings.instagramUrl}
                      onChange={(e) => setSettings(prev => ({ ...prev, instagramUrl: e.target.value }))}
                    />
                  </div>
                </div>

                <Button className="w-full">Save SEO Settings</Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sitemap Tab */}
          <TabsContent value="sitemap" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Sitemap Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Sitemap Status</p>
                    <p className="text-sm text-muted-foreground">
                      Last generated: {lastGenerated ? lastGenerated.toLocaleString() : 'Never'}
                    </p>
                  </div>
                  <Button onClick={handleGenerateSitemap} disabled={isGenerating}>
                    {isGenerating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Generate Sitemap
                      </>
                    )}
                  </Button>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium">Sitemap URLs</h3>
                  <div className="space-y-2">
                    {sitemapService.getAllUrls().map((url, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div>
                          <p className="font-mono text-sm">{url.url}</p>
                          <p className="text-xs text-muted-foreground">
                            Priority: {url.priority} • {url.changeFrequency}
                          </p>
                        </div>
                        <Badge variant="outline">Active</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Sitemaps are automatically generated and cached for 1 hour. They include all public pages and are submitted to search engines.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preview Tab */}
          <TabsContent value="preview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Meta Tag Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Google Search Preview */}
                <div>
                  <h3 className="font-medium mb-3">Google Search Result Preview</h3>
                  <div className="border rounded-lg p-4 bg-muted/50">
                    <div className="space-y-2">
                      <h4 className="text-blue-600 text-lg hover:underline cursor-pointer">
                        {preview.title}
                      </h4>
                      <p className="text-green-700 text-sm">{preview.url}</p>
                      <p className="text-gray-600 text-sm">{preview.description}</p>
                    </div>
                  </div>
                </div>

                {/* Social Media Preview */}
                <div>
                  <h3 className="font-medium mb-3">Social Media Sharing Preview</h3>
                  <div className="border rounded-lg p-4 bg-white">
                    <div className="flex gap-3">
                      <img
                        src={preview.image}
                        alt="Preview"
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{preview.title}</h4>
                        <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                          {preview.description}
                        </p>
                        <p className="text-green-700 text-xs mt-1">{preview.url}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technical Preview */}
                <div>
                  <h3 className="font-medium mb-3">Technical Meta Tags</h3>
                  <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-xs space-y-1">
                    <div><title>{preview.title}</title></div>
                    <div><meta name="description" content="{preview.description}" /></div>
                    <div><meta property="og:title" content="{preview.title}" /></div>
                    <div><meta property="og:description" content="{preview.description}" /></div>
                    <div><meta name="twitter:title" content="{preview.title}" /></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Search Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Impressions</span>
                      <span className="font-medium">12,543</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Clicks</span>
                      <span className="font-medium">1,234</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">CTR</span>
                      <span className="font-medium">9.8%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Avg. Position</span>
                      <span className="font-medium">4.2</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top Keywords</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">playnite social</span>
                      <Badge variant="secondary">1,203</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">social media platform</span>
                      <Badge variant="secondary">987</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">video reels</span>
                      <Badge variant="secondary">756</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">content sharing</span>
                      <Badge variant="secondary">543</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}