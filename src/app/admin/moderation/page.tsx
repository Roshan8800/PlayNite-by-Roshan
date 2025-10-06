"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CheckCircle,
  XCircle,
  Flag,
  Eye,
  MessageSquare,
  Image,
  Video,
  User,
  Calendar,
  AlertTriangle,
  Clock,
  Filter,
  RefreshCw,
  CheckSquare,
  XSquare,
} from "lucide-react";
import { AdminModerationService, ModerationItem } from "@/lib/services/admin-moderation-service";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export default function ModerationQueuePage() {
  const { user: currentUser } = useAuth();
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<ModerationItem | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showBulkActionDialog, setShowBulkActionDialog] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | 'flag'>('approve');
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  useEffect(() => {
    loadModerationQueue();
  }, [statusFilter, priorityFilter]);

  const loadModerationQueue = async () => {
    try {
      setLoading(true);
      const result = await AdminModerationService.getModerationQueue(
        statusFilter as 'pending' | 'all',
        priorityFilter === 'all' ? undefined : priorityFilter as any
      );
      setItems(result.items);
    } catch (error) {
      console.error("Error loading moderation queue:", error);
      toast({
        title: "Error",
        description: "Failed to load moderation queue",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (action: 'approve' | 'reject' | 'flag') => {
    if (!selectedItem || !currentUser?.uid) return;

    try {
      await AdminModerationService.reviewContent(
        selectedItem.id,
        action,
        currentUser.uid,
        reviewNotes
      );

      toast({
        title: "Success",
        description: `Content ${action}d successfully`,
      });

      setShowReviewDialog(false);
      setSelectedItem(null);
      setReviewNotes("");
      loadModerationQueue();
    } catch (error) {
      console.error(`Error ${action}ing content:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} content`,
        variant: "destructive",
      });
    }
  };

  const handleBulkAction = async () => {
    if (!currentUser?.uid || selectedItems.length === 0) return;

    try {
      await AdminModerationService.bulkReviewContent({
        contentIds: selectedItems,
        action: bulkAction,
        reason: "Bulk moderation action",
        performedBy: currentUser.uid,
        timestamp: new Date(),
      });

      toast({
        title: "Success",
        description: `${selectedItems.length} items ${bulkAction}d successfully`,
      });

      setShowBulkActionDialog(false);
      setSelectedItems([]);
      loadModerationQueue();
    } catch (error) {
      console.error("Error performing bulk action:", error);
      toast({
        title: "Error",
        description: "Failed to perform bulk action",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "approved":
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case "rejected":
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      case "flagged":
        return <Badge className="bg-orange-100 text-orange-800">Flagged</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgent":
        return <Badge className="bg-red-100 text-red-800">Urgent</Badge>;
      case "high":
        return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
      case "medium":
        return <Badge className="bg-blue-100 text-blue-800">Medium</Badge>;
      case "low":
        return <Badge className="bg-gray-100 text-gray-800">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getContentIcon = (contentType: string) => {
    switch (contentType) {
      case "image":
        return <Image className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "post":
        return <MessageSquare className="h-4 w-4" />;
      case "comment":
        return <MessageSquare className="h-4 w-4" />;
      case "profile":
        return <User className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Moderation</h1>
          <p className="text-muted-foreground">
            Review and moderate platform content
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={loadModerationQueue}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          {selectedItems.length > 0 && (
            <Button onClick={() => setShowBulkActionDialog(true)}>
              Bulk Action ({selectedItems.length})
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Moderation Queue */}
      <Card>
        <CardHeader>
          <CardTitle>Moderation Queue</CardTitle>
          <CardDescription>
            {items.length} items awaiting review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-8">Loading moderation queue...</div>
            ) : items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No items in the moderation queue
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center space-x-4">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems([...selectedItems, item.id]);
                        } else {
                          setSelectedItems(selectedItems.filter(id => id !== item.id));
                        }
                      }}
                      className="rounded"
                    />
                    <div className="flex-shrink-0">
                      {getContentIcon(item.contentType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-medium truncate">
                          {item.title || `${item.contentType} content`}
                        </h3>
                        {getStatusBadge(item.status)}
                        {getPriorityBadge(item.priority)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {item.description || "No description available"}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center">
                          <User className="mr-1 h-3 w-3" />
                          {item.authorName || "Unknown"}
                        </span>
                        <span className="flex items-center">
                          <Calendar className="mr-1 h-3 w-3" />
                          {formatDate(item.submittedAt)}
                        </span>
                        {item.flags.length > 0 && (
                          <span className="flex items-center">
                            <Flag className="mr-1 h-3 w-3" />
                            {item.flags.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedItem(item);
                        setShowReviewDialog(true);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Review
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Review Content</DialogTitle>
            <DialogDescription>
              Review and moderate the selected content item
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-6">
              {/* Content Preview */}
              <div className="border rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-4">
                  {getContentIcon(selectedItem.contentType)}
                  <span className="font-medium capitalize">{selectedItem.contentType}</span>
                  {getStatusBadge(selectedItem.status)}
                  {getPriorityBadge(selectedItem.priority)}
                </div>

                {selectedItem.thumbnailUrl && (
                  <div className="mb-4">
                    <img
                      src={selectedItem.thumbnailUrl}
                      alt="Content preview"
                      className="max-w-full h-48 object-cover rounded"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="font-medium">
                    {selectedItem.title || `${selectedItem.contentType} content`}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedItem.description || "No description available"}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    Author: {selectedItem.authorName || "Unknown"} | Submitted: {formatDate(selectedItem.submittedAt)}
                  </div>
                </div>

                {selectedItem.flags.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Flags:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.flags.map((flag, index) => (
                        <Badge key={index} variant="destructive">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Review Notes */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Review Notes (Optional)
                </label>
                <Textarea
                  placeholder="Add notes about your review decision..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReviewDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleReviewAction('reject')}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
            <Button
              variant="outline"
              onClick={() => handleReviewAction('flag')}
            >
              <Flag className="mr-2 h-4 w-4" />
              Flag for Later
            </Button>
            <Button onClick={() => handleReviewAction('approve')}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <AlertDialog open={showBulkActionDialog} onOpenChange={setShowBulkActionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bulk Moderation Action</AlertDialogTitle>
            <AlertDialogDescription>
              Apply {bulkAction} action to {selectedItems.length} selected items?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={bulkAction} onValueChange={(value: any) => setBulkAction(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="approve">Approve</SelectItem>
                <SelectItem value="reject">Reject</SelectItem>
                <SelectItem value="flag">Flag</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkAction}>
              Apply Action
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}