import React, { useState, useEffect } from "react";
// Import 'update' for marking messages as read
import { db } from "../../firebase/firebaseConfig";
import { ref, onValue, update } from "firebase/database"; 
import { MessageSquare, Calendar, X, Clock } from "lucide-react";

// Add setNotificationCount prop
const Notifications = ({ user, onClose, setActiveTab, setNotificationCount }) => {
    const [alerts, setAlerts] = useState([]);

    // Function to mark all unread messages in a conversation as read
    const markMessageAsRead = async (convID) => {
        try {
            const updates = {};
            // Fetch current messages using onValue with onlyOnce for a snapshot
            const snap = await new Promise(resolve => onValue(ref(db, `messages/${convID}`), resolve, { onlyOnce: true }));
            const messages = snap.val() || {};

            // Identify unread parent messages and prepare update object
            Object.keys(messages).forEach(msgKey => {
                const msg = messages[msgKey];
                if (msg.sender === 'parent' && !msg.read) {
                    // Path: messages/convID/msgKey/read = true
                    // Prepare the update object for batch update
                    updates[`messages/${convID}/${msgKey}/read`] = true;
                }
            });

            // Apply the updates to the database root
            if (Object.keys(updates).length > 0) {
                await update(ref(db), updates); 
            }
        } catch (error) {
            console.error("Error marking messages as read:", error);
        }
    };

    useEffect(() => {
        if (!user?.details?.TeacherID) return;

        const items = [];
        const teacherID = user.details.TeacherID;
        
        // Use a counter to manage both listeners for synchronous state update
        let pendingUpdates = 2; 

        const processUpdates = () => {
            pendingUpdates--;
            if (pendingUpdates === 0) {
                // 3. Sort by newest first and set state
                const sorted = items.sort((a,b) => b.timestamp - a.timestamp);
                setAlerts([...sorted]);
                
                // FIX: Pass the count back to the parent component
                if (setNotificationCount) {
                    setNotificationCount(sorted.length);
                }
            }
        };

        // 1. Fetch Unread Messages
        const unsubMsg = onValue(ref(db, 'messages'), (snap) => {
            // Clear existing messages to prevent duplicates on update
            const currentMessages = items.filter(item => item.type !== 'message');
            items.splice(0, items.length, ...currentMessages); 

            const data = snap.val() || {};
            Object.keys(data).forEach(convID => {
                // Check if this conversation belongs to the teacher
                if(convID.includes(teacherID)) {
                    const thread = Object.values(data[convID]);
                    // Count unread from parent
                    const unreadCount = thread.filter(m => m.sender === 'parent' && !m.read).length;
                    
                    if (unreadCount > 0) {
                        const lastMsg = thread[thread.length - 1];
                        // Extract student ID from convID (format: StudentID_TeacherID)
                        const studentID = convID.split('_')[0]; 
                        
                        items.push({
                            type: 'message',
                            id: convID,
                            count: unreadCount,
                            text: `You have ${unreadCount} new message(s) from a parent.`,
                            subtext: lastMsg.text.substring(0, 30) + (lastMsg.text.length > 30 ? "..." : ""),
                            timestamp: lastMsg.timestamp,
                            linkTab: 'messages',
                            data: { studentID } // Pass ID to select the chat automatically
                        });
                    }
                }
            });
            processUpdates();
        });

        // 2. Fetch Pending Meetings
        const unsubMeet = onValue(ref(db, 'meetings'), (snap) => {
             // Clear existing meetings to prevent duplicates on update
            const currentMeetings = items.filter(item => item.type !== 'meeting');
            items.splice(0, items.length, ...currentMeetings);

            const data = snap.val() || {};
            Object.keys(data).forEach(key => {
                const m = data[key];
                if (m.teacherID === teacherID && m.status === 'REQUESTED') {
                    items.push({
                        type: 'meeting',
                        id: key,
                        text: `New Meeting Request: ${m.parentName}`,
                        subtext: `Student: ${m.studentName} • ${m.date}`,
                        timestamp: m.createdAt || Date.now(),
                        linkTab: 'meetings'
                    });
                }
            });
            processUpdates();
        });

        return () => { unsubMsg(); unsubMeet(); };

    }, [user, setNotificationCount]); // Dependency on setNotificationCount is important

    const handleItemClick = (item) => { // Accept the item object
        // FIX: Mark message as read upon clicking to make it disappear
        if (item.type === 'message') {
            markMessageAsRead(item.id);
        }
        
        setActiveTab(item.linkTab); // Switch the main dashboard tab
        onClose(); // Close the notification dropdown
    };

    return (
        <div className="notification-dropdown" style={{
            position: 'absolute', top: '60px', right: '20px', width: '320px',
            background: 'white', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            border: '1px solid #e2e8f0', zIndex: 1000, overflow: 'hidden', animation: 'fadeIn 0.2s ease'
        }}>
            <div style={{
                padding: '15px', borderBottom: '1px solid #f1f5f9', display: 'flex',
                justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc'
            }}>
                <h4 style={{margin:0, fontSize: '0.95rem'}}>Notifications ({alerts.length})</h4>
                <button onClick={onClose} style={{background:'none', border:'none', cursor:'pointer', color:'#64748b'}}><X size={16}/></button>
            </div>
            
            <div style={{maxHeight: '400px', overflowY: 'auto'}}>
                {alerts.length > 0 ? alerts.map((item, idx) => (
                    // Pass the item object to handleItemClick
                    <div key={item.id || idx} onClick={() => handleItemClick(item)} style={{
                        padding: '15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                        display: 'flex', gap: '12px', alignItems: 'flex-start', transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                    >
                        <div style={{
                            background: item.type === 'message' ? '#e0e7ff' : '#dcfce7',
                            color: item.type === 'message' ? '#4f46e5' : '#16a34a',
                            padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center'
                        }}>
                            {item.type === 'message' ? <MessageSquare size={16}/> : <Calendar size={16}/>}
                        </div>
                        <div>
                            <div style={{fontSize: '0.85rem', fontWeight: 600, color: '#1e293b'}}>{item.text}</div>
                            <div style={{fontSize: '0.75rem', color: '#64748b', marginTop: '2px'}}>{item.subtext}</div>
                            <div style={{fontSize: '0.7rem', color: '#94a3b8', marginTop: '5px', display:'flex', alignItems:'center', gap:3}}>
                                <Clock size={10} /> 
                                {new Date(item.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                {' '}- {new Date(item.timestamp).toLocaleDateString()}
                            </div>
                        </div>
                    </div>
                )) : (
                    <div style={{padding: '30px', textAlign: 'center', color: '#94a3b8'}}>
                        <div style={{marginBottom: 5}}>🎉</div>
                        <small>No new notifications</small>
                    </div>
                )}
            </div>
            
            {alerts.length > 0 && (
                <div style={{padding: '10px', textAlign: 'center', borderTop: '1px solid #f1f5f9', background: '#f8fafc'}}>
                    <small style={{color: 'var(--primary)', cursor: 'pointer', fontWeight: 600}} onClick={onClose}>Close</small>
                </div>
            )}
        </div>
    );
};

export default Notifications;