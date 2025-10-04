import { collection, query, where, getDocs, doc, updateDoc, addDoc, orderBy, limit, startAfter, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface ModerationItem {
  id: string;
  contentId: string;
  contentType: 'post' | 'image' | 'video' | 'comment' | 'profile';
  contentUrl?: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  authorId: string;
  authorName?: string;
  authorEmail?: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  flags: string[];
  categories: {
    violence: number;
    adult: number;
    medical: number;
    spoof: number;
    racy: number;
  };
  reportedBy?: string[];
  reportedReasons?: string[];
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
  autoScanResults?: {
    isApproved: boolean;
    confidence: number;
    message?: string;
  };
}

export interface ModerationReport {
  id: string;
  contentId: string;
  contentType: string;
  reportedBy: string;
  reason: string;
  description?: string;
  status: 'pending' | 'investigated' | 'resolved' | 'dismissed';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  investigatedAt?: Date;
  investigatedBy?: string;
  resolution?: string;
}

export interface BulkModerationAction {
  contentIds: string[];
  action: 'approve' | 'reject' | 'flag' | 'delete';
  reason?: string;
  performedBy: string;
  timestamp: Date;
}

export class AdminModerationService {
  // Content Moderation Queue
  static async getModerationQueue(
    status: 'pending' | 'all' = 'pending',
    priority?: 'low' | 'medium' | 'high' | 'urgent',
    pageSize = 20,
    lastDoc?: any
  ): Promise<{ items: ModerationItem[], hasMore: boolean, lastDoc?: any }> {
    try {
      let q = query(collection(db, 'moderation_queue'), orderBy('submittedAt', 'desc'));

      if (status !== 'all') {
        q = query(collection(db, 'moderation_queue'), where('status', '==', status), orderBy('submittedAt', 'desc'));
      }

      if (priority) {
        q = query(collection(db, 'moderation_queue'), where('priority', '==', priority), orderBy('submittedAt', 'desc'));
      }

      if (lastDoc) {
        q = query(collection(db, 'moderation_queue'), orderBy('submittedAt', 'desc'), startAfter(lastDoc), limit(pageSize));
      } else {
        q = query(collection(db, 'moderation_queue'), orderBy('submittedAt', 'desc'), limit(pageSize));
      }

      const querySnapshot = await getDocs(q);
      const items: ModerationItem[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          contentId: data.contentId,
          contentType: data.contentType,
          contentUrl: data.contentUrl,
          thumbnailUrl: data.thumbnailUrl,
          title: data.title,
          description: data.description,
          authorId: data.authorId,
          authorName: data.authorName,
          authorEmail: data.authorEmail,
          status: data.status,
          priority: data.priority,
          flags: data.flags || [],
          categories: data.categories || {},
          reportedBy: data.reportedBy,
          reportedReasons: data.reportedReasons,
          submittedAt: data.submittedAt?.toDate() || new Date(),
          reviewedAt: data.reviewedAt?.toDate(),
          reviewedBy: data.reviewedBy,
          reviewNotes: data.reviewNotes,
          autoScanResults: data.autoScanResults,
        });
      });

      return {
        items,
        hasMore: items.length === pageSize,
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
      };
    } catch (error) {
      console.error('Error fetching moderation queue:', error);
      throw error;
    }
  }

  static async submitToModeration(item: Omit<ModerationItem, 'id' | 'submittedAt'>): Promise<string> {
    try {
      const moderationData = {
        ...item,
        submittedAt: Timestamp.now(),
        status: 'pending' as const,
      };

      const docRef = await addDoc(collection(db, 'moderation_queue'), moderationData);
      return docRef.id;
    } catch (error) {
      console.error('Error submitting to moderation:', error);
      throw error;
    }
  }

  static async reviewContent(
    itemId: string,
    action: 'approve' | 'reject' | 'flag',
    reviewerId: string,
    notes?: string
  ): Promise<void> {
    try {
      const updateData: any = {
        status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged',
        reviewedAt: Timestamp.now(),
        reviewedBy: reviewerId,
        reviewNotes: notes,
      };

      const itemRef = doc(db, 'moderation_queue', itemId);
      await updateDoc(itemRef, updateData);

      // Log the moderation action
      await this.logModerationAction(reviewerId, action, itemId, notes);
    } catch (error) {
      console.error('Error reviewing content:', error);
      throw error;
    }
  }

  static async bulkReviewContent(action: BulkModerationAction): Promise<void> {
    try {
      const batch = [];
      const timestamp = Timestamp.now();

      for (const contentId of action.contentIds) {
        const updateData: any = {
          status: action.action === 'approve' ? 'approved' :
                  action.action === 'reject' ? 'rejected' : 'flagged',
          reviewedAt: timestamp,
          reviewedBy: action.performedBy,
          reviewNotes: action.reason,
        };

        const itemRef = doc(db, 'moderation_queue', contentId);
        batch.push(updateDoc(itemRef, updateData));
      }

      await Promise.all(batch);

      // Log the bulk action
      await this.logModerationAction(
        action.performedBy,
        `bulk_${action.action}`,
        action.contentIds.join(','),
        `${action.reason} - ${action.contentIds.length} items`
      );
    } catch (error) {
      console.error('Error performing bulk review:', error);
      throw error;
    }
  }

  // Reports Management
  static async getReports(
    status: 'pending' | 'all' = 'pending',
    pageSize = 20,
    lastDoc?: any
  ): Promise<{ reports: ModerationReport[], hasMore: boolean, lastDoc?: any }> {
    try {
      let q = query(collection(db, 'moderation_reports'), orderBy('createdAt', 'desc'));

      if (status !== 'all') {
        q = query(collection(db, 'moderation_reports'), where('status', '==', status), orderBy('createdAt', 'desc'));
      }

      if (lastDoc) {
        q = query(collection(db, 'moderation_reports'), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(pageSize));
      } else {
        q = query(collection(db, 'moderation_reports'), orderBy('createdAt', 'desc'), limit(pageSize));
      }

      const querySnapshot = await getDocs(q);
      const reports: ModerationReport[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        reports.push({
          id: doc.id,
          contentId: data.contentId,
          contentType: data.contentType,
          reportedBy: data.reportedBy,
          reason: data.reason,
          description: data.description,
          status: data.status,
          priority: data.priority,
          createdAt: data.createdAt?.toDate() || new Date(),
          investigatedAt: data.investigatedAt?.toDate(),
          investigatedBy: data.investigatedBy,
          resolution: data.resolution,
        });
      });

      return {
        reports,
        hasMore: reports.length === pageSize,
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
      };
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }
  }

  static async submitReport(report: Omit<ModerationReport, 'id' | 'createdAt' | 'status'>): Promise<string> {
    try {
      const reportData = {
        ...report,
        status: 'pending' as const,
        createdAt: Timestamp.now(),
      };

      const docRef = await addDoc(collection(db, 'moderation_reports'), reportData);

      // Auto-create moderation queue item if priority is high
      if (report.priority === 'high') {
        await this.submitToModeration({
          contentId: report.contentId,
          contentType: report.contentType as any,
          authorId: 'unknown', // Would need to fetch from content
          status: 'pending',
          priority: 'high',
          flags: [report.reason],
          categories: {
            violence: 0,
            adult: 0,
            medical: 0,
            spoof: 0,
            racy: 0,
          },
          reportedBy: [report.reportedBy],
          reportedReasons: [report.reason],
        });
      }

      return docRef.id;
    } catch (error) {
      console.error('Error submitting report:', error);
      throw error;
    }
  }

  static async investigateReport(
    reportId: string,
    investigatorId: string,
    resolution: string,
    action: 'resolved' | 'dismissed'
  ): Promise<void> {
    try {
      const updateData = {
        status: action,
        investigatedAt: Timestamp.now(),
        investigatedBy: investigatorId,
        resolution,
      };

      const reportRef = doc(db, 'moderation_reports', reportId);
      await updateDoc(reportRef, updateData);

      // Log the investigation
      await this.logModerationAction(investigatorId, `report_${action}`, reportId, resolution);
    } catch (error) {
      console.error('Error investigating report:', error);
      throw error;
    }
  }

  // Statistics and Analytics
  static async getModerationStats(): Promise<{
    pendingCount: number;
    approvedToday: number;
    rejectedToday: number;
    avgReviewTime: number;
    topFlags: Array<{ flag: string, count: number }>;
    reportsByStatus: Record<string, number>;
  }> {
    try {
      const queueSnapshot = await getDocs(query(collection(db, 'moderation_queue')));
      const reportsSnapshot = await getDocs(query(collection(db, 'moderation_reports')));

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let pendingCount = 0;
      let approvedToday = 0;
      let rejectedToday = 0;
      const flagCounts: Record<string, number> = {};
      const reportsByStatus: Record<string, number> = {};

      // Process moderation queue
      queueSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.status === 'pending') pendingCount++;

        if (data.reviewedAt) {
          const reviewedAt = data.reviewedAt.toDate();
          if (reviewedAt >= today) {
            if (data.status === 'approved') approvedToday++;
            if (data.status === 'rejected') rejectedToday++;
          }
        }

        // Count flags
        if (data.flags) {
          data.flags.forEach((flag: string) => {
            flagCounts[flag] = (flagCounts[flag] || 0) + 1;
          });
        }
      });

      // Process reports
      reportsSnapshot.forEach((doc) => {
        const data = doc.data();
        reportsByStatus[data.status] = (reportsByStatus[data.status] || 0) + 1;
      });

      const topFlags = Object.entries(flagCounts)
        .map(([flag, count]) => ({ flag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        pendingCount,
        approvedToday,
        rejectedToday,
        avgReviewTime: 45, // Would calculate from actual data
        topFlags,
        reportsByStatus,
      };
    } catch (error) {
      console.error('Error fetching moderation stats:', error);
      throw error;
    }
  }

  // Auto-moderation settings
  static async updateAutoModerationSettings(settings: {
    enabled: boolean;
    confidenceThreshold: number;
    autoApproveThreshold: number;
    flagsToAutoReject: string[];
    categoriesToReview: Record<string, number>;
  }): Promise<void> {
    try {
      const settingsRef = doc(db, 'system_settings', 'auto_moderation');
      await updateDoc(settingsRef, {
        ...settings,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error updating auto-moderation settings:', error);
      throw error;
    }
  }

  static async getAutoModerationSettings(): Promise<any> {
    try {
      const settingsSnapshot = await getDocs(query(collection(db, 'system_settings')));
      const settings = settingsSnapshot.docs.find(doc => doc.id === 'auto_moderation');
      return settings?.data() || {
        enabled: true,
        confidenceThreshold: 0.8,
        autoApproveThreshold: 0.9,
        flagsToAutoReject: ['violence', 'adult'],
        categoriesToReview: {
          violence: 0.1,
          adult: 0.1,
          medical: 0.2,
          spoof: 0.3,
          racy: 0.2,
        },
      };
    } catch (error) {
      console.error('Error fetching auto-moderation settings:', error);
      throw error;
    }
  }

  // Logging and Audit Trail
  private static async logModerationAction(
    moderatorId: string,
    action: string,
    targetId: string,
    notes?: string
  ): Promise<void> {
    try {
      const logData = {
        moderatorId,
        action,
        targetId,
        notes,
        timestamp: Timestamp.now(),
        type: 'moderation_action',
      };

      await addDoc(collection(db, 'moderation_logs'), logData);
    } catch (error) {
      console.error('Error logging moderation action:', error);
      throw error;
    }
  }

  static async getModerationLogs(
    moderatorId?: string,
    limitCount = 100
  ): Promise<Array<{
    id: string;
    moderatorId: string;
    action: string;
    targetId: string;
    notes?: string;
    timestamp: Date;
  }>> {
    try {
      let q = query(
        collection(db, 'moderation_logs'),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      if (moderatorId) {
        q = query(
          collection(db, 'moderation_logs'),
          where('moderatorId', '==', moderatorId),
          orderBy('timestamp', 'desc'),
          limit(limitCount)
        );
      }

      const querySnapshot = await getDocs(q);
      const logs: Array<{
        id: string;
        moderatorId: string;
        action: string;
        targetId: string;
        notes?: string;
        timestamp: Date;
      }> = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        logs.push({
          id: doc.id,
          moderatorId: data.moderatorId,
          action: data.action,
          targetId: data.targetId,
          notes: data.notes,
          timestamp: data.timestamp?.toDate() || new Date(),
        });
      });

      return logs;
    } catch (error) {
      console.error('Error fetching moderation logs:', error);
      throw error;
    }
  }
}