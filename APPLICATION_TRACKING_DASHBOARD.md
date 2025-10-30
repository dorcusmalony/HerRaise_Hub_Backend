# 📊 Application Tracking Dashboard

## Frontend Implementation

### 1. Application Dashboard Component
```javascript
import { useState, useEffect } from 'react';

const ApplicationDashboard = () => {
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const response = await fetch('/api/opportunity-tracking/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setApplications(data.applications);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (opportunityId, newStatus, notes = '') => {
    try {
      const response = await fetch(`/api/opportunity-tracking/${opportunityId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus, notes })
      });
      
      const data = await response.json();
      if (data.success) {
        // Refresh applications
        fetchApplications();
        toast.success(data.message);
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      interested: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      submitted: 'bg-purple-100 text-purple-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      interested: 'Interested',
      in_progress: 'In Progress',
      submitted: 'Submitted',
      accepted: 'Accepted',
      rejected: 'Rejected'
    };
    return labels[status] || status;
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading applications...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">My Opportunities</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.interested || 0}</div>
          <div className="text-sm text-blue-800">Interested</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.in_progress || 0}</div>
          <div className="text-sm text-yellow-800">In Progress</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-purple-600">{stats.submitted || 0}</div>
          <div className="text-sm text-purple-800">Submitted</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-green-600">{stats.accepted || 0}</div>
          <div className="text-sm text-green-800">Accepted</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <div className="text-2xl font-bold text-red-600">{stats.rejected || 0}</div>
          <div className="text-sm text-red-800">Rejected</div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Opportunity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deadline
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.map((app) => (
                <ApplicationRow
                  key={app.id}
                  application={app}
                  onStatusUpdate={updateStatus}
                  getStatusColor={getStatusColor}
                  getStatusLabel={getStatusLabel}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {applications.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No applications yet</div>
          <a href="/opportunities" className="text-pink-600 hover:text-pink-700">
            Browse opportunities →
          </a>
        </div>
      )}
    </div>
  );
};

export default ApplicationDashboard;
```

### 2. Application Row Component
```javascript
const ApplicationRow = ({ application, onStatusUpdate, getStatusColor, getStatusLabel }) => {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  
  const opportunity = application.Opportunity;
  const deadline = new Date(opportunity.applicationDeadline).toLocaleDateString();
  const isExpired = new Date(opportunity.applicationDeadline) < new Date();

  const statusOptions = [
    { value: 'interested', label: 'Interested' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'accepted', label: 'Accepted' },
    { value: 'rejected', label: 'Rejected' }
  ];

  const handleStatusChange = (newStatus) => {
    onStatusUpdate(opportunity.id, newStatus);
    setShowStatusDropdown(false);
  };

  return (
    <tr className={isExpired ? 'bg-gray-50' : ''}>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="text-sm font-medium text-gray-900">
            {opportunity.title}
          </div>
          <div className="text-sm text-gray-500">
            {opportunity.organization} • {opportunity.type}
          </div>
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`text-sm ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
          {deadline}
          {isExpired && <div className="text-xs text-red-500">Expired</div>}
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(application.applicationStatus)}`}>
          {getStatusLabel(application.applicationStatus)}
        </span>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
        <div className="flex space-x-2">
          {/* Status Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
              className="text-indigo-600 hover:text-indigo-900"
            >
              Change Status
            </button>
            
            {showStatusDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                <div className="py-1">
                  {statusOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleStatusChange(option.value)}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* External Link */}
          <a
            href={opportunity.applicationLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-pink-600 hover:text-pink-900"
          >
            Apply
          </a>
        </div>
      </td>
    </tr>
  );
};
```

### 3. Quick Status Update Component
```javascript
const QuickStatusUpdate = ({ opportunityId, currentStatus, onUpdate }) => {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  
  const statusOptions = [
    { value: 'interested', label: '💡 Interested', color: 'text-blue-600' },
    { value: 'in_progress', label: '⏳ In Progress', color: 'text-yellow-600' },
    { value: 'submitted', label: '📤 Submitted', color: 'text-purple-600' },
    { value: 'accepted', label: '🎉 Accepted', color: 'text-green-600' },
    { value: 'rejected', label: '❌ Rejected', color: 'text-red-600' }
  ];

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    setSelectedStatus(newStatus);
    onUpdate(opportunityId, newStatus);
  };

  return (
    <select
      value={selectedStatus}
      onChange={handleStatusChange}
      className="text-sm border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-pink-500"
    >
      {statusOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};
```

## 🎯 API Endpoints

### Get Application Dashboard
```
GET /api/opportunity-tracking/dashboard
Response: {
  "success": true,
  "applications": [...],
  "stats": {
    "interested": 5,
    "in_progress": 3,
    "submitted": 2,
    "accepted": 1,
    "rejected": 0
  }
}
```

### Update Application Status
```
PUT /api/opportunity-tracking/:opportunityId/status
Body: {
  "status": "submitted",
  "notes": "Applied via university portal"
}
```

## 📱 Mobile-Friendly Cards View
```javascript
const ApplicationCards = ({ applications, onStatusUpdate }) => {
  return (
    <div className="grid gap-4 md:hidden">
      {applications.map((app) => (
        <div key={app.id} className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-gray-900">{app.Opportunity.title}</h3>
            <QuickStatusUpdate
              opportunityId={app.Opportunity.id}
              currentStatus={app.applicationStatus}
              onUpdate={onStatusUpdate}
            />
          </div>
          
          <p className="text-sm text-gray-600 mb-2">
            {app.Opportunity.organization} • {app.Opportunity.type}
          </p>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              Deadline: {new Date(app.Opportunity.applicationDeadline).toLocaleDateString()}
            </span>
            <a
              href={app.Opportunity.applicationLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-600 text-sm hover:text-pink-700"
            >
              Apply →
            </a>
          </div>
        </div>
      ))}
    </div>
  );
};
```

## ✅ Complete User Experience

1. **User clicks "Apply"** → Tracked as "interested"
2. **User returns** → Can update to "in_progress" 
3. **User submits application** → Updates to "submitted"
4. **User gets response** → Updates to "accepted" or "rejected"
5. **Dashboard shows progress** → Visual stats and status tracking

Your application tracking system is now complete and user-friendly! 🎯