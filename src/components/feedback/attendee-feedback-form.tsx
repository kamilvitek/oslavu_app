'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DatabaseEvent } from '@/lib/types/events';

interface AttendeeFeedbackFormProps {
  event: DatabaseEvent;
  onSubmit: (feedback: EventFeedback) => Promise<void>;
  onCancel?: () => void;
}

interface EventFeedback {
  event_id: string;
  feedback_type: 'attendee_correction' | 'venue_correction' | 'capacity_report';
  reported_attendees?: number;
  actual_attendees?: number;
  attendance_source?: 'ticket_sales' | 'manual_count' | 'organizer_report';
  notes?: string;
}

export function AttendeeFeedbackForm({ event, onSubmit, onCancel }: AttendeeFeedbackFormProps) {
  const [feedbackType, setFeedbackType] = useState<'attendee_correction' | 'venue_correction' | 'capacity_report'>('attendee_correction');
  const [reportedAttendees, setReportedAttendees] = useState<string>('');
  const [actualAttendees, setActualAttendees] = useState<string>('');
  const [attendanceSource, setAttendanceSource] = useState<'ticket_sales' | 'manual_count' | 'organizer_report'>('ticket_sales');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const feedback: EventFeedback = {
        event_id: event.id,
        feedback_type: feedbackType,
        notes: notes.trim() || undefined
      };

      // Add attendee data based on feedback type
      if (feedbackType === 'attendee_correction' || feedbackType === 'capacity_report') {
        if (reportedAttendees) {
          feedback.reported_attendees = parseInt(reportedAttendees);
        }
        if (actualAttendees) {
          feedback.actual_attendees = parseInt(actualAttendees);
        }
        feedback.attendance_source = attendanceSource;
      }

      await onSubmit(feedback);
      
      // Reset form
      setReportedAttendees('');
      setActualAttendees('');
      setNotes('');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-100 text-gray-800';
    if (confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getConfidenceText = (confidence?: number) => {
    if (!confidence) return 'Unknown';
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  return (
    <Card className="p-6 max-w-2xl mx-auto">
      <div className="space-y-6">
        {/* Event Info */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Event Information</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-600">Event Title</Label>
                <p className="text-sm">{event.title}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Venue</Label>
                <p className="text-sm">{event.venue || 'Not specified'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">City</Label>
                <p className="text-sm">{event.city}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Date</Label>
                <p className="text-sm">{new Date(event.date).toLocaleDateString()}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Current Estimate</Label>
                <p className="text-sm font-medium">{event.expected_attendees?.toLocaleString() || 'Not available'}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-600">Confidence</Label>
                <Badge className={getConfidenceColor(event.attendee_confidence)}>
                  {getConfidenceText(event.attendee_confidence)}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label className="text-base font-medium">Feedback Type</Label>
            <div className="mt-2 space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="feedbackType"
                  value="attendee_correction"
                  checked={feedbackType === 'attendee_correction'}
                  onChange={(e) => setFeedbackType(e.target.value as any)}
                  className="rounded"
                />
                <span className="text-sm">Attendee Count Correction</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="feedbackType"
                  value="venue_correction"
                  checked={feedbackType === 'venue_correction'}
                  onChange={(e) => setFeedbackType(e.target.value as any)}
                  className="rounded"
                />
                <span className="text-sm">Venue Information Correction</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="feedbackType"
                  value="capacity_report"
                  checked={feedbackType === 'capacity_report'}
                  onChange={(e) => setFeedbackType(e.target.value as any)}
                  className="rounded"
                />
                <span className="text-sm">Capacity Report</span>
              </label>
            </div>
          </div>

          {/* Attendee Data Fields */}
          {(feedbackType === 'attendee_correction' || feedbackType === 'capacity_report') && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="reportedAttendees">Reported Attendees</Label>
                <Input
                  id="reportedAttendees"
                  type="number"
                  value={reportedAttendees}
                  onChange={(e) => setReportedAttendees(e.target.value)}
                  placeholder="Enter reported attendee count"
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="actualAttendees">Actual Attendance (Post-Event)</Label>
                <Input
                  id="actualAttendees"
                  type="number"
                  value={actualAttendees}
                  onChange={(e) => setActualAttendees(e.target.value)}
                  placeholder="Enter actual attendance if known"
                  min="0"
                />
              </div>

              <div>
                <Label htmlFor="attendanceSource">Source of Attendance Data</Label>
                <select
                  id="attendanceSource"
                  value={attendanceSource}
                  onChange={(e) => setAttendanceSource(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ticket_sales">Ticket Sales Data</option>
                  <option value="manual_count">Manual Count</option>
                  <option value="organizer_report">Organizer Report</option>
                </select>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information that might help improve our estimates..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </form>

        {/* Help Text */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">How to Help</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Attendee Count Correction:</strong> If you know the actual number of attendees</li>
            <li>• <strong>Venue Information:</strong> If the venue name or capacity is incorrect</li>
            <li>• <strong>Capacity Report:</strong> If you have information about venue capacity</li>
            <li>• Your feedback helps us improve future estimates for similar events</li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

export default AttendeeFeedbackForm;
