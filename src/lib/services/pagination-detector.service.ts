// src/lib/services/pagination-detector.service.ts

/**
 * Service for detecting and handling pagination patterns in web pages
 */
export class PaginationDetectorService {
  /**
   * Detect pagination patterns from HTML content
   */
  detectPagination(html: string, baseUrl: string): string[] {
    const paginationUrls: string[] = [];
    
    if (!html) return paginationUrls;

    try {
      // Pattern 1: Next button/link
      const nextPatterns = [
        /<a[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?(?:next|další|dalsi|následující|nasledujici|→|&gt;|&raquo;)[\s\S]*?<\/a>/gi,
        /<a[^>]*(?:next|další|dalsi|následující|nasledujici)[^>]*href=["']([^"']+)["'][^>]*>/gi,
      ];

      for (const pattern of nextPatterns) {
        const matches = [...html.matchAll(pattern)];
        for (const match of matches) {
          if (match[1]) {
            const url = this.normalizeUrl(match[1], baseUrl);
            if (url && !paginationUrls.includes(url)) {
              paginationUrls.push(url);
            }
          }
        }
      }

      // Pattern 2: Page numbers
      const pageNumberPatterns = [
        /<a[^>]*href=["']([^"']*page[=_]?(\d+)[^"']*)["'][^>]*>[\s\S]*?\d+[\s\S]*?<\/a>/gi,
        /<a[^>]*href=["']([^"']*\/strana[\/\-]?(\d+)[^"']*)["'][^>]*>/gi, // Czech: "strana" = page
        /<a[^>]*href=["']([^"']*\/page[\/\-]?(\d+)[^"']*)["'][^>]*>/gi,
      ];

      for (const pattern of pageNumberPatterns) {
        const matches = [...html.matchAll(pattern)];
        for (const match of matches) {
          if (match[1]) {
            const url = this.normalizeUrl(match[1], baseUrl);
            if (url && !paginationUrls.includes(url)) {
              paginationUrls.push(url);
            }
          }
        }
      }

      // Pattern 3: Load more button
      const loadMorePatterns = [
        /<button[^>]*data-url=["']([^"']+)["'][^>]*>[\s\S]*?(?:load more|zobrazit více|zobrazit vice|načíst další|nacist dalsi)[\s\S]*?<\/button>/gi,
        /<a[^>]*href=["']([^"']+)["'][^>]*>[\s\S]*?(?:load more|zobrazit více|zobrazit vice|načíst další|nacist dalsi)[\s\S]*?<\/a>/gi,
      ];

      for (const pattern of loadMorePatterns) {
        const matches = [...html.matchAll(pattern)];
        for (const match of matches) {
          if (match[1]) {
            const url = this.normalizeUrl(match[1], baseUrl);
            if (url && !paginationUrls.includes(url)) {
              paginationUrls.push(url);
            }
          }
        }
      }

      // Pattern 4: Pagination container with links
      const paginationContainerPattern = /<nav[^>]*class=["'][^"']*pagination[^"']*["'][^>]*>([\s\S]*?)<\/nav>/gi;
      const paginationMatches = [...html.matchAll(paginationContainerPattern)];
      
      for (const match of paginationMatches) {
        if (match[1]) {
          const linkPattern = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
          const linkMatches = [...match[1].matchAll(linkPattern)];
          for (const linkMatch of linkMatches) {
            if (linkMatch[1]) {
              const url = this.normalizeUrl(linkMatch[1], baseUrl);
              if (url && !paginationUrls.includes(url)) {
                paginationUrls.push(url);
              }
            }
          }
        }
      }

      // Pattern 5: Data attributes for infinite scroll
      const dataUrlPattern = /data-url=["']([^"']+)["']/gi;
      const dataUrlMatches = [...html.matchAll(dataUrlPattern)];
      for (const dataMatch of dataUrlMatches) {
        if (dataMatch[1]) {
          const url = this.normalizeUrl(dataMatch[1], baseUrl);
          if (url && !paginationUrls.includes(url)) {
            paginationUrls.push(url);
          }
        }
      }

    } catch (error) {
      console.warn('⚠️ Error detecting pagination:', error);
    }

    return paginationUrls;
  }

  /**
   * Normalize URL to absolute URL
   */
  private normalizeUrl(url: string, baseUrl: string): string | null {
    try {
      // Remove query params and fragments for pagination URLs
      const cleanUrl = url.split('?')[0].split('#')[0];
      
      // If already absolute, return as is
      if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
        return cleanUrl;
      }

      // If relative, make absolute
      const base = new URL(baseUrl);
      if (cleanUrl.startsWith('/')) {
        return `${base.origin}${cleanUrl}`;
      } else {
        return `${base.origin}${base.pathname}/${cleanUrl}`.replace(/\/+/g, '/');
      }
    } catch {
      return null;
    }
  }

  /**
   * Extract pagination URLs from markdown content
   */
  detectPaginationFromMarkdown(markdown: string, baseUrl: string): string[] {
    const paginationUrls: string[] = [];
    
    if (!markdown) return paginationUrls;

    try {
      // Pattern: [text](url) where text contains pagination keywords
      const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
      const matches = [...markdown.matchAll(linkPattern)];
      
      const paginationKeywords = [
        'next', 'další', 'dalsi', 'následující', 'nasledujici',
        'page', 'strana', 'load more', 'zobrazit více', 'zobrazit vice',
        'načíst další', 'nacist dalsi', '→', '>'
      ];

      for (const match of matches) {
        const linkText = match[1].toLowerCase();
        const linkUrl = match[2];
        
        if (paginationKeywords.some(keyword => linkText.includes(keyword.toLowerCase()))) {
          const url = this.normalizeUrl(linkUrl, baseUrl);
          if (url && !paginationUrls.includes(url)) {
            paginationUrls.push(url);
          }
        }
      }

      // Pattern: URLs with page numbers
      const pageNumberPattern = /(?:page|strana)[=_\-\/]?(\d+)/gi;
      const pageMatches = [...markdown.matchAll(pageNumberPattern)];
      for (const pageMatch of pageMatches) {
        // Try to find the URL context around this match
        const contextStart = Math.max(0, pageMatch.index! - 100);
        const contextEnd = Math.min(markdown.length, pageMatch.index! + pageMatch[0].length + 100);
        const context = markdown.substring(contextStart, contextEnd);
        
        const urlMatch = context.match(/https?:\/\/[^\s\)]+/i);
        if (urlMatch) {
          const url = this.normalizeUrl(urlMatch[0], baseUrl);
          if (url && !paginationUrls.includes(url)) {
            paginationUrls.push(url);
          }
        }
      }

    } catch (error) {
      console.warn('⚠️ Error detecting pagination from markdown:', error);
    }

    return paginationUrls;
  }

  /**
   * Detect infinite scroll patterns
   */
  detectInfiniteScroll(html: string): boolean {
    if (!html) return false;

    const infiniteScrollIndicators = [
      /data-infinite-scroll/i,
      /infinite-scroll/i,
      /load-more/i,
      /scroll-load/i,
      /data-url.*load/i,
    ];

    return infiniteScrollIndicators.some(pattern => pattern.test(html));
  }

  /**
   * Get all pagination URLs from both HTML and markdown
   */
  getAllPaginationUrls(html: string, markdown: string, baseUrl: string): string[] {
    const urls = new Set<string>();
    
    const htmlUrls = this.detectPagination(html, baseUrl);
    htmlUrls.forEach(url => urls.add(url));
    
    const markdownUrls = this.detectPaginationFromMarkdown(markdown, baseUrl);
    markdownUrls.forEach(url => urls.add(url));
    
    return Array.from(urls);
  }
}

// Export singleton instance
export const paginationDetectorService = new PaginationDetectorService();

