import { ValidationSchema, CommonSchemas } from './ValidationSchema';

/**
 * Test file for ValidationSchema
 * Note: This is a template for tests. To run these tests, install Jest and @types/jest
 *
 * npm install --save-dev jest @types/jest ts-jest
 */

describe('ValidationSchema', () => {
  describe('Basic Validation', () => {
    it('should validate required fields', () => {
      const schema = new ValidationSchema({
        email: CommonSchemas.email,
        age: { type: 'number' as const, required: true, min: 0 }
      });

      const validData = {
        email: 'test@example.com',
        age: 25
      };

      const invalidData = {
        email: 'invalid-email',
        age: -5
      };

      const validResult = schema.validate(validData);
      const invalidResult = schema.validate(invalidData);

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });

    it('should handle nested schemas', () => {
      const schema = new ValidationSchema({
        user: {
          profile: {
            name: { type: 'string' as const, required: true },
            age: { type: 'number' as const, required: true, min: 0 }
          }
        }
      });

      const validData = {
        user: {
          profile: {
            name: 'John Doe',
            age: 30
          }
        }
      };

      const result = schema.validate(validData);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize data according to schema rules', () => {
      const schema = new ValidationSchema({
        email: { type: 'email' as const, trim: true, lowercase: true },
        name: { type: 'string' as const, trim: true }
      });

      const dirtyData = {
        email: '  TEST@EXAMPLE.COM  ',
        name: '  John Doe  '
      };

      const sanitized = schema.sanitize(dirtyData);
      expect(sanitized.email).toBe('test@example.com');
      expect(sanitized.name).toBe('John Doe');
    });
  });

  describe('Common Schemas', () => {
    it('should validate email format', () => {
      const schema = new ValidationSchema({
        email: CommonSchemas.email
      });

      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'test+tag@example.org'
      ];

      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'test@',
        'test.example.com'
      ];

      validEmails.forEach(email => {
        const result = schema.validate({ email });
        expect(result.isValid).toBe(true);
      });

      invalidEmails.forEach(email => {
        const result = schema.validate({ email });
        expect(result.isValid).toBe(false);
      });
    });

    it('should validate password strength', () => {
      const schema = new ValidationSchema({
        password: CommonSchemas.password
      });

      const validPasswords = [
        'StrongPass123!',
        'MySecure@456',
        'Complex#789Pass'
      ];

      const invalidPasswords = [
        'weak',
        '12345678',
        'password',
        'ABCDEFGH'
      ];

      validPasswords.forEach(password => {
        const result = schema.validate({ password });
        expect(result.isValid).toBe(true);
      });

      invalidPasswords.forEach(password => {
        const result = schema.validate({ password });
        expect(result.isValid).toBe(false);
      });
    });

    it('should validate username format', () => {
      const schema = new ValidationSchema({
        username: CommonSchemas.username
      });

      const validUsernames = [
        'user123',
        'test_user',
        'myusername',
        'a1b2c3'
      ];

      const invalidUsernames = [
        'ab', // too short
        'user@name', // special chars
        'a'.repeat(31), // too long
        'user-name' // special chars
      ];

      validUsernames.forEach(username => {
        const result = schema.validate({ username });
        expect(result.isValid).toBe(true);
      });

      invalidUsernames.forEach(username => {
        const result = schema.validate({ username });
        expect(result.isValid).toBe(false);
      });
    });
  });

  describe('Custom Validation', () => {
    it('should execute custom validation functions', () => {
      const schema = new ValidationSchema({
        customField: {
          type: 'string' as const,
          custom: (value: string) => {
            if (value !== 'valid') {
              return {
                isValid: false,
                errors: [{
                  field: 'customField',
                  code: 'INVALID_VALUE',
                  message: 'Value must be "valid"',
                  severity: 'error' as const
                }],
                warnings: []
              };
            }
            return { isValid: true, errors: [], warnings: [] };
          }
        }
      });

      const validResult = schema.validate({ customField: 'valid' });
      const invalidResult = schema.validate({ customField: 'invalid' });

      expect(validResult.isValid).toBe(true);
      expect(invalidResult.isValid).toBe(false);
    });
  });

  describe('Type Validation', () => {
    it('should validate data types correctly', () => {
      const schema = new ValidationSchema({
        stringField: { type: 'string' as const },
        numberField: { type: 'number' as const },
        booleanField: { type: 'boolean' as const },
        emailField: { type: 'email' as const },
        urlField: { type: 'url' as const }
      });

      const testCases = [
        { data: { stringField: 'test' }, shouldBeValid: true },
        { data: { stringField: 123 }, shouldBeValid: false },
        { data: { numberField: 42 }, shouldBeValid: true },
        { data: { numberField: 'not a number' }, shouldBeValid: false },
        { data: { booleanField: true }, shouldBeValid: true },
        { data: { booleanField: 'true' }, shouldBeValid: false },
        { data: { emailField: 'test@example.com' }, shouldBeValid: true },
        { data: { emailField: 'invalid-email' }, shouldBeValid: false },
        { data: { urlField: 'https://example.com' }, shouldBeValid: true },
        { data: { urlField: 'not-a-url' }, shouldBeValid: false }
      ];

      testCases.forEach(({ data, shouldBeValid }) => {
        const result = schema.validate(data);
        expect(result.isValid).toBe(shouldBeValid);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined values', () => {
      const schema = new ValidationSchema({
        optionalField: { type: 'string' as const, required: false },
        requiredField: { type: 'string' as const, required: true }
      });

      const result1 = schema.validate({ optionalField: null });
      const result2 = schema.validate({ optionalField: undefined });
      const result3 = schema.validate({});

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
      expect(result3.isValid).toBe(false);
    });

    it('should handle empty objects and arrays', () => {
      const schema = new ValidationSchema({
        objectField: { type: 'object' as const },
        arrayField: { type: 'array' as const }
      });

      const result1 = schema.validate({
        objectField: {},
        arrayField: []
      });

      const result2 = schema.validate({
        objectField: { key: 'value' },
        arrayField: ['item']
      });

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });
  });
});