import { UISpec, UIComponent } from '../models/ui-spec';

export class UIBuilderAgent {
  async buildComponents(spec: UISpec): Promise<UIComponent[]> {
    return spec.components.map(comp => ({
      ...comp,
      styles: this.generateStyles(comp)
    }));
  }

  private generateStyles(component: UIComponent): Record<string, string> {
    const baseStyles: Record<string, string> = {
      display: 'flex',
      flexDirection: 'row',
      padding: '16px',
      borderRadius: '8px'
    };

    switch (component.type) {
      case 'BUTTON':
        return { ...baseStyles, backgroundColor: '#007AFF', color: '#FFFFFF' };
      case 'CARD':
        return { ...baseStyles, backgroundColor: '#F5F5F5', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' };
      default:
        return baseStyles;
    }
  }

  async generateCode(components: UIComponent[]): Promise<string> {
    return `// Generated UI Code\nexport const components = ${JSON.stringify(components, null, 2)};`;
  }
}
