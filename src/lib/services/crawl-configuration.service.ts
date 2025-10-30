import { CrawlConfig, SitePresetKey } from "@/lib/types/crawl";

type PartialCrawlConfig = Partial<CrawlConfig> & { startUrls?: string[] };

export class CrawlConfigurationService {
  static getPresetForHost(hostname: string): SitePresetKey {
    const host = hostname.toLowerCase();
    if (host.includes("kudyznudy")) return "kudyznudy";
    if (host.includes("goout")) return "goout";
    if (host.includes("ticketportal")) return "ticketportal";
    return "generic";
  }

  static buildPreset(preset: SitePresetKey): PartialCrawlConfig {
    const consentActions = [
      {
        type: "repeat" as const,
        until: { timeoutMs: 3000, maxRepeats: 1 },
        actions: [
          { type: "click" as const, selector: "button[aria-label='Accept all']" },
          { type: "click" as const, selector: "button:has-text('Accept all')" },
          { type: "click" as const, selector: "button:has-text('Souhlasím')" },
          { type: "click" as const, selector: "button:has-text('Přijmout vše')" },
          { type: "click" as const, selector: "#onetrust-accept-btn-handler" },
        ],
      },
    ];
    switch (preset) {
      case "kudyznudy":
        return {
          maxDepth: 2,
          allowList: ["/akce/", "/kalendar/", "/co-se-deje/"],
          denyList: ["/kontakt", "/gdpr", "/prihlaseni"],
          listingSelectors: [".event-card", ".listing-item"],
          detailUrlPatterns: ["/akce/"],
          actions: [
            ...consentActions,
            { type: "waitFor", selector: ".listing-item" },
          ],
        };
      case "goout":
        return {
          maxDepth: 2,
          allowList: ["/events", "/event/"],
          denyList: ["/privacy", "/cookies"],
          listingSelectors: ["[data-testid='eventCard']", ".EventCard"],
          detailUrlPatterns: ["/event/"],
          actions: [
            ...consentActions,
            { type: "waitFor", selector: "[data-testid='eventCard']" },
            { type: "scroll", pixels: 1200, repeat: 8, waitMs: 500 },
          ],
        };
      case "ticketportal":
        return {
          maxDepth: 2,
          allowList: ["/event", "/vstupenky"],
          denyList: ["/gdpr", "/cookies"],
          listingSelectors: [".event-item", ".event-list-item"],
          detailUrlPatterns: ["/event/", "/detail/"],
          actions: [
            ...consentActions,
            { type: "waitFor", selector: ".event-item, .event-list-item" },
          ],
        };
      default:
        return {
          maxDepth: 1,
          actions: [...consentActions, { type: "waitFor", selector: "a" }],
        };
    }
  }

  static mergeConfig(dbConfig: PartialCrawlConfig | null | undefined, preset: PartialCrawlConfig): CrawlConfig {
    const merged: CrawlConfig = {
      startUrls: dbConfig?.startUrls ?? [],
      maxDepth: dbConfig?.maxDepth ?? preset.maxDepth,
      maxPages: dbConfig?.maxPages ?? preset.maxPages,
      allowList: [...(preset.allowList ?? []), ...(dbConfig?.allowList ?? [])],
      denyList: [...(preset.denyList ?? []), ...(dbConfig?.denyList ?? [])],
      actions: [...(preset.actions ?? []), ...(dbConfig?.actions ?? [])],
      waitFor: dbConfig?.waitFor ?? preset.waitFor,
      listingSelectors: dbConfig?.listingSelectors ?? preset.listingSelectors,
      detailUrlPatterns: dbConfig?.detailUrlPatterns ?? preset.detailUrlPatterns,
    };
    return merged;
  }

  static validateConfig(config: CrawlConfig): void {
    if (!config.startUrls || config.startUrls.length === 0) {
      throw new Error("CrawlConfig.startUrls is required and cannot be empty");
    }
    if (config.maxDepth !== undefined && config.maxDepth < 0) {
      throw new Error("CrawlConfig.maxDepth cannot be negative");
    }
    if (config.maxPages !== undefined && config.maxPages <= 0) {
      throw new Error("CrawlConfig.maxPages must be positive if provided");
    }
  }
}


