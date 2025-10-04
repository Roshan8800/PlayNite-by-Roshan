import {
  RuleDefinition,
  RuleContext,
  ValidationResult,
  RuleExecutionResult,
  RuleEngineConfig,
  RuleEngineStats,
  RuleCategory,
  ValidationError,
  ValidationWarning,
  RuleCondition,
  RuleAction,
  RuleOperator,
  LogicalOperator,
  ActionType
} from '../types';

export class RuleEngine {
  private rules: Map<string, RuleDefinition> = new Map();
  private cache: Map<string, { result: ValidationResult; timestamp: number }> = new Map();
  private executionMetrics: {
    totalExecutions: number;
    totalExecutionTime: number;
    errors: number;
    cacheHits: number;
  } = {
    totalExecutions: 0,
    totalExecutionTime: 0,
    errors: 0,
    cacheHits: 0
  };

  constructor(private config: RuleEngineConfig = {
    enableCaching: true,
    cacheTimeout: 300000, // 5 minutes
    maxExecutionTime: 5000, // 5 seconds
    enableParallelExecution: true,
    maxParallelRules: 10,
    enableMetrics: true,
    logLevel: 'info'
  }) {}

  /**
   * Register a new rule in the engine
   */
  registerRule(rule: RuleDefinition): void {
    this.validateRuleDefinition(rule);
    this.rules.set(rule.id, rule);

    if (this.config.enableCaching) {
      this.cache.clear(); // Clear cache when rules change
    }
  }

  /**
   * Unregister a rule from the engine
   */
  unregisterRule(ruleId: string): boolean {
    const deleted = this.rules.delete(ruleId);

    if (deleted && this.config.enableCaching) {
      this.cache.clear();
    }

    return deleted;
  }

  /**
   * Get all registered rules
   */
  getRules(category?: RuleCategory): RuleDefinition[] {
    const rules = Array.from(this.rules.values());

    if (category) {
      return rules.filter(rule => rule.category === category && rule.enabled);
    }

    return rules.filter(rule => rule.enabled);
  }

  /**
   * Execute rules against provided context
   */
  async executeRules(context: RuleContext, category?: RuleCategory): Promise<RuleExecutionResult[]> {
    const startTime = Date.now();
    const applicableRules = this.getApplicableRules(context, category);

    if (applicableRules.length === 0) {
      return [];
    }

    const cacheKey = this.generateCacheKey(context, category);

    // Check cache if enabled
    if (this.config.enableCaching && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;
      const isExpired = Date.now() - cached.timestamp > this.config.cacheTimeout;

      if (!isExpired) {
        this.executionMetrics.cacheHits++;
        return applicableRules.map(rule => ({
          ruleId: rule.id,
          success: true,
          result: cached.result,
          executionTime: 0,
          triggeredActions: [],
          metadata: { cached: true }
        }));
      }
    }

    try {
      let results: RuleExecutionResult[];

      if (this.config.enableParallelExecution && applicableRules.length > 1) {
        results = await this.executeRulesInParallel(applicableRules, context);
      } else {
        results = await this.executeRulesSequentially(applicableRules, context);
      }

      // Cache results if enabled
      if (this.config.enableCaching) {
        const combinedResult = this.combineValidationResults(results.map(r => r.result));
        this.cache.set(cacheKey, {
          result: combinedResult,
          timestamp: Date.now()
        });
      }

      const totalTime = Date.now() - startTime;
      this.updateMetrics(totalTime, 0);

      return results;
    } catch (error) {
      this.updateMetrics(Date.now() - startTime, 1);
      throw new Error(`Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate data against rules
   */
  async validate(context: RuleContext, category?: RuleCategory): Promise<ValidationResult> {
    const results = await this.executeRules(context, category);
    return this.combineValidationResults(results.map(r => r.result));
  }

  /**
   * Get engine statistics
   */
  getStats(): RuleEngineStats {
    const rules = Array.from(this.rules.values());
    const categoryBreakdown = rules.reduce((acc, rule) => {
      acc[rule.category] = (acc[rule.category] || 0) + 1;
      return acc;
    }, {} as Record<RuleCategory, number>);

    return {
      totalRules: rules.length,
      activeRules: rules.filter(r => r.enabled).length,
      totalExecutions: this.executionMetrics.totalExecutions,
      averageExecutionTime: this.executionMetrics.totalExecutions > 0
        ? this.executionMetrics.totalExecutionTime / this.executionMetrics.totalExecutions
        : 0,
      cacheHitRate: this.executionMetrics.totalExecutions > 0
        ? this.executionMetrics.cacheHits / this.executionMetrics.totalExecutions
        : 0,
      errorRate: this.executionMetrics.totalExecutions > 0
        ? this.executionMetrics.errors / this.executionMetrics.totalExecutions
        : 0,
      categoryBreakdown
    };
  }

  /**
   * Clear execution cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Reset engine metrics
   */
  resetMetrics(): void {
    this.executionMetrics = {
      totalExecutions: 0,
      totalExecutionTime: 0,
      errors: 0,
      cacheHits: 0
    };
  }

  private getApplicableRules(context: RuleContext, category?: RuleCategory): RuleDefinition[] {
    let rules = Array.from(this.rules.values()).filter(rule => rule.enabled);

    if (category) {
      rules = rules.filter(rule => rule.category === category);
    }

    // Sort by priority (higher priority first)
    return rules.sort((a, b) => b.priority - a.priority);
  }

  private async executeRulesSequentially(rules: RuleDefinition[], context: RuleContext): Promise<RuleExecutionResult[]> {
    const results: RuleExecutionResult[] = [];

    for (const rule of rules) {
      const ruleStartTime = Date.now();
      try {
        const result = await this.executeRule(rule, context);
        results.push({
          ruleId: rule.id,
          success: true,
          result: result.validationResult,
          executionTime: Date.now() - ruleStartTime,
          triggeredActions: result.triggeredActions,
          metadata: result.metadata
        });
      } catch (error) {
        results.push({
          ruleId: rule.id,
          success: false,
          result: {
            isValid: false,
            errors: [{
              field: 'rule_execution',
              code: 'EXECUTION_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error',
              severity: 'error'
            }],
            warnings: []
          },
          executionTime: Date.now() - ruleStartTime,
          triggeredActions: []
        });
      }
    }

    return results;
  }

  private async executeRulesInParallel(rules: RuleDefinition[], context: RuleContext): Promise<RuleExecutionResult[]> {
    const batches = this.chunkArray(rules, this.config.maxParallelRules);
    const allResults: RuleExecutionResult[] = [];

    for (const batch of batches) {
      const batchPromises = batch.map(rule => this.executeSingleRule(rule, context));
      const batchResults = await Promise.all(batchPromises);
      allResults.push(...batchResults);
    }

    return allResults;
  }

  private async executeSingleRule(rule: RuleDefinition, context: RuleContext): Promise<RuleExecutionResult> {
    const startTime = Date.now();

    try {
      const result = await this.executeRule(rule, context);
      return {
        ruleId: rule.id,
        success: true,
        result: result.validationResult,
        executionTime: Date.now() - startTime,
        triggeredActions: result.triggeredActions,
        metadata: result.metadata
      };
    } catch (error) {
      return {
        ruleId: rule.id,
        success: false,
        result: {
          isValid: false,
          errors: [{
            field: 'rule_execution',
            code: 'EXECUTION_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
            severity: 'error'
          }],
          warnings: []
        },
        executionTime: Date.now() - startTime,
        triggeredActions: []
      };
    }
  }

  private async executeRule(rule: RuleDefinition, context: RuleContext): Promise<{
    validationResult: ValidationResult;
    triggeredActions: RuleAction[];
    metadata: Record<string, any>;
  }> {
    const triggeredActions: RuleAction[] = [];
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Evaluate conditions
    const conditionsMet = this.evaluateConditions(rule.conditions, context);

    if (!conditionsMet) {
      return {
        validationResult: { isValid: true, errors: [], warnings: [] },
        triggeredActions: [],
        metadata: { conditions_not_met: true }
      };
    }

    // Execute actions
    for (const action of rule.actions) {
      try {
        const actionResult = await this.executeAction(action, context);
        if (actionResult.validationResult) {
          errors.push(...actionResult.validationResult.errors);
          warnings.push(...actionResult.validationResult.warnings);
        }
        if (actionResult.triggered) {
          triggeredActions.push(action);
        }
      } catch (error) {
        errors.push({
          field: action.target,
          code: 'ACTION_ERROR',
          message: `Failed to execute action: ${error instanceof Error ? error.message : 'Unknown error'}`,
          severity: 'error'
        });
      }
    }

    const validationResult: ValidationResult = {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings,
      metadata: { rule_id: rule.id, conditions_evaluated: rule.conditions.length }
    };

    return {
      validationResult,
      triggeredActions,
      metadata: { rule_id: rule.id, actions_executed: triggeredActions.length }
    };
  }

  private evaluateConditions(conditions: RuleCondition[], context: RuleContext): boolean {
    if (conditions.length === 0) return true;

    let result = true;

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, context);

      if (condition.logicalOperator === 'OR') {
        result = result || conditionResult;
      } else if (condition.logicalOperator === 'NOT') {
        result = !conditionResult;
      } else {
        // Default to AND
        result = result && conditionResult;
      }
    }

    return result;
  }

  private evaluateCondition(condition: RuleCondition, context: RuleContext): boolean {
    const { field, operator, value } = condition;
    const fieldValue = this.getFieldValue(field, context);

    switch (operator) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      case 'greater_equal':
        return Number(fieldValue) >= Number(value);
      case 'less_equal':
        return Number(fieldValue) <= Number(value);
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'not_contains':
        return !String(fieldValue).includes(String(value));
      case 'starts_with':
        return String(fieldValue).startsWith(String(value));
      case 'ends_with':
        return String(fieldValue).endsWith(String(value));
      case 'regex':
        return new RegExp(value).test(String(fieldValue));
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null;
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null;
      case 'is_empty':
        return fieldValue === '' || fieldValue === null || fieldValue === undefined;
      case 'is_not_empty':
        return fieldValue !== '' && fieldValue !== null && fieldValue !== undefined;
      default:
        return false;
    }
  }

  private getFieldValue(field: string, context: RuleContext): any {
    const parts = field.split('.');
    let value: any = context;

    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  private async executeAction(action: RuleAction, context: RuleContext): Promise<{
    validationResult?: ValidationResult;
    triggered: boolean;
  }> {
    // This is a simplified implementation
    // In a real system, you'd have specific action handlers
    switch (action.type) {
      case 'validate':
        return {
          validationResult: await this.validateField(action.target, action.value, context),
          triggered: true
        };
      case 'log':
        console.log(`Rule action: ${action.type} on ${action.target}`, action.config);
        return { triggered: true };
      default:
        return { triggered: false };
    }
  }

  private async validateField(field: string, constraints: any, context: RuleContext): Promise<ValidationResult> {
    // Simplified field validation
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const value = this.getFieldValue(field, context);

    if (constraints?.required && (value === undefined || value === null || value === '')) {
      errors.push({
        field,
        code: 'REQUIRED',
        message: `${field} is required`,
        severity: 'error',
        value
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  private combineValidationResults(results: ValidationResult[]): ValidationResult {
    const allErrors = results.flatMap(r => r.errors);
    const allWarnings = results.flatMap(r => r.warnings);

    return {
      isValid: allErrors.filter(e => e.severity === 'error').length === 0,
      errors: allErrors,
      warnings: allWarnings,
      metadata: {
        total_rules_evaluated: results.length,
        total_errors: allErrors.length,
        total_warnings: allWarnings.length
      }
    };
  }

  private generateCacheKey(context: RuleContext, category?: RuleCategory): string {
    const contextStr = JSON.stringify({
      user: context.user?.id,
      data: context.data,
      category
    });
    return Buffer.from(contextStr).toString('base64');
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private validateRuleDefinition(rule: RuleDefinition): void {
    if (!rule.id || !rule.name || !rule.category) {
      throw new Error('Rule must have id, name, and category');
    }

    if (rule.conditions.length === 0 && rule.actions.length === 0) {
      throw new Error('Rule must have at least one condition or action');
    }
  }

  private updateMetrics(executionTime: number, errors: number): void {
    this.executionMetrics.totalExecutions++;
    this.executionMetrics.totalExecutionTime += executionTime;
    this.executionMetrics.errors += errors;
  }
}