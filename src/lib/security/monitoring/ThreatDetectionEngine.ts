import { securityManager } from '../core/SecurityManager';

/**
 * Threat Types
 */
export enum ThreatType {
  BRUTE_FORCE = 'BRUTE_FORCE',
  SUSPICIOUS_IP = 'SUSPICIOUS_IP',
  UNUSUAL_ACCESS_PATTERN = 'UNUSUAL_ACCESS_PATTERN',
  DATA_EXFILTRATION = 'DATA_EXFILTRATION',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  MALICIOUS_ACTIVITY = 'MALICIOUS_ACTIVITY',
  BOT_ACTIVITY = 'BOT_ACTIVITY',
  GEO_ANOMALY = 'GEO_ANOMALY'
}

/**
 * Threat Severity Levels
 */
export enum ThreatSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Detection Rule Interface
 */
interface DetectionRule {
  id: string;
  name: string;
  type: ThreatType;
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  conditions: Record<string, any>;
  actions: string[];
  cooldownMinutes: number;
}

/**
 * Threat Detection Result
 */
interface ThreatDetection {
  id: string;
  type: ThreatType;
  severity: ThreatSeverity;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  description: string;
  confidence: number;
  indicators: string[];
  blocked: boolean;
  reason: string;
  metadata?: Record<string, any>;
}

/**
 * Security Context for Analysis
 */
interface SecurityContext {
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  operation: string;
  resource?: string;
  metadata?: Record<string, any>;
}

/**
 * Threat Detection Engine
 * Monitors and detects security threats in real-time
 */
export class ThreatDetectionEngine {
  private detectionRules: Map<string, DetectionRule> = new Map();
  private threatHistory: ThreatDetection[] = [];
  private blockedIPs: Set<string> = new Set();
  private blockedUsers: Set<string> = new Set();
  private suspiciousActivities: Map<string, any[]> = new Map();
  private monitoringActive: boolean = false;
  private sensitivity: 'low' | 'medium' | 'high' = 'medium';

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Start threat monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.monitoringActive) {
      return;
    }

    this.monitoringActive = true;

    // Start periodic threat analysis
    setInterval(() => {
      this.performPeriodicAnalysis();
    }, 60000); // Every minute

    // Start real-time monitoring
    this.startRealTimeMonitoring();

    console.log('Threat detection monitoring started');
  }

  /**
   * Stop threat monitoring
   */
  async stopMonitoring(): Promise<void> {
    this.monitoringActive = false;
    console.log('Threat detection monitoring stopped');
  }

  /**
   * Analyze security context for threats
   */
  async analyzeContext(context: SecurityContext): Promise<ThreatDetection> {
    const threats: ThreatDetection[] = [];

    // Run all applicable detection rules
    for (const rule of this.detectionRules.values()) {
      if (!rule.enabled) continue;

      const detection = await this.runDetectionRule(rule, context);
      if (detection) {
        threats.push(detection);
      }
    }

    // Combine multiple detections
    if (threats.length > 0) {
      return this.combineThreatDetections(threats);
    }

    // No threats detected
    return {
      id: `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: ThreatType.MALICIOUS_ACTIVITY,
      severity: ThreatSeverity.LOW,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      timestamp: context.timestamp,
      description: 'No threats detected',
      confidence: 0,
      indicators: [],
      blocked: false,
      reason: 'Normal activity'
    };
  }

  /**
   * Run specific detection rule
   */
  private async runDetectionRule(rule: DetectionRule, context: SecurityContext): Promise<ThreatDetection | null> {
    let confidence = 0;
    const indicators: string[] = [];

    switch (rule.type) {
      case ThreatType.BRUTE_FORCE:
        const bruteForceResult = this.detectBruteForce(context);
        if (bruteForceResult.detected) {
          confidence = bruteForceResult.confidence;
          indicators.push(...bruteForceResult.indicators);
        }
        break;

      case ThreatType.SUSPICIOUS_IP:
        const ipResult = this.detectSuspiciousIP(context.ipAddress);
        if (ipResult.detected) {
          confidence = ipResult.confidence;
          indicators.push(...ipResult.indicators);
        }
        break;

      case ThreatType.UNUSUAL_ACCESS_PATTERN:
        const patternResult = this.detectUnusualAccessPattern(context);
        if (patternResult.detected) {
          confidence = patternResult.confidence;
          indicators.push(...patternResult.indicators);
        }
        break;

      case ThreatType.BOT_ACTIVITY:
        const botResult = this.detectBotActivity(context);
        if (botResult.detected) {
          confidence = botResult.confidence;
          indicators.push(...botResult.indicators);
        }
        break;

      case ThreatType.GEO_ANOMALY:
        const geoResult = this.detectGeoAnomaly(context);
        if (geoResult.detected) {
          confidence = geoResult.confidence;
          indicators.push(...geoResult.indicators);
        }
        break;
    }

    if (confidence > 0.3) { // Threshold for detection
      const severity = this.calculateSeverity(rule.type, confidence);

      return {
        id: `threat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: rule.type,
        severity,
        userId: context.userId,
        sessionId: context.sessionId,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        timestamp: context.timestamp,
        description: this.getThreatDescription(rule.type, confidence),
        confidence,
        indicators,
        blocked: severity === ThreatSeverity.CRITICAL || severity === ThreatSeverity.HIGH,
        reason: this.getDetectionReason(rule.type, indicators),
        metadata: {
          ruleId: rule.id,
          sensitivity: rule.sensitivity
        }
      };
    }

    return null;
  }

  /**
   * Detect brute force attacks
   */
  private detectBruteForce(context: SecurityContext): { detected: boolean; confidence: number; indicators: string[] } {
    const indicators: string[] = [];
    let confidence = 0;

    // Check failed login attempts from same IP
    const ipKey = `failed_logins_${context.ipAddress}`;
    const failedAttempts = this.suspiciousActivities.get(ipKey) || [];

    const recentFailures = failedAttempts.filter((attempt: any) =>
      context.timestamp.getTime() - attempt.timestamp < 300000 // Last 5 minutes
    );

    if (recentFailures.length > 5) {
      confidence += 0.4;
      indicators.push(`${recentFailures.length} failed attempts in 5 minutes`);
    }

    // Check rapid successive attempts
    if (recentFailures.length > 3) {
      const timeSpan = context.timestamp.getTime() - recentFailures[0]?.timestamp;
      if (timeSpan < 60000) { // Less than 1 minute for multiple failures
        confidence += 0.3;
        indicators.push('Rapid successive failures');
      }
    }

    return {
      detected: confidence > 0.3,
      confidence,
      indicators
    };
  }

  /**
   * Detect suspicious IP addresses
   */
  private detectSuspiciousIP(ipAddress: string): { detected: boolean; confidence: number; indicators: string[] } {
    const indicators: string[] = [];
    let confidence = 0;

    // Known malicious IP patterns (simplified)
    const suspiciousPatterns = [
      /^10\./, // Private IP in public context
      /^192\.168\./, // Private IP
      /^127\./, // Localhost
      /^169\.254\./, // Link-local
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(ipAddress))) {
      confidence += 0.6;
      indicators.push('Private/local IP address detected');
    }

    // Check if IP is in blocklist
    if (this.blockedIPs.has(ipAddress)) {
      confidence += 0.8;
      indicators.push('IP address is blocklisted');
    }

    return {
      detected: confidence > 0.3,
      confidence,
      indicators
    };
  }

  /**
   * Detect unusual access patterns
   */
  private detectUnusualAccessPattern(context: SecurityContext): { detected: boolean; confidence: number; indicators: string[] } {
    const indicators: string[] = [];
    let confidence = 0;

    // Check access time patterns
    const hour = context.timestamp.getHours();
    if (hour < 6 || hour > 22) {
      confidence += 0.2;
      indicators.push('Access outside normal hours');
    }

    // Check operation frequency
    const operationKey = `operations_${context.userId || context.ipAddress}`;
    const operations = this.suspiciousActivities.get(operationKey) || [];

    const recentOps = operations.filter((op: any) =>
      context.timestamp.getTime() - op.timestamp < 600000 // Last 10 minutes
    );

    if (recentOps.length > 20) {
      confidence += 0.3;
      indicators.push('High operation frequency');
    }

    return {
      detected: confidence > 0.2,
      confidence,
      indicators
    };
  }

  /**
   * Detect bot activity
   */
  private detectBotActivity(context: SecurityContext): { detected: boolean; confidence: number; indicators: string[] } {
    const indicators: string[] = [];
    let confidence = 0;

    const userAgent = context.userAgent.toLowerCase();

    // Bot indicators in user agent
    const botPatterns = [
      /bot/, /crawler/, /spider/, /scraper/, /automation/,
      /headless/, /phantom/, /selenium/, /webdriver/
    ];

    if (botPatterns.some(pattern => pattern.test(userAgent))) {
      confidence += 0.7;
      indicators.push('Bot-like user agent detected');
    }

    // Missing common browser indicators
    const browserIndicators = ['mozilla', 'chrome', 'firefox', 'safari', 'edge'];
    if (!browserIndicators.some(indicator => userAgent.includes(indicator))) {
      confidence += 0.3;
      indicators.push('Missing browser indicators');
    }

    return {
      detected: confidence > 0.3,
      confidence,
      indicators
    };
  }

  /**
   * Detect geographical anomalies
   */
  private detectGeoAnomaly(context: SecurityContext): { detected: boolean; confidence: number; indicators: string[] } {
    const indicators: string[] = [];
    let confidence = 0;

    // This would integrate with a geo-IP service in production
    // For now, simulate based on IP patterns

    // Check for impossible location changes (too fast)
    const locationKey = `location_${context.userId}`;
    const lastLocation = this.suspiciousActivities.get(locationKey)?.[0];

    if (lastLocation) {
      const timeDiff = context.timestamp.getTime() - lastLocation.timestamp;
      // If locations changed in less than reasonable travel time
      if (timeDiff < 3600000) { // 1 hour
        confidence += 0.4;
        indicators.push('Impossible location change detected');
      }
    }

    return {
      detected: confidence > 0.2,
      confidence,
      indicators
    };
  }

  /**
   * Record threat detection
   */
  async recordThreatDetection(detection: ThreatDetection): Promise<void> {
    this.threatHistory.push(detection);

    // Keep only recent threats in memory
    if (this.threatHistory.length > 10000) {
      this.threatHistory = this.threatHistory.slice(-5000);
    }

    // Take automated actions
    if (detection.blocked) {
      await this.takeAutomatedActions(detection);
    }

    // Log threat detection
    console.warn('Threat detected:', detection);
  }

  /**
   * Get threat reports in date range
   */
  async getReportsInRange(startDate: Date, endDate: Date): Promise<ThreatDetection[]> {
    return this.threatHistory.filter(threat =>
      threat.timestamp >= startDate && threat.timestamp <= endDate
    );
  }

  /**
   * Get detection count
   */
  async getDetectionCount(): Promise<number> {
    return this.threatHistory.length;
  }

  /**
   * Update sensitivity level
   */
  async updateSensitivity(sensitivity: 'low' | 'medium' | 'high'): Promise<void> {
    this.sensitivity = sensitivity;

    // Adjust rule sensitivity
    for (const rule of this.detectionRules.values()) {
      rule.sensitivity = sensitivity;
    }

    console.log(`Threat detection sensitivity updated to: ${sensitivity}`);
  }

  /**
   * Private helper methods
   */
  private initializeDefaultRules(): void {
    const defaultRules: DetectionRule[] = [
      {
        id: 'brute_force_login',
        name: 'Brute Force Login Detection',
        type: ThreatType.BRUTE_FORCE,
        enabled: true,
        sensitivity: 'medium',
        conditions: { maxFailures: 5, timeWindow: 300000 },
        actions: ['block_ip', 'alert_admin'],
        cooldownMinutes: 15
      },
      {
        id: 'suspicious_ip',
        name: 'Suspicious IP Detection',
        type: ThreatType.SUSPICIOUS_IP,
        enabled: true,
        sensitivity: 'medium',
        conditions: {},
        actions: ['block_ip', 'require_captcha'],
        cooldownMinutes: 60
      },
      {
        id: 'unusual_pattern',
        name: 'Unusual Access Pattern Detection',
        type: ThreatType.UNUSUAL_ACCESS_PATTERN,
        enabled: true,
        sensitivity: 'medium',
        conditions: { maxOperations: 20, timeWindow: 600000 },
        actions: ['require_reauth', 'alert_admin'],
        cooldownMinutes: 30
      },
      {
        id: 'bot_activity',
        name: 'Bot Activity Detection',
        type: ThreatType.BOT_ACTIVITY,
        enabled: true,
        sensitivity: 'medium',
        conditions: {},
        actions: ['block_ip', 'require_captcha'],
        cooldownMinutes: 60
      },
      {
        id: 'geo_anomaly',
        name: 'Geographical Anomaly Detection',
        type: ThreatType.GEO_ANOMALY,
        enabled: true,
        sensitivity: 'medium',
        conditions: { maxDistance: 1000, timeWindow: 3600000 },
        actions: ['require_mfa', 'alert_admin'],
        cooldownMinutes: 45
      }
    ];

    for (const rule of defaultRules) {
      this.detectionRules.set(rule.id, rule);
    }
  }

  private combineThreatDetections(threats: ThreatDetection[]): ThreatDetection {
    // Combine multiple threat detections into single result
    const highestSeverity = threats.reduce((prev, current) => {
      const severityOrder = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
      return severityOrder[current.severity] > severityOrder[prev.severity] ? current : prev;
    });

    return {
      ...highestSeverity,
      description: `Multiple threats detected: ${threats.map(t => t.type).join(', ')}`,
      indicators: threats.flatMap(t => t.indicators),
      blocked: threats.some(t => t.blocked)
    };
  }

  private calculateSeverity(type: ThreatType, confidence: number): ThreatSeverity {
    if (confidence > 0.8) return ThreatSeverity.CRITICAL;
    if (confidence > 0.6) return ThreatSeverity.HIGH;
    if (confidence > 0.4) return ThreatSeverity.MEDIUM;
    return ThreatSeverity.LOW;
  }

  private getThreatDescription(type: ThreatType, confidence: number): string {
    const descriptions: Record<ThreatType, string> = {
      [ThreatType.BRUTE_FORCE]: 'Multiple failed login attempts detected',
      [ThreatType.SUSPICIOUS_IP]: 'Suspicious IP address pattern detected',
      [ThreatType.UNUSUAL_ACCESS_PATTERN]: 'Unusual access pattern detected',
      [ThreatType.DATA_EXFILTRATION]: 'Potential data exfiltration detected',
      [ThreatType.PRIVILEGE_ESCALATION]: 'Privilege escalation attempt detected',
      [ThreatType.MALICIOUS_ACTIVITY]: 'Malicious activity detected',
      [ThreatType.BOT_ACTIVITY]: 'Automated/bot activity detected',
      [ThreatType.GEO_ANOMALY]: 'Geographical anomaly detected'
    };

    return descriptions[type] || 'Unknown threat type';
  }

  private getDetectionReason(type: ThreatType, indicators: string[]): string {
    return indicators.join('; ');
  }

  private async takeAutomatedActions(detection: ThreatDetection): Promise<void> {
    // Block IP if critical threat
    if (detection.severity === ThreatSeverity.CRITICAL) {
      this.blockedIPs.add(detection.ipAddress);
    }

    // Block user if high severity threat
    if (detection.severity === ThreatSeverity.HIGH && detection.userId) {
      this.blockedUsers.add(detection.userId);
    }

    // Log automated action
    console.log(`Automated action taken for threat: ${detection.id}`);
  }

  private performPeriodicAnalysis(): void {
    if (!this.monitoringActive) return;

    // Clean up old threat history
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    this.threatHistory = this.threatHistory.filter(threat => threat.timestamp > cutoffDate);

    // Analyze patterns
    this.analyzeThreatPatterns();
  }

  private startRealTimeMonitoring(): void {
    // In a real implementation, this would integrate with webhooks,
    // real-time event streams, etc.
    console.log('Real-time threat monitoring active');
  }

  private analyzeThreatPatterns(): void {
    // Analyze threat patterns for emerging threats
    const recentThreats = this.threatHistory.slice(-100);

    // Group by type
    const threatsByType = recentThreats.reduce((acc, threat) => {
      acc[threat.type] = (acc[threat.type] || 0) + 1;
      return acc;
    }, {} as Record<ThreatType, number>);

    // Check for threat spikes
    for (const [type, count] of Object.entries(threatsByType)) {
      if (count > 10) { // Threshold for alert
        console.warn(`Threat spike detected: ${type} (${count} occurrences)`);
      }
    }
  }
}