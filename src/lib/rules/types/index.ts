// Core rule engine types and interfaces

export interface RuleContext {
  user?: any;
  request?: any;
  data?: any;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata?: Record<string, any>;
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  value?: any;
  constraints?: Record<string, any>;
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  suggestion?: string;
}

export interface RuleDefinition<T = any> {
  id: string;
  name: string;
  description: string;
  category: RuleCategory;
  priority: number;
  enabled: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  metadata?: Record<string, any>;
  tags?: string[];
}

export interface RuleCondition {
  field: string;
  operator: RuleOperator;
  value: any;
  logicalOperator?: LogicalOperator;
}

export interface RuleAction {
  type: ActionType;
  target: string;
  value?: any;
  config?: Record<string, any>;
}

export type RuleCategory =
  | 'content'
  | 'user'
  | 'business'
  | 'security'
  | 'performance'
  | 'validation';

export type RuleOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_equal'
  | 'less_equal'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'regex'
  | 'in'
  | 'not_in'
  | 'exists'
  | 'not_exists'
  | 'is_empty'
  | 'is_not_empty';

export type LogicalOperator = 'AND' | 'OR' | 'NOT';

export type ActionType =
  | 'validate'
  | 'transform'
  | 'reject'
  | 'approve'
  | 'flag'
  | 'log'
  | 'notify'
  | 'block'
  | 'allow'
  | 'modify';

export interface RuleExecutionResult {
  ruleId: string;
  success: boolean;
  result: ValidationResult;
  executionTime: number;
  triggeredActions: RuleAction[];
  metadata?: Record<string, any>;
}

export interface RuleEngineConfig {
  enableCaching: boolean;
  cacheTimeout: number;
  maxExecutionTime: number;
  enableParallelExecution: boolean;
  maxParallelRules: number;
  enableMetrics: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface RuleEngineStats {
  totalRules: number;
  activeRules: number;
  totalExecutions: number;
  averageExecutionTime: number;
  cacheHitRate: number;
  errorRate: number;
  categoryBreakdown: Record<RuleCategory, number>;
}