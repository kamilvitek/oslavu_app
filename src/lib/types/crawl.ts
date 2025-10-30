export type WaitForCondition =
  | { type: 'selector'; selector: string; timeoutMs?: number }
  | { type: 'networkIdle'; timeoutMs?: number }
  | { type: 'delay'; ms: number };

export type ClickAction = {
  type: 'click';
  selector: string;
  waitFor?: WaitForCondition | WaitForCondition[];
};

export type ScrollAction = {
  type: 'scroll';
  pixels?: number;
  to?: 'bottom' | 'top';
  repeat?: number;
  waitMs?: number;
};

export type WaitForAction = {
  type: 'waitFor';
  selector?: string;
  condition?: WaitForCondition;
};

export type RepeatAction = {
  type: 'repeat';
  until?: { timeoutMs?: number; maxRepeats?: number };
  actions: Action[];
};

export type Action = ClickAction | ScrollAction | WaitForAction | RepeatAction;

export type PatternRules = {
  allowList?: string[];
  denyList?: string[];
};

export interface CrawlConfig extends PatternRules {
  startUrls: string[];
  maxDepth?: number;
  maxPages?: number;
  actions?: Action[];
  waitFor?: WaitForCondition | WaitForCondition[];
  // heuristics for classifying pages
  listingSelectors?: string[];
  detailUrlPatterns?: string[];
}

export interface CrawlResultPage {
  url: string;
  content: string;
  title?: string;
  html?: string;
  discoveredUrls?: string[];
}

export type SitePresetKey = 'kudyznudy' | 'goout' | 'ticketportal' | 'generic';


