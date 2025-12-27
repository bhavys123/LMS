import React, { useState, useEffect } from "react";
import { db } from "../../firebase/firebaseConfig";
import { ref, onValue } from "firebase/database";
import { Users, Clock, ClipboardList, BookOpen, Bell } from "lucide-react";

// --- START: STATIC STYLING OBJECTS ---
// Moved outside of the components to resolve 'is not defined' errors
const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
};

const modalContentStyle = {
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '12px',
    width: '90%',
    maxWidth: '450px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
};

const closeButtonStyle = {
    marginTop: '20px',
    width: '100%',
    padding: '10px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'var(--primary)',
    color: 'white',
    cursor: 'pointer',
    fontWeight: 600,
};

const statTitleStyle = {
    fontWeight: 500, 
    color: '#64748b', 
    fontSize: '1rem', 
    display: 'flex', 
    alignItems: 'center',
    marginBottom: '5px'
};

const statCountStyle = {
    fontWeight: 800, 
    fontSize: '2.5rem', 
    color: '#1e293b', 
    lineHeight: 1
};

const classCardStyle = {
    background:'#f8fafc', 
    padding:20, 
    borderRadius:12, 
    border:'1px solid #e2e8f0', 
    boxShadow:'0 2px 4px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: '120px'
}

// Function styles need to remain functions to accept dynamic arguments
const statBoxStyle = (color) => ({
    background: 'white', 
    padding: '20px', 
    borderRadius: '12px', 
    border: `2px solid ${color}`, 
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
});

const absentCounterStyle = (isAbsent) => ({
    marginTop: 10,
    padding: '5px 10px',
    borderRadius: 6,
    background: isAbsent ? '#fee2e2' : '#dcfce7', // Red for absent, Green for 0 absent
    color: isAbsent ? '#ef4444' : '#10b981', 
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: isAbsent ? 'pointer' : 'default',
    transition: 'background 0.2s',
    alignSelf: 'flex-end',
});
// --- END: STATIC STYLING OBJECTS ---


// Helper function to get the 3-letter day name (e.g., "Mon")
const getDayName = (dateStr) => {
  const d = new Date(`${dateStr}T12:00:00`); 
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[d.getDay()];
};

// Simple Modal component for Absent Details
const AbsentDetailModal = ({ attendance, onClose }) => {
    if (!attendance) return null;

    return (
        <div style={modalOverlayStyle}>
            <div style={modalContentStyle}>
                <h3 style={{marginTop: 0, color: 'var(--primary)'}}>Absent Students - {attendance.className}</h3>
                <p style={{color: '#64748b'}}>Date: {attendance.date}</p>
                <div style={{maxHeight: '300px', overflowY: 'auto', padding: '10px 0'}}>
                    {attendance.absentStudents.length > 0 ? (
                        <ul style={{listStyleType: 'none', padding: 0, margin: 0}}>
                            {attendance.absentStudents.map((id, index) => (
                                <li key={id} style={{padding: '8px 0', borderBottom: index < attendance.absentStudents.length - 1 ? '1px solid #f1f5f9' : 'none', color: '#1e293b'}}>
                                    <Users size={14} style={{marginRight: 8, color: '#ef4444'}}/>
                                    Student ID: <span style={{fontWeight: 600}}>{id}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No absent records found for this class.</p>
                    )}
                </div>
                <button onClick={onClose} style={closeButtonStyle}>Close</button>
            </div>
        </div>
    );
};

const DashboardHome = ({ myClasses, notifications }) => {
  const todayDate = new Date().toISOString().split('T')[0];
  const [assignCount, setAssignCount] = useState(0);
  const [absentStudentsByClass, setAbsentStudentsByClass] = useState({});
  const [showAbsentModal, setShowAbsentModal] = useState(false);
  const [selectedClassAttendance, setSelectedClassAttendance] = useState(null);

  // 1. Fetch Total Assignments Count
  useEffect(() => {
    const unsub = onValue(ref(db, 'assignments'), (snap) => {
        setAssignCount(snap.size || 0);
    });
    return () => unsub();
  }, []);

  // 2. Fetch Today's Absent Count for Classes
  useEffect(() => {
    const attendanceRef = ref(db, `attendance/${todayDate}`);
    const unsub = onValue(attendanceRef, (snap) => {
        const rawData = snap.val() || {};
        const absentMap = {};
        
        Object.keys(rawData).forEach(classID => {
            const students = rawData[classID];
            let absentCount = 0;
            let absentList = [];
            
            Object.keys(students).forEach(studentID => {
                if (students[studentID] === 'absent') {
                    absentCount++;
                    absentList.push(studentID); // Store ID for modal
                }
            });
            
            absentMap[classID] = { count: absentCount, students: absentList };
        });

        setAbsentStudentsByClass(absentMap);
    });
    return () => unsub();
  }, [todayDate]);


  const todayClasses = myClasses.filter(c => 
      c.Days && String(c.Days).toLowerCase().includes(getDayName(todayDate).toLowerCase())
  );

  const handleShowAbsentDetails = (classID, className, absentStudents) => {
    setSelectedClassAttendance({ 
        classID, 
        className, 
        absentStudents,
        date: todayDate 
    });
    setShowAbsentModal(true);
  };
  
  return (
      <>
        {/* STATS SECTION - Visually Enhanced */}
        <div className="grid-3" style={{gap: '20px'}}>
            <div style={statBoxStyle('#3b82f6')}>
                <div style={statTitleStyle}><Users size={18} style={{marginRight: 5, color:'#3b82f6'}}/> My Classes</div>
                <div style={statCountStyle}>{myClasses.length}</div>
            </div>
            <div style={statBoxStyle('#f59e0b')}>
                <div style={statTitleStyle}><ClipboardList size={18} style={{marginRight: 5, color:'#f59e0b'}}/> Total Assignments</div>
                <div style={statCountStyle}>{assignCount}</div>
            </div>
            <div style={statBoxStyle('#10b981')}>
                <div style={statTitleStyle}><Bell size={18} style={{marginRight: 5, color:'#10b981'}}/> Pending Actions</div>
                <div style={statCountStyle}>{notifications.meetings + notifications.messages}</div>
                <div style={{fontSize: '0.85rem', color: '#64748b', marginTop: '5px'}}>({notifications.meetings} Meetings, {notifications.messages} Messages)</div>
            </div>
        </div>
        
        {/* TODAY'S SCHEDULE SECTION */}
        <div className="content-card" style={{marginTop: '25px'}}>
            <div className="card-header"><span className="card-title">Today's Schedule</span></div>
            <div className="grid-3" style={{gridTemplateColumns:'repeat(auto-fill, minmax(250px, 1fr))', gap:'15px'}}>
                {todayClasses.map(c => {
                    const attendanceInfo = absentStudentsByClass[c.ClassID] || { count: 0, students: [] };
                    const absentCount = attendanceInfo.count;
                    
                    return (
                        <div key={c.ClassID} style={classCardStyle}>
                            <div>
                                <div style={{color:'#0ea5e9', fontWeight:700, fontSize:'14px', marginBottom:5, display:'flex', alignItems:'center'}}>
                                    <Clock size={14} style={{marginRight: 5}}/> {c.StartTime} - {c.EndTime}
                                </div>
                                <div style={{fontWeight:800, fontSize:'1.25rem', color:'#1e293b'}}>{c.ClassName}</div>
                                <div style={{color:'#64748b', fontSize:'0.9rem', display:'flex', alignItems:'center'}}>
                                    <BookOpen size={14} style={{marginRight: 5}}/> {c.SubjectName}
                                </div>
                            </div>
                            
                            {/* Clickable Absent Counter */}
                            <div 
                                style={absentCounterStyle(absentCount > 0)}
                                onClick={() => absentCount > 0 && handleShowAbsentDetails(c.ClassID, c.ClassName, attendanceInfo.students)}
                            >
                                {absentCount} Absent
                            </div>
                        </div>
                    );
                })}
                {todayClasses.length === 0 && <p style={{color:'#94a3b8', fontStyle:'italic', padding: '10px 0'}}>🎉 No classes scheduled for today. Enjoy!</p>}
            </div>
        </div>
        
        {/* ABSENT DETAILS MODAL */}
        {showAbsentModal && (
            <AbsentDetailModal 
                attendance={selectedClassAttendance} 
                onClose={() => setShowAbsentModal(false)} 
            />
        )}
      </>
  );
};

export default DashboardHome;