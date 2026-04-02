export * from './tokens';

export interface DesignSystemConfig {
  name: string;
  version: string;
  tokens: any;
}

export class DesignSystem {
  private config: DesignSystemConfig;

  constructor(config: DesignSystemConfig) {
    this.config = config;
  }

  getTokens() {
    return this.config.tokens;
  }

  getComponentVariants(componentName: string) {
    return this.config.tokens.components?.[componentName]?.variants || {};
  }
}
