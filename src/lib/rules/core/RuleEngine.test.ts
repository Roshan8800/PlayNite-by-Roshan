import { RuleEngine } from './RuleEngine';
import { RuleDefinition, RuleContext } from '../types';

describe('RuleEngine', () => {
  let ruleEngine: RuleEngine;

  beforeEach(() => {
    ruleEngine = new RuleEngine({
      enableCaching: false,
      cacheTimeout: 300000,
      maxExecutionTime: 5000,
      enableParallelExecution: false,
      maxParallelRules: 10,
      enableMetrics: true,
      logLevel: 'error'
    });
  });

  describe('Rule Registration', () => {
    it('should register a valid rule', () => {
      const rule: RuleDefinition = {
        id: 'test_rule',
        name: 'Test Rule',
        description: 'A test rule',
        category: 'content',
        priority: 100,
        enabled: true,
        conditions: [
          {
            field: 'data.test',
            operator: 'equals',
            value: 'test_value'
          }
        ],
        actions: [
          {
            type: 'validate',
            target: 'data.test',
            value: 'test_value'
          }
        ]
      };

      expect(() => ruleEngine.registerRule(rule)).not.toThrow();
    });

    it('should reject invalid rule definitions', () => {
      const invalidRule = {
        id: '',
        name: 'Invalid Rule',
        category: 'content'
      } as RuleDefinition;

      expect(() => ruleEngine.registerRule(invalidRule)).toThrow();
    });

    it('should unregister rules', () => {
      const rule: RuleDefinition = {
        id: 'test_rule',
        name: 'Test Rule',
        description: 'A test rule',
        category: 'content',
        priority: 100,
        enabled: true,
        conditions: [],
        actions: []
      };

      ruleEngine.registerRule(rule);
      const result = ruleEngine.unregisterRule('test_rule');
      expect(result).toBe(true);
    });
  });

  describe('Rule Execution', () => {
    it('should execute rules and return results', async () => {
      const rule: RuleDefinition = {
        id: 'test_rule',
        name: 'Test Rule',
        description: 'A test rule',
        category: 'content',
        priority: 100,
        enabled: true,
        conditions: [
          {
            field: 'data.test',
            operator: 'equals',
            value: 'test_value'
          }
        ],
        actions: [
          {
            type: 'validate',
            target: 'data.test',
            value: 'test_value'
          }
        ]
      };

      ruleEngine.registerRule(rule);

      const context: RuleContext = {
        data: { test: 'test_value' },
        metadata: { timestamp: new Date() }
      };

      const results = await ruleEngine.executeRules(context);
      expect(results).toHaveLength(1);
      expect(results[0].ruleId).toBe('test_rule');
      expect(results[0].success).toBe(true);
    });

    it('should handle rule execution errors gracefully', async () => {
      const rule: RuleDefinition = {
        id: 'error_rule',
        name: 'Error Rule',
        description: 'A rule that throws errors',
        category: 'content',
        priority: 100,
        enabled: true,
        conditions: [],
        actions: []
      };

      ruleEngine.registerRule(rule);

      const context: RuleContext = {
        data: {},
        metadata: { timestamp: new Date() }
      };

      const results = await ruleEngine.executeRules(context);
      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });
  });

  describe('Rule Validation', () => {
    it('should validate data against registered rules', async () => {
      const rule: RuleDefinition = {
        id: 'validation_rule',
        name: 'Validation Rule',
        description: 'A validation rule',
        category: 'user',
        priority: 100,
        enabled: true,
        conditions: [
          {
            field: 'data.email',
            operator: 'exists',
            value: true
          }
        ],
        actions: [
          {
            type: 'validate',
            target: 'data.email',
            config: { required: true }
          }
        ]
      };

      ruleEngine.registerRule(rule);

      const context: RuleContext = {
        data: { email: 'test@example.com' },
        metadata: { timestamp: new Date() }
      };

      const result = await ruleEngine.validate(context);
      expect(result.isValid).toBe(true);
    });

    it('should return validation errors for invalid data', async () => {
      const rule: RuleDefinition = {
        id: 'validation_rule',
        name: 'Validation Rule',
        description: 'A validation rule',
        category: 'user',
        priority: 100,
        enabled: true,
        conditions: [
          {
            field: 'data.email',
            operator: 'exists',
            value: true
          }
        ],
        actions: [
          {
            type: 'validate',
            target: 'data.email',
            config: { required: true }
          }
        ]
      };

      ruleEngine.registerRule(rule);

      const context: RuleContext = {
        data: {},
        metadata: { timestamp: new Date() }
      };

      const result = await ruleEngine.validate(context);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Metrics', () => {
    it('should track execution metrics', async () => {
      const rule: RuleDefinition = {
        id: 'metrics_rule',
        name: 'Metrics Rule',
        description: 'A rule for testing metrics',
        category: 'content',
        priority: 100,
        enabled: true,
        conditions: [],
        actions: []
      };

      ruleEngine.registerRule(rule);

      const context: RuleContext = {
        data: { test: 'value' },
        metadata: { timestamp: new Date() }
      };

      await ruleEngine.executeRules(context);
      const stats = ruleEngine.getStats();

      expect(stats.totalExecutions).toBe(1);
      expect(stats.totalRules).toBe(1);
    });

    it('should reset metrics', async () => {
      const rule: RuleDefinition = {
        id: 'reset_rule',
        name: 'Reset Rule',
        description: 'A rule for testing reset',
        category: 'content',
        priority: 100,
        enabled: true,
        conditions: [],
        actions: []
      };

      ruleEngine.registerRule(rule);

      const context: RuleContext = {
        data: { test: 'value' },
        metadata: { timestamp: new Date() }
      };

      await ruleEngine.executeRules(context);
      expect(ruleEngine.getStats().totalExecutions).toBe(1);

      ruleEngine.resetMetrics();
      expect(ruleEngine.getStats().totalExecutions).toBe(0);
    });
  });

  describe('Caching', () => {
    it('should cache results when enabled', async () => {
      const cachedEngine = new RuleEngine({
        enableCaching: true,
        cacheTimeout: 300000,
        maxExecutionTime: 5000,
        enableParallelExecution: false,
        maxParallelRules: 10,
        enableMetrics: false,
        logLevel: 'error'
      });

      const rule: RuleDefinition = {
        id: 'cache_rule',
        name: 'Cache Rule',
        description: 'A rule for testing caching',
        category: 'content',
        priority: 100,
        enabled: true,
        conditions: [],
        actions: []
      };

      cachedEngine.registerRule(rule);

      const context: RuleContext = {
        data: { test: 'value' },
        metadata: { timestamp: new Date() }
      };

      // First execution
      await cachedEngine.executeRules(context);
      // Second execution should use cache
      await cachedEngine.executeRules(context);

      const stats = cachedEngine.getStats();
      expect(stats.cacheHitRate).toBeGreaterThan(0);
    });
  });
});