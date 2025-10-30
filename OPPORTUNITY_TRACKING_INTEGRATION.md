# 🎯 Opportunity Tracking System Integration Guide

## Overview
Smart tracking system that monitors user interactions with opportunities and sends automated reminders.

## 🔄 User Flow

### 1. User Clicks "Apply Now" Button
```javascript
// Frontend: When user clicks external application link
const handleApplyClick = async (opportunityId) => {
  try {
    const response = await fetch(`/api/opportunity-tracking/${opportunityId}/track-click`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    if (data.success) {
      // Redirect to external application site
      window.open(data.redirectUrl, '_blank');
    }
  } catch (error) {
    console.error('Tracking failed:', error);
  }
};
```

### 2. User Returns to Platform
```javascript
// Frontend: Check if user should see interest popup when they return
useEffect(() => {
  const checkForInterestPopup = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const opportunityId = urlParams.get('opportunity_id');
    
    if (opportunityId) {
      try {
        const response = await fetch(`/api/opportunity-tracking/${opportunityId}/track-return`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const data = await response.json();
        if (data.showInterestPopup) {
          setShowInterestModal(true);
          setSelectedOpportunity(data.opportunity);
        }
      } catch (error) {
        console.error('Return tracking failed:', error);
      }
    }
  };
  
  checkForInterestPopup();
}, []);
```

### 3. Interest Popup Component
```javascript
const InterestPopup = ({ opportunity, onClose }) => {
  const [wantsReminder, setWantsReminder] = useState(false);
  
  const handleInterested = async () => {
    try {
      const response = await fetch(`/api/opportunity-tracking/${opportunity.id}/interested`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wantsReminder })
      });
      
      const data = await response.json();
      if (data.success) {
        toast.success(data.message);
        onClose();
      }
    } catch (error) {
      console.error('Interest tracking failed:', error);
    }
  };
  
  return (
    <Modal isOpen onClose={onClose}>
      <div className="p-6">
        <h3 className="text-xl font-bold mb-4">
          How was your experience with {opportunity.title}?
        </h3>
        
        <p className="mb-4">Did you find this opportunity interesting?</p>
        
        <div className="mb-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={wantsReminder}
              onChange={(e) => setWantsReminder(e.target.checked)}
              className="mr-2"
            />
            Remind me 3 days before the deadline
          </label>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleInterested}
            className="bg-pink-500 text-white px-4 py-2 rounded hover:bg-pink-600"
          >
            Yes, I'm Interested! 💖
          </button>
          <button
            onClick={onClose}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
          >
            Not This Time
          </button>
        </div>
      </div>
    </Modal>
  );
};
```

## 📧 Automated Reminders

### Email Reminders
- **When**: 3 days before deadline
- **Time**: Daily at 9 AM (Africa/Juba timezone)
- **Content**: Personalized email with opportunity details and direct link

### In-App Notifications
- **Real-time**: Socket.IO notifications
- **Persistent**: Database notifications with high priority
- **Push**: Browser notifications even when offline

## 🎯 API Endpoints

### Track External Click
```
POST /api/opportunity-tracking/:opportunityId/track-click
```

### Track User Return
```
POST /api/opportunity-tracking/:opportunityId/track-return
```

### Mark as Interested
```
POST /api/opportunity-tracking/:opportunityId/interested
Body: { "wantsReminder": true/false }
```

### Get User's Interested Opportunities
```
GET /api/opportunity-tracking/interested
```

## 🔔 Notification Types

1. **Real-time Socket.IO** - Instant notifications while browsing
2. **Database Storage** - Persistent notifications for later viewing
3. **Email Reminders** - 3 days before deadline
4. **Browser Push** - Cross-device notifications

##  Frontend Integration Tips

1. **URL Parameters**: Add `?opportunity_id=123` when users return from external sites
2. **Local Storage**: Track which opportunities user has interacted with
3. **Toast Notifications**: Show success messages for better UX
4. **Loading States**: Show loading while tracking requests are processing

##  Benefits

- **Smart Tracking**: Know exactly which opportunities users engage with
- **Automated Reminders**: Never let users miss important deadlines
- **Better Engagement**: Personalized follow-up increases application rates
- **Data Insights**: Track which opportunities are most popular
- **Cross-Device**: Works on any device user logs in from

This system works exactly like Facebook's engagement tracking - smart, automated, and user-friendly! 