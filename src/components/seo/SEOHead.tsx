"use client";

import { useEffect } from 'react';
import Head from 'next/head';
import { SEOMetadata, seoService } from '@/lib/services/seo-service';

interface SEOHeadProps {
  metadata: SEOMetadata;
  children?: React.ReactNode;
}

export function SEOHead({ metadata, children }: SEOHeadProps) {
  const metaTags = seoService.generateMetaTags(metadata);
  const jsonLdScripts = seoService.generateJSONLDScripts(metadata.structuredData || []);

  useEffect(() => {
    // Update document title
    if (metadata.title) {
      document.title = metadata.title;
    }

    // Update meta tags dynamically
    const existingMetaTags = document.querySelectorAll('meta[data-seo-managed]');
    existingMetaTags.forEach(tag => tag.remove());

    metaTags.forEach(tag => {
      const meta = document.createElement('meta');
      meta.setAttribute('data-seo-managed', 'true');

      if (tag.name) meta.setAttribute('name', tag.name);
      if (tag.property) meta.setAttribute('property', tag.property);
      if (tag.httpEquiv) meta.setAttribute('http-equiv', tag.httpEquiv);
      meta.setAttribute('content', tag.content);

      document.head.appendChild(meta);
    });

    // Add JSON-LD scripts
    const existingScripts = document.querySelectorAll('script[data-seo-ld]');
    existingScripts.forEach(script => script.remove());

    jsonLdScripts.forEach(scriptContent => {
      const script = document.createElement('script');
      script.setAttribute('data-seo-ld', 'true');
      script.type = 'application/ld+json';
      script.textContent = scriptContent;
      document.head.appendChild(script);
    });

    // Cleanup function
    return () => {
      const managedMeta = document.querySelectorAll('meta[data-seo-managed]');
      managedMeta.forEach(tag => tag.remove());

      const managedScripts = document.querySelectorAll('script[data-seo-ld]');
      managedScripts.forEach(script => script.remove());
    };
  }, [metadata, metaTags, jsonLdScripts]);

  return (
    <Head>
      {/* Basic meta tags handled by Next.js metadata API */}
      {metadata.title && <title>{metadata.title}</title>}
      {metadata.description && <meta name="description" content={metadata.description} />}
      {metadata.keywords && metadata.keywords.length > 0 && (
        <meta name="keywords" content={metadata.keywords.join(', ')} />
      )}
      {metadata.canonical && <link rel="canonical" href={metadata.canonical} />}
      {metadata.robots && <meta name="robots" content={metadata.robots} />}

      {/* Open Graph tags */}
      {metadata.openGraph && (
        <>
          {metadata.openGraph.title && <meta property="og:title" content={metadata.openGraph.title} />}
          {metadata.openGraph.description && <meta property="og:description" content={metadata.openGraph.description} />}
          {metadata.openGraph.url && <meta property="og:url" content={metadata.openGraph.url} />}
          {metadata.openGraph.type && <meta property="og:type" content={metadata.openGraph.type} />}
          {metadata.openGraph.image && <meta property="og:image" content={metadata.openGraph.image} />}
          {metadata.openGraph.siteName && <meta property="og:site_name" content={metadata.openGraph.siteName} />}
          {metadata.openGraph.locale && <meta property="og:locale" content={metadata.openGraph.locale} />}

          {/* Article-specific Open Graph tags */}
          {metadata.openGraph['article:author'] && (
            <meta property="article:author" content={metadata.openGraph['article:author']} />
          )}
          {metadata.openGraph['article:published_time'] && (
            <meta property="article:published_time" content={metadata.openGraph['article:published_time']} />
          )}
          {metadata.openGraph['article:modified_time'] && (
            <meta property="article:modified_time" content={metadata.openGraph['article:modified_time']} />
          )}
          {metadata.openGraph['article:section'] && (
            <meta property="article:section" content={metadata.openGraph['article:section']} />
          )}
          {metadata.openGraph['article:tag'] && metadata.openGraph['article:tag'].map((tag, index) => (
            <meta key={index} property="article:tag" content={tag} />
          ))}

          {/* Video-specific Open Graph tags */}
          {metadata.openGraph['video:duration'] && (
            <meta property="video:duration" content={metadata.openGraph['video:duration'].toString()} />
          )}
          {metadata.openGraph['video:release_date'] && (
            <meta property="video:release_date" content={metadata.openGraph['video:release_date']} />
          )}
        </>
      )}

      {/* Twitter Card tags */}
      {metadata.twitter && (
        <>
          {metadata.twitter.card && <meta name="twitter:card" content={metadata.twitter.card} />}
          {metadata.twitter.site && <meta name="twitter:site" content={metadata.twitter.site} />}
          {metadata.twitter.creator && <meta name="twitter:creator" content={metadata.twitter.creator} />}
          {metadata.twitter.title && <meta name="twitter:title" content={metadata.twitter.title} />}
          {metadata.twitter.description && <meta name="twitter:description" content={metadata.twitter.description} />}
          {metadata.twitter.image && <meta name="twitter:image" content={metadata.twitter.image} />}

          {/* Player-specific Twitter tags */}
          {metadata.twitter['player'] && <meta name="twitter:player" content={metadata.twitter['player']} />}
          {metadata.twitter['player:width'] && (
            <meta name="twitter:player:width" content={metadata.twitter['player:width'].toString()} />
          )}
          {metadata.twitter['player:height'] && (
            <meta name="twitter:player:height" content={metadata.twitter['player:height'].toString()} />
          )}
        </>
      )}

      {/* Additional custom meta tags */}
      {metadata.additionalMeta && metadata.additionalMeta.map((tag, index) => (
        <meta
          key={index}
          name={tag.name}
          property={tag.property}
          httpEquiv={tag.httpEquiv}
          content={tag.content}
        />
      ))}

      {/* JSON-LD Structured Data */}
      {metadata.structuredData && metadata.structuredData.map((data, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}

      {/* Custom children */}
      {children}
    </Head>
  );
}

/**
 * Hook to generate SEO metadata for a page
 */
export function useSEO(config: Parameters<typeof seoService.generateMetadata>[0]) {
  return seoService.generateMetadata(config);
}