import { RuleDefinition, RuleCategory } from '../types';

/**
 * Registry for managing rule definitions and providing factory methods
 */
export class RuleRegistry {
  private static instance: RuleRegistry;
  private ruleDefinitions: Map<string, RuleDefinition> = new Map();

  private constructor() {}

  static getInstance(): RuleRegistry {
    if (!RuleRegistry.instance) {
      RuleRegistry.instance = new RuleRegistry();
    }
    return RuleRegistry.instance;
  }

  /**
   * Register a rule definition
   */
  register(definition: RuleDefinition): void {
    this.validateDefinition(definition);
    this.ruleDefinitions.set(definition.id, definition);
  }

  /**
   * Get a rule definition by ID
   */
  getRule(id: string): RuleDefinition | undefined {
    return this.ruleDefinitions.get(id);
  }

  /**
   * Get all rule definitions for a category
   */
  getRulesByCategory(category: RuleCategory): RuleDefinition[] {
    return Array.from(this.ruleDefinitions.values())
      .filter(rule => rule.category === category && rule.enabled);
  }

  /**
   * Get all rule definitions
   */
  getAllRules(): RuleDefinition[] {
    return Array.from(this.ruleDefinitions.values());
  }

  /**
   * Check if a rule exists
   */
  hasRule(id: string): boolean {
    return this.ruleDefinitions.has(id);
  }

  /**
   * Remove a rule definition
   */
  removeRule(id: string): boolean {
    return this.ruleDefinitions.delete(id);
  }

  /**
   * Enable or disable a rule
   */
  setRuleEnabled(id: string, enabled: boolean): boolean {
    const rule = this.ruleDefinitions.get(id);
    if (rule) {
      rule.enabled = enabled;
      return true;
    }
    return false;
  }

  /**
   * Get rule statistics
   */
  getStats() {
    const rules = Array.from(this.ruleDefinitions.values());
    const categories = rules.reduce((acc, rule) => {
      acc[rule.category] = (acc[rule.category] || 0) + 1;
      return acc;
    }, {} as Record<RuleCategory, number>);

    return {
      totalRules: rules.length,
      enabledRules: rules.filter(r => r.enabled).length,
      disabledRules: rules.filter(r => !r.enabled).length,
      categories
    };
  }

  private validateDefinition(definition: RuleDefinition): void {
    if (!definition.id || !definition.name || !definition.category) {
      throw new Error('Rule definition must have id, name, and category');
    }

    if (!definition.conditions || !Array.isArray(definition.conditions)) {
      throw new Error('Rule definition must have conditions array');
    }

    if (!definition.actions || !Array.isArray(definition.actions)) {
      throw new Error('Rule definition must have actions array');
    }
  }
}