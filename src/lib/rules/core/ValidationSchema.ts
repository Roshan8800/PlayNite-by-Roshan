import { ValidationResult, ValidationError, ValidationWarning } from '../types';

/**
 * Validation schema for defining field validation rules
 */
export interface FieldSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'date' | 'email' | 'url';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: any[];
  custom?: (value: any) => ValidationResult;
  sanitize?: (value: any) => any;
  default?: any;
  allowEmpty?: boolean;
  trim?: boolean;
  lowercase?: boolean;
  uppercase?: boolean;
}

/**
 * Schema definition for validating objects
 */
export interface SchemaDefinition {
  [fieldName: string]: FieldSchema | SchemaDefinition;
}

/**
 * Validation schema class for structured validation
 */
export class ValidationSchema {
  constructor(private schema: SchemaDefinition) {}

  /**
   * Validate data against the schema
   */
  validate(data: any): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    this.validateObject(data, this.schema, '', errors, warnings);

    return {
      isValid: errors.filter(e => e.severity === 'error').length === 0,
      errors,
      warnings
    };
  }

  /**
   * Sanitize data according to schema rules
   */
  sanitize(data: any): any {
    return this.sanitizeObject(data, this.schema, '');
  }

  private validateObject(
    data: any,
    schema: SchemaDefinition,
    path: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Check for missing required fields
    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      const fieldPath = path ? `${path}.${fieldName}` : fieldName;
      const value = this.getValueByPath(data, fieldName);

      if (fieldSchema.required && (value === undefined || value === null)) {
        errors.push({
          field: fieldPath,
          code: 'REQUIRED',
          message: `${fieldPath} is required`,
          severity: 'error',
          value
        });
        continue;
      }

      if (value === undefined || value === null) {
        continue; // Skip validation for undefined/null non-required fields
      }

      if (this.isFieldSchema(fieldSchema)) {
        this.validateField(value, fieldSchema, fieldPath, errors, warnings);
      }
    }

    // Check for extra fields not in schema
    if (data && typeof data === 'object') {
      for (const key of Object.keys(data)) {
        const fieldPath = path ? `${path}.${key}` : key;
        if (!schema[key]) {
          warnings.push({
            field: fieldPath,
            code: 'UNKNOWN_FIELD',
            message: `Unknown field: ${fieldPath}`,
            suggestion: 'Remove this field or add it to the schema'
          });
        }
      }
    }
  }

  private validateField(
    value: any,
    schema: FieldSchema,
    fieldPath: string,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    // Type validation
    const typeError = this.validateType(value, schema.type, fieldPath);
    if (typeError) {
      errors.push(typeError);
      return; // Don't continue validation if type is wrong
    }

    // String validations
    if (schema.type === 'string' && typeof value === 'string') {
      if (schema.minLength && value.length < schema.minLength) {
        errors.push({
          field: fieldPath,
          code: 'MIN_LENGTH',
          message: `${fieldPath} must be at least ${schema.minLength} characters`,
          severity: 'error',
          value,
          constraints: { minLength: schema.minLength }
        });
      }

      if (schema.maxLength && value.length > schema.maxLength) {
        errors.push({
          field: fieldPath,
          code: 'MAX_LENGTH',
          message: `${fieldPath} must be at most ${schema.maxLength} characters`,
          severity: 'error',
          value,
          constraints: { maxLength: schema.maxLength }
        });
      }

      if (schema.pattern && !schema.pattern.test(value)) {
        errors.push({
          field: fieldPath,
          code: 'PATTERN',
          message: `${fieldPath} does not match required pattern`,
          severity: 'error',
          value,
          constraints: { pattern: schema.pattern.source }
        });
      }
    }

    // Number validations
    if (schema.type === 'number' && typeof value === 'number') {
      if (schema.min !== undefined && value < schema.min) {
        errors.push({
          field: fieldPath,
          code: 'MIN_VALUE',
          message: `${fieldPath} must be at least ${schema.min}`,
          severity: 'error',
          value,
          constraints: { min: schema.min }
        });
      }

      if (schema.max !== undefined && value > schema.max) {
        errors.push({
          field: fieldPath,
          code: 'MAX_VALUE',
          message: `${fieldPath} must be at most ${schema.max}`,
          severity: 'error',
          value,
          constraints: { max: schema.max }
        });
      }
    }

    // Enum validation
    if (schema.enum && !schema.enum.includes(value)) {
      errors.push({
        field: fieldPath,
        code: 'ENUM',
        message: `${fieldPath} must be one of: ${schema.enum.join(', ')}`,
        severity: 'error',
        value,
        constraints: { enum: schema.enum }
      });
    }

    // Custom validation
    if (schema.custom) {
      const customResult = schema.custom(value);
      errors.push(...customResult.errors);
      warnings.push(...customResult.warnings);
    }
  }

  private validateType(value: any, expectedType: string, fieldPath: string): ValidationError | null {
    const actualType = this.getValueType(value);

    if (expectedType === 'email') {
      if (actualType !== 'string' || !this.isValidEmail(value)) {
        return {
          field: fieldPath,
          code: 'INVALID_EMAIL',
          message: `${fieldPath} must be a valid email address`,
          severity: 'error',
          value
        };
      }
      return null;
    }

    if (expectedType === 'url') {
      if (actualType !== 'string' || !this.isValidUrl(value)) {
        return {
          field: fieldPath,
          code: 'INVALID_URL',
          message: `${fieldPath} must be a valid URL`,
          severity: 'error',
          value
        };
      }
      return null;
    }

    if (actualType !== expectedType) {
      return {
        field: fieldPath,
        code: 'INVALID_TYPE',
        message: `${fieldPath} must be of type ${expectedType}, got ${actualType}`,
        severity: 'error',
        value
      };
    }

    return null;
  }

  private getValueType(value: any): string {
    if (value === null) return 'object';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isFieldSchema(schema: FieldSchema | SchemaDefinition): schema is FieldSchema {
    return 'type' in schema;
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private sanitizeObject(data: any, schema: SchemaDefinition, path: string): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data !== 'object' || Array.isArray(data)) {
      return data;
    }

    const sanitized: any = {};

    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      const fieldPath = path ? `${path}.${fieldName}` : fieldName;
      let value = this.getValueByPath(data, fieldName);

      if (value !== undefined) {
        // Apply field-level sanitization
        if (this.isFieldSchema(fieldSchema)) {
          value = this.sanitizeField(value, fieldSchema);
        } else {
          // Nested schema
          value = this.sanitizeObject(value, fieldSchema, fieldPath);
        }

        sanitized[fieldName] = value;
      } else if (this.isFieldSchema(fieldSchema) && fieldSchema.default !== undefined) {
        sanitized[fieldName] = fieldSchema.default;
      }
    }

    return sanitized;
  }

  private sanitizeField(value: any, schema: FieldSchema): any {
    if (typeof value === 'string') {
      if (schema.trim) {
        value = value.trim();
      }
      if (schema.lowercase) {
        value = value.toLowerCase();
      }
      if (schema.uppercase) {
        value = value.toUpperCase();
      }
    }

    if (schema.sanitize) {
      value = schema.sanitize(value);
    }

    return value;
  }
}

/**
 * Predefined schemas for common use cases
 */
export const CommonSchemas = {
  email: {
    type: 'email' as const,
    required: true,
    trim: true,
    lowercase: true
  },

  url: {
    type: 'url' as const,
    required: true,
    trim: true
  },

  password: {
    type: 'string' as const,
    required: true,
    minLength: 8,
    maxLength: 128,
    pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/ // At least one lowercase, uppercase, and digit
  },

  username: {
    type: 'string' as const,
    required: true,
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_]+$/
  },

  positiveInteger: {
    type: 'number' as const,
    required: true,
    min: 1
  }
};