import React, { useState, useEffect, useRef } from "react";
import { db } from "../../firebase/firebaseConfig";
import { ref, onValue, update } from "firebase/database";
import { Bell, CheckCheck } from "lucide-react";

// Helper function to format time since notification was created
const timeSince = (date) => {
  const seconds = Math.floor((new Date() - date) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

const Notifications = ({ user, onClose, setActiveTab, setNotificationCount }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  
  // Adjusted userID to handle both studentID and parentID (or general uid)
  const userID = user?.details?.StudentID || user?.details?.ParentID || user?.uid; 

  // Fetch notifications in real-time
  useEffect(() => {
    if (!userID) return;

    const userNotifRef = ref(db, `notifications/user/${userID}`);
    const generalNotifRef = ref(db, `notifications/general`);

    const processSnapshot = (snap, type) => {
        const data = snap.val() || {};
        return Object.keys(data).map(key => ({
            id: key,
            ...data[key],
            path: `notifications/${type}/${userID}/${key}` // Store path for easy updates
        }));
    };

    const unsubUser = onValue(userNotifRef, (snap) => {
        const userNotifs = processSnapshot(snap, 'user');
        setNotifications(prev => [...userNotifs, ...prev.filter(n => n.path.includes('general'))].sort((a,b) => b.timestamp - a.timestamp));
        setLoading(false);
    });

    const unsubGeneral = onValue(generalNotifRef, (snap) => {
        const generalNotifs = processSnapshot(snap, 'general');
        setNotifications(prev => [...generalNotifs, ...prev.filter(n => n.path.includes('user'))].sort((a,b) => b.timestamp - a.timestamp));
        setLoading(false);
    });

    return () => {
      unsubUser();
      unsubGeneral();
    };
  }, [userID]);

  // Update the unread count in the parent dashboard
  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.read).length;
    setNotificationCount(unreadCount);
  }, [notifications, setNotificationCount]);


  // Handle clicking outside the dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);


  // Handle clicking on a single notification
  const handleNotificationClick = (notification) => {
    // Mark as read in Firebase
    if (!notification.read) {
        const updates = {};
        updates[`${notification.path}/read`] = true;
        update(ref(db), updates);
    }
    // Navigate to the relevant tab if a link is provided
    if (notification.tab) {
      setActiveTab(notification.tab);
    }
    onClose();
  };

  // Mark all notifications as read
  const handleMarkAllAsRead = () => {
      const updates = {};
      notifications.forEach(n => {
          if (!n.read) {
              updates[`${n.path}/read`] = true;
          }
      });
      if (Object.keys(updates).length > 0) {
          update(ref(db), updates);
      }
  };

  return (
    <div ref={dropdownRef} style={styles.dropdown}>
      <div style={styles.header}>
        <h4 style={styles.title}>Notifications</h4>
        <button style={styles.markAllReadButton} onClick={handleMarkAllAsRead} title="Mark all as read">
            <CheckCheck size={16}/>
        </button>
      </div>
      <div style={styles.body}>
        {loading ? (
          <p style={styles.placeholder}>Loading...</p>
        ) : notifications.length === 0 ? (
          <p style={styles.placeholder}>No new notifications.</p>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              style={{ ...styles.item, ...(n.read ? styles.readItem : styles.unreadItem) }}
              onClick={() => handleNotificationClick(n)}
            >
              <div style={styles.itemIcon}>
                <Bell size={18} color={n.read ? "#94a3b8" : "#3b82f6"} />
              </div>
              <div>
                <p style={styles.itemMessage}>{n.message}</p>
                <small style={styles.itemTime}>{timeSince(new Date(n.timestamp))}</small>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// --- STYLES ---
const styles = {
  dropdown: {
    position: 'absolute',
    top: '65px',
    right: '20px',
    width: '380px',
    maxHeight: '450px',
    background: 'white',
    borderRadius: '8px',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    zIndex: 1500,
    display: 'flex',
    flexDirection: 'column',
    animation: 'fadeIn 0.2s ease-out',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #e2e8f0',
  },
  title: {
    margin: 0,
    fontSize: '1rem',
    fontWeight: 600,
  },
  markAllReadButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
    padding: '4px',
    borderRadius: '4px',
  },
  body: {
    overflowY: 'auto',
    flexGrow: 1,
  },
  item: {
    display: 'flex',
    gap: '12px',
    padding: '12px 16px',
    cursor: 'pointer',
    borderBottom: '1px solid #f1f5f9',
  },
  unreadItem: {
    backgroundColor: '#eff6ff',
  },
  readItem: {
    backgroundColor: 'white',
  },
  itemIcon: {
    flexShrink: 0,
    paddingTop: '2px',
  },
  itemMessage: {
    margin: 0,
    fontSize: '0.9rem',
    lineHeight: 1.4,
    color: '#334155',
  },
  itemTime: {
    color: '#94a3b8',
    fontSize: '0.75rem',
  },
  placeholder: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: '20px',
  },
};

export default Notifications;