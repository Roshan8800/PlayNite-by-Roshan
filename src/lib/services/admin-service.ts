import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, orderBy, limit, startAfter, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface AdminUser {
  uid: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'moderator' | 'user';
  status: 'active' | 'suspended' | 'banned';
  createdAt: Date;
  lastLoginAt?: Date;
  suspendedAt?: Date;
  suspendedBy?: string;
  suspensionReason?: string;
  avatar?: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
}

export interface UserActivity {
  uid: string;
  action: string;
  timestamp: Date;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
}

export interface BulkUserOperation {
  userIds: string[];
  operation: 'suspend' | 'activate' | 'changeRole';
  reason?: string;
  performedBy: string;
  timestamp: Date;
}

export class AdminService {
  // User Management
  static async getAllUsers(pageSize = 50, lastDoc?: any): Promise<{ users: AdminUser[], hasMore: boolean, lastDoc?: any }> {
    try {
      let q = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );

      if (lastDoc) {
        q = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(pageSize)
        );
      }

      const querySnapshot = await getDocs(q);
      const users: AdminUser[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        users.push({
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          role: data.role || 'user',
          status: data.status || 'active',
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate(),
          suspendedAt: data.suspendedAt?.toDate(),
          suspendedBy: data.suspendedBy,
          suspensionReason: data.suspensionReason,
          avatar: data.avatar,
          bio: data.bio,
          followersCount: data.followersCount || 0,
          followingCount: data.followingCount || 0,
          postsCount: data.postsCount || 0,
        });
      });

      return {
        users,
        hasMore: users.length === pageSize,
        lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1]
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  }

  static async searchUsers(searchTerm: string, filters?: { role?: string, status?: string }): Promise<AdminUser[]> {
    try {
      let q = query(collection(db, 'users'));

      if (searchTerm) {
        // For simplicity, we'll fetch all users and filter client-side
        // In production, you'd want to implement proper search indexing
        q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(1000));
      }

      const querySnapshot = await getDocs(q);
      let users: AdminUser[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const user: AdminUser = {
          uid: doc.id,
          email: data.email,
          displayName: data.displayName,
          role: data.role || 'user',
          status: data.status || 'active',
          createdAt: data.createdAt?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate(),
          suspendedAt: data.suspendedAt?.toDate(),
          suspendedBy: data.suspendedBy,
          suspensionReason: data.suspensionReason,
          avatar: data.avatar,
          bio: data.bio,
          followersCount: data.followersCount || 0,
          followingCount: data.followingCount || 0,
          postsCount: data.postsCount || 0,
        };

        // Apply search filter
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          if (
            user.email?.toLowerCase().includes(searchLower) ||
            user.displayName?.toLowerCase().includes(searchLower)
          ) {
            users.push(user);
          }
        } else {
          users.push(user);
        }
      });

      // Apply role and status filters
      if (filters?.role) {
        users = users.filter(user => user.role === filters.role);
      }
      if (filters?.status) {
        users = users.filter(user => user.status === filters.status);
      }

      return users;
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  static async updateUserRole(uid: string, newRole: 'admin' | 'moderator' | 'user', adminId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: new Date(),
        updatedBy: adminId,
      });

      // Log the action
      await this.logAdminAction(adminId, 'role_change', { targetUserId: uid, newRole });
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  static async suspendUser(uid: string, reason: string, adminId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        status: 'suspended',
        suspendedAt: new Date(),
        suspendedBy: adminId,
        suspensionReason: reason,
        updatedAt: new Date(),
      });

      // Log the action
      await this.logAdminAction(adminId, 'user_suspension', { targetUserId: uid, reason });
    } catch (error) {
      console.error('Error suspending user:', error);
      throw error;
    }
  }

  static async activateUser(uid: string, adminId: string): Promise<void> {
    try {
      const userRef = doc(db, 'users', uid);
      await updateDoc(userRef, {
        status: 'active',
        suspendedAt: null,
        suspendedBy: null,
        suspensionReason: null,
        updatedAt: new Date(),
      });

      // Log the action
      await this.logAdminAction(adminId, 'user_activation', { targetUserId: uid });
    } catch (error) {
      console.error('Error activating user:', error);
      throw error;
    }
  }

  static async deleteUser(uid: string, adminId: string): Promise<void> {
    try {
      // In a real implementation, you might want to soft delete or anonymize
      const userRef = doc(db, 'users', uid);
      await deleteDoc(userRef);

      // Log the action
      await this.logAdminAction(adminId, 'user_deletion', { targetUserId: uid });
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }

  static async bulkUpdateUsers(operation: BulkUserOperation): Promise<void> {
    try {
      const batch = [];
      const timestamp = new Date();

      for (const uid of operation.userIds) {
        const userRef = doc(db, 'users', uid);
        let updateData: any = {
          updatedAt: timestamp,
        };

        switch (operation.operation) {
          case 'suspend':
            updateData.status = 'suspended';
            updateData.suspendedAt = timestamp;
            updateData.suspendedBy = operation.performedBy;
            updateData.suspensionReason = operation.reason;
            break;
          case 'activate':
            updateData.status = 'active';
            updateData.suspendedAt = null;
            updateData.suspendedBy = null;
            updateData.suspensionReason = null;
            break;
          case 'changeRole':
            // This would need additional role parameter
            break;
        }

        batch.push(updateDoc(userRef, updateData));
      }

      await Promise.all(batch);

      // Log the bulk operation
      await this.logAdminAction(operation.performedBy, 'bulk_user_operation', {
        operation: operation.operation,
        userCount: operation.userIds.length,
        reason: operation.reason
      });
    } catch (error) {
      console.error('Error performing bulk user operation:', error);
      throw error;
    }
  }

  // Activity Monitoring
  static async getUserActivity(uid: string, limitCount = 100): Promise<UserActivity[]> {
    try {
      const q = query(
        collection(db, 'user_activity'),
        where('uid', '==', uid),
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const activities: UserActivity[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        activities.push({
          uid: data.uid,
          action: data.action,
          timestamp: data.timestamp?.toDate() || new Date(),
          details: data.details,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
        });
      });

      return activities;
    } catch (error) {
      console.error('Error fetching user activity:', error);
      throw error;
    }
  }

  static async logAdminAction(adminId: string, action: string, details?: any): Promise<void> {
    try {
      const activityData = {
        uid: adminId,
        action: `admin_${action}`,
        timestamp: new Date(),
        details,
        type: 'admin_action',
      };

      await addDoc(collection(db, 'user_activity'), activityData);
    } catch (error) {
      console.error('Error logging admin action:', error);
      throw error;
    }
  }

  // Statistics
  static async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    suspendedUsers: number;
    newUsersToday: number;
    newUsersThisWeek: number;
    usersByRole: Record<string, number>;
  }> {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      let totalUsers = 0;
      let activeUsers = 0;
      let suspendedUsers = 0;
      let newUsersToday = 0;
      let newUsersThisWeek = 0;
      const usersByRole: Record<string, number> = {};

      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        totalUsers++;

        if (data.status === 'active') activeUsers++;
        if (data.status === 'suspended') suspendedUsers++;

        const role = data.role || 'user';
        usersByRole[role] = (usersByRole[role] || 0) + 1;

        const createdAt = data.createdAt?.toDate();
        if (createdAt) {
          if (createdAt >= today) newUsersToday++;
          if (createdAt >= weekAgo) newUsersThisWeek++;
        }
      });

      return {
        totalUsers,
        activeUsers,
        suspendedUsers,
        newUsersToday,
        newUsersThisWeek,
        usersByRole,
      };
    } catch (error) {
      console.error('Error fetching user stats:', error);
      throw error;
    }
  }
}