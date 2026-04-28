import { useState } from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

const SHEET_URL = "https://script.google.com/macros/s/AKfycbwD8CMFoP5XoOwRLwK_OxMMOFKF8fS2CRpbJkNdOHjbnJIepkOLzlGrg3GQNGRqbwB6bA/exec";
const STORAGE_KEY = "btl-mobility-inline-feedback";

interface Props {
  requestId: string;
  decision: string;
}

interface FeedbackRecord {
  request_id: string;
  decision: string;
  rating: 'accurate' | 'inaccurate';
  comment: string;
  timestamp: string;
  sent: boolean;
}

export function InlineFeedback({ requestId, decision }: Props) {
  const [rating, setRating] = useState<'accurate' | 'inaccurate' | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (selectedRating: 'accurate' | 'inaccurate') => {
    if (submitted) return;
    setRating(selectedRating);

    // If inaccurate and no comment yet, wait for comment
    if (selectedRating === 'inaccurate' && !comment.trim()) return;

    await sendFeedback(selectedRating);
  };

  const sendFeedback = async (selectedRating: 'accurate' | 'inaccurate') => {
    setSending(true);
    const record: FeedbackRecord = {
      request_id: requestId,
      decision,
      rating: selectedRating,
      comment: comment.trim(),
      timestamp: new Date().toISOString(),
      sent: false,
    };

    // Save locally
    const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    existing.push(record);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    // Send to Google Sheet
    try {
      await fetch(SHEET_URL, {
        method: 'POST', mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          app: 'מנוע זכויות ניידות',
          name: 'פידבק הרצה',
          category: selectedRating === 'accurate' ? '✅ מדויק' : '❌ לא מדויק',
          severity: selectedRating === 'inaccurate' ? 'קריטי' : 'שיפור',
          text: `[${requestId}] החלטה: ${decision} | דירוג: ${selectedRating === 'accurate' ? 'מדויק' : 'לא מדויק'}${comment.trim() ? ' | הערה: ' + comment.trim() : ''}`,
          page: window.location.pathname,
        }),
      });
      record.sent = true;
      existing[existing.length - 1] = record;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
    } catch {
      // saved locally, will retry
    }

    setSending(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
        <p className="text-sm text-gray-600">
          {rating === 'accurate' ? '✅ תודה! סומן כמדויק' : '📝 תודה! הפידבק נשמר ויבדק'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
      <p className="text-sm font-medium text-gray-700">האם התוצאה מדויקת?</p>
      <div className="flex gap-2">
        <button
          onClick={() => handleSubmit('accurate')}
          disabled={sending}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
            rating === 'accurate'
              ? 'border-green-500 bg-green-50 text-green-700'
              : 'border-gray-300 bg-white text-gray-600 hover:border-green-400'
          }`}
        >
          <ThumbsUp className="h-4 w-4" />
          <span>מדויק</span>
        </button>
        <button
          onClick={() => setRating('inaccurate')}
          disabled={sending}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
            rating === 'inaccurate'
              ? 'border-red-500 bg-red-50 text-red-700'
              : 'border-gray-300 bg-white text-gray-600 hover:border-red-400'
          }`}
        >
          <ThumbsDown className="h-4 w-4" />
          <span>לא מדויק</span>
        </button>
      </div>

      {rating === 'inaccurate' && (
        <div className="space-y-2">
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="מה לא מדויק? (חובה)"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1B3A5C] min-h-[60px]"
            dir="rtl"
          />
          <button
            onClick={() => sendFeedback('inaccurate')}
            disabled={!comment.trim() || sending}
            className="px-4 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: '#1B3A5C' }}
          >
            {sending ? 'שולח...' : 'שלח פידבק'}
          </button>
        </div>
      )}
    </div>
  );
}
