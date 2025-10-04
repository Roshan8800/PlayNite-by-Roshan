import { RuleDefinition, RuleContext, ValidationResult, ValidationError, ValidationWarning } from '../types';

/**
 * Content validation rules for image/video uploads, moderation, and quality standards
 */
export class ContentValidationRules {
  /**
   * Rule: Validate image file format and size
   */
  static readonly IMAGE_FORMAT_SIZE: RuleDefinition = {
    id: 'content_image_format_size',
    name: 'Image Format and Size Validation',
    description: 'Validates image file format, dimensions, and file size',
    category: 'content',
    priority: 100,
    enabled: true,
    conditions: [
      {
        field: 'data.type',
        operator: 'equals',
        value: 'image'
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.file',
        config: {
          maxSize: 10 * 1024 * 1024, // 10MB
          allowedFormats: ['jpeg', 'jpg', 'png', 'gif', 'webp'],
          maxDimensions: { width: 4096, height: 4096 },
          minDimensions: { width: 100, height: 100 }
        }
      }
    ],
    tags: ['image', 'upload', 'format', 'size']
  };

  /**
   * Rule: Validate video file format and duration
   */
  static readonly VIDEO_FORMAT_DURATION: RuleDefinition = {
    id: 'content_video_format_duration',
    name: 'Video Format and Duration Validation',
    description: 'Validates video file format, duration, and quality',
    category: 'content',
    priority: 100,
    enabled: true,
    conditions: [
      {
        field: 'data.type',
        operator: 'equals',
        value: 'video'
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.file',
        config: {
          maxSize: 500 * 1024 * 1024, // 500MB
          allowedFormats: ['mp4', 'mov', 'avi', 'mkv', 'webm'],
          maxDuration: 300, // 5 minutes
          minDuration: 1, // 1 second
          maxResolution: { width: 1920, height: 1080 },
          minResolution: { width: 320, height: 240 }
        }
      }
    ],
    tags: ['video', 'upload', 'format', 'duration']
  };

  /**
   * Rule: Content moderation - detect inappropriate content
   */
  static readonly CONTENT_MODERATION: RuleDefinition = {
    id: 'content_moderation_inappropriate',
    name: 'Content Moderation - Inappropriate Content Detection',
    description: 'Detects and flags inappropriate content using keyword analysis',
    category: 'content',
    priority: 90,
    enabled: true,
    conditions: [
      {
        field: 'data.content',
        operator: 'exists',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.content',
        config: {
          bannedWords: [
            'spam', 'scam', 'fake', 'virus', 'malware',
            // Add more inappropriate keywords as needed
          ],
          maxRepeatedChars: 10,
          minWords: 3,
          maxLinks: 3
        }
      }
    ],
    tags: ['moderation', 'inappropriate', 'spam']
  };

  /**
   * Rule: Content quality - check for meaningful content
   */
  static readonly CONTENT_QUALITY: RuleDefinition = {
    id: 'content_quality_meaningful',
    name: 'Content Quality Validation',
    description: 'Validates content quality and meaningfulness',
    category: 'content',
    priority: 80,
    enabled: true,
    conditions: [
      {
        field: 'data.content',
        operator: 'exists',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.content',
        config: {
          minLength: 10,
          maxLength: 10000,
          requireHashtags: false,
          requireMentions: false,
          maxEmojis: 10,
          minEngagementScore: 0.1
        }
      }
    ],
    tags: ['quality', 'meaningful', 'engagement']
  };

  /**
   * Rule: Duplicate content detection
   */
  static readonly DUPLICATE_CONTENT: RuleDefinition = {
    id: 'content_duplicate_detection',
    name: 'Duplicate Content Detection',
    description: 'Detects duplicate or near-duplicate content',
    category: 'content',
    priority: 85,
    enabled: true,
    conditions: [
      {
        field: 'data.content',
        operator: 'exists',
        value: true
      },
      {
        field: 'data.user.id',
        operator: 'exists',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.content',
        config: {
          similarityThreshold: 0.8,
          checkRecentPosts: true,
          timeWindow: 24 * 60 * 60 * 1000 // 24 hours
        }
      }
    ],
    tags: ['duplicate', 'spam', 'originality']
  };

  /**
   * Rule: Image content safety check
   */
  static readonly IMAGE_SAFETY: RuleDefinition = {
    id: 'content_image_safety',
    name: 'Image Content Safety Check',
    description: 'Validates image content for safety and appropriateness',
    category: 'content',
    priority: 95,
    enabled: true,
    conditions: [
      {
        field: 'data.type',
        operator: 'equals',
        value: 'image'
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.file',
        config: {
          checkForExplicit: true,
          checkForViolence: true,
          checkForHate: true,
          maxExplicitScore: 0.1,
          requireAltText: true
        }
      }
    ],
    tags: ['safety', 'image', 'explicit', 'violence']
  };

  /**
   * Rule: Video content safety check
   */
  static readonly VIDEO_SAFETY: RuleDefinition = {
    id: 'content_video_safety',
    name: 'Video Content Safety Check',
    description: 'Validates video content for safety and appropriateness',
    category: 'content',
    priority: 95,
    enabled: true,
    conditions: [
      {
        field: 'data.type',
        operator: 'equals',
        value: 'video'
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data.file',
        config: {
          checkForExplicit: true,
          checkForViolence: true,
          checkForHate: true,
          maxExplicitScore: 0.1,
          requireThumbnail: true,
          checkAudio: true
        }
      }
    ],
    tags: ['safety', 'video', 'explicit', 'violence']
  };

  /**
   * Rule: Content accessibility validation
   */
  static readonly ACCESSIBILITY: RuleDefinition = {
    id: 'content_accessibility',
    name: 'Content Accessibility Validation',
    description: 'Validates content for accessibility compliance',
    category: 'content',
    priority: 70,
    enabled: true,
    conditions: [
      {
        field: 'data.content',
        operator: 'exists',
        value: true
      }
    ],
    actions: [
      {
        type: 'validate',
        target: 'data',
        config: {
          requireAltText: true,
          checkColorContrast: true,
          maxImageSize: { width: 800, height: 600 },
          requireCaptions: false,
          checkHeadingStructure: true
        }
      }
    ],
    tags: ['accessibility', 'a11y', 'inclusive']
  };

  /**
   * Get all content validation rules
   */
  static getAllRules(): RuleDefinition[] {
    return [
      this.IMAGE_FORMAT_SIZE,
      this.VIDEO_FORMAT_DURATION,
      this.CONTENT_MODERATION,
      this.CONTENT_QUALITY,
      this.DUPLICATE_CONTENT,
      this.IMAGE_SAFETY,
      this.VIDEO_SAFETY,
      this.ACCESSIBILITY
    ];
  }

  /**
   * Get rules by tag
   */
  static getRulesByTag(tag: string): RuleDefinition[] {
    return this.getAllRules().filter(rule =>
      rule.tags?.includes(tag)
    );
  }

  /**
   * Get rules by category
   */
  static getRulesByCategory(category: string): RuleDefinition[] {
    return this.getAllRules().filter(rule =>
      rule.category === category
    );
  }
}

/**
 * Content validation utilities
 */
export class ContentValidationUtils {
  /**
   * Validate image file
   */
  static validateImageFile(file: File, config: {
    maxSize?: number;
    allowedFormats?: string[];
    maxDimensions?: { width: number; height: number };
    minDimensions?: { width: number; height: number };
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      maxSize = 10 * 1024 * 1024,
      allowedFormats = ['jpeg', 'jpg', 'png', 'gif', 'webp'],
      maxDimensions = { width: 4096, height: 4096 },
      minDimensions = { width: 100, height: 100 }
    } = config;

    // Check file size
    if (file.size > maxSize) {
      errors.push({
        field: 'file.size',
        code: 'FILE_TOO_LARGE',
        message: `File size exceeds maximum allowed size of ${Math.round(maxSize / 1024 / 1024)}MB`,
        severity: 'error',
        value: file.size,
        constraints: { maxSize }
      });
    }

    // Check file format
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedFormats.includes(fileExtension)) {
      errors.push({
        field: 'file.format',
        code: 'INVALID_FORMAT',
        message: `File format not allowed. Allowed formats: ${allowedFormats.join(', ')}`,
        severity: 'error',
        value: fileExtension,
        constraints: { allowedFormats }
      });
    }

    // Check dimensions if it's an image
    if (fileExtension && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
      // In a real implementation, you'd load the image to check dimensions
      // For now, we'll assume validation passes
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate video file
   */
  static validateVideoFile(file: File, config: {
    maxSize?: number;
    allowedFormats?: string[];
    maxDuration?: number;
    minDuration?: number;
    maxResolution?: { width: number; height: number };
    minResolution?: { width: number; height: number };
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      maxSize = 500 * 1024 * 1024,
      allowedFormats = ['mp4', 'mov', 'avi', 'mkv', 'webm'],
      maxDuration = 300,
      minDuration = 1,
      maxResolution = { width: 1920, height: 1080 },
      minResolution = { width: 320, height: 240 }
    } = config;

    // Check file size
    if (file.size > maxSize) {
      errors.push({
        field: 'file.size',
        code: 'FILE_TOO_LARGE',
        message: `Video file size exceeds maximum allowed size of ${Math.round(maxSize / 1024 / 1024)}MB`,
        severity: 'error',
        value: file.size,
        constraints: { maxSize }
      });
    }

    // Check file format
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (!fileExtension || !allowedFormats.includes(fileExtension)) {
      errors.push({
        field: 'file.format',
        code: 'INVALID_FORMAT',
        message: `Video format not allowed. Allowed formats: ${allowedFormats.join(', ')}`,
        severity: 'error',
        value: fileExtension,
        constraints: { allowedFormats }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Check for inappropriate content
   */
  static checkInappropriateContent(content: string, config: {
    bannedWords?: string[];
    maxRepeatedChars?: number;
    minWords?: number;
    maxLinks?: number;
  } = {}): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const {
      bannedWords = ['spam', 'scam', 'fake'],
      maxRepeatedChars = 10,
      minWords = 3,
      maxLinks = 3
    } = config;

    // Check for banned words
    const lowerContent = content.toLowerCase();
    for (const word of bannedWords) {
      if (lowerContent.includes(word.toLowerCase())) {
        errors.push({
          field: 'content',
          code: 'INAPPROPRIATE_CONTENT',
          message: `Content contains inappropriate or banned words`,
          severity: 'error',
          value: content
        });
        break;
      }
    }

    // Check for excessive repeated characters
    let hasExcessiveRepeatedChars = false;
    for (let i = 0; i < content.length; i++) {
      let count = 1;
      for (let j = i + 1; j < content.length && content[j] === content[i]; j++) {
        count++;
      }
      if (count >= maxRepeatedChars) {
        hasExcessiveRepeatedChars = true;
        break;
      }
      i += count - 1; // Skip the characters we've already counted
    }
    if (hasExcessiveRepeatedChars) {
      warnings.push({
        field: 'content',
        code: 'EXCESSIVE_REPEATED_CHARS',
        message: `Content contains excessive repeated characters`,
        suggestion: 'Reduce repeated characters for better readability'
      });
    }

    // Check minimum word count
    const wordCount = content.trim().split(/\s+/).length;
    if (wordCount < minWords) {
      warnings.push({
        field: 'content',
        code: 'CONTENT_TOO_SHORT',
        message: `Content is too short. Minimum ${minWords} words required`,
        suggestion: `Add more content to reach at least ${minWords} words`
      });
    }

    // Check for excessive links
    const linkPattern = /https?:\/\/[^\s]+/g;
    const links = content.match(linkPattern) || [];
    if (links.length > maxLinks) {
      warnings.push({
        field: 'content',
        code: 'EXCESSIVE_LINKS',
        message: `Content contains too many links. Maximum ${maxLinks} links allowed`,
        suggestion: `Reduce the number of links to ${maxLinks} or fewer`
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}