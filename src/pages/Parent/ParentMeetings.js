import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase/firebaseConfig";
import { ref, onValue, push } from "firebase/database";
import { Video, Calendar, Clock, Send } from "lucide-react";

const ParentMeetings = ({ user, selectedChildClasses, teachersList, showToast, selectedChildId, selectedChildName }) => {
    const [meetings, setMeetings] = useState([]);
    const [view, setView] = useState('upcoming'); // upcoming, request
    const [requestDetails, setRequestDetails] = useState({ teacherID: '', reason: '' });
    
    const parentID = user?.details?.ParentID; // Parent's ID
    const parentName = user?.details?.ParentName;

    useEffect(() => {
        if (!parentID) return;
        const meetingsRef = ref(db, 'meetings');
        const unsub = onValue(meetingsRef, (snap) => {
            const data = snap.val() || {};
            // Filter meetings relevant to this parent OR this child
            const relevantMeetings = Object.values(data).filter(m => 
                m.parentID === parentID || m.studentID === selectedChildId // A meeting might be linked to parent or directly to child by teacher
            );
            setMeetings(relevantMeetings.sort((a,b) => new Date(b.date) - new Date(a.date)));
        });
        return () => unsub();
    }, [parentID, selectedChildId]);

    const handleRequestMeeting = () => {
        if (!requestDetails.teacherID || !requestDetails.reason) {
            return showToast("Please select a teacher and provide a reason.", "error");
        }
        const teacher = teachersList.find(t => t.TeacherID === requestDetails.teacherID);
        
        push(ref(db, 'meetings'), {
            parentID,
            parentName,
            studentID: selectedChildId, // Link to the child
            studentName: selectedChildName,
            teacherID: requestDetails.teacherID,
            teacherName: teacher?.TeacherName,
            reason: requestDetails.reason,
            status: 'REQUESTED',
            createdAt: Date.now(),
            recipientType: 'teacher' // Indicates who needs to act on it (the teacher)
        }).then(() => {
            showToast("Meeting request sent successfully!", "success");
            setView('upcoming');
            setRequestDetails({ teacherID: '', reason: '' });
        }).catch(() => showToast("Failed to send meeting request.", "error"));
    };

    const myTeachers = useMemo(() => {
        if (!teachersList || !selectedChildClasses) return [];
        const teacherIDs = new Set(selectedChildClasses.map(c => c.TeacherID));
        return teachersList.filter(t => teacherIDs.has(t.TeacherID));
    }, [teachersList, selectedChildClasses]);

    const upcomingMeetings = meetings.filter(m => m.status === 'CONFIRMED' && new Date(m.date) >= new Date());
    const pastMeetings = meetings.filter(m => m.status === 'COMPLETED' || new Date(m.date) < new Date());

    return (
        <div className="content-card">
            <div className="card-header">
                <span className="card-title">My Meetings</span>
                <button className="btn-primary" onClick={() => setView(view === 'request' ? 'upcoming' : 'request')}>
                    {view === 'request' ? 'View Meetings' : 'Request a Meeting'}
                </button>
            </div>
            
            {view === 'request' ? (
                <div style={{padding: 20}}>
                    <h3>Request a New Meeting (for {selectedChildName})</h3>
                    <div className="form-group">
                        <label>Teacher</label>
                        <select className="form-control" value={requestDetails.teacherID} onChange={e => setRequestDetails({...requestDetails, teacherID: e.target.value})}>
                            <option value="">-- Select Teacher --</option>
                            {myTeachers.length === 0 ? (
                                <option disabled>No teachers found for {selectedChildName}'s classes.</option>
                            ) : (
                                myTeachers.map(t => <option key={t.TeacherID} value={t.TeacherID}>{t.TeacherName}</option>)
                            )}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Reason for Meeting</label>
                        <textarea className="form-control" value={requestDetails.reason} onChange={e => setRequestDetails({...requestDetails, reason: e.target.value})} placeholder="e.g., Discuss {selectedChildName}'s progress in Math"></textarea>
                    </div>
                    <button className="btn-primary" onClick={handleRequestMeeting}><Send size={16}/> Send Request</button>
                </div>
            ) : (
                <div>
                    <h4 style={{padding: '0 20px'}}>Upcoming Meetings</h4>
                    {upcomingMeetings.length > 0 ? upcomingMeetings.map(m => (
                        <div key={m.id} style={{padding: 20, borderBottom: '1px solid #f1f5f9'}}>
                            <h5>Meeting with {m.teacherName} (regarding {m.studentName || 'your child'})</h5>
                            <p><strong>Reason:</strong> {m.reason}</p>
                            {m.status === 'CONFIRMED' && m.date && m.startTime && m.endTime && (
                                <p><Calendar size={14}/> {m.date} <Clock size={14}/> {m.startTime} - {m.endTime}</p>
                            )}
                            {m.link && <a href={m.link} target="_blank" rel="noopener noreferrer" className="btn-primary"><Video size={16}/> Join Meeting</a>}
                            {!m.link && m.status === 'CONFIRMED' && <p className="badge badge-info">Link will be provided by teacher.</p>}
                            {m.status === 'REQUESTED' && <p className="badge badge-warning">Status: Pending Teacher Confirmation</p>}
                        </div>
                    )) : <p style={{padding: 20, color: '#94a3b8'}}>No upcoming meetings.</p>}

                    <h4 style={{padding: '20px 20px 0'}}>Past Meetings</h4>
                    {pastMeetings.length > 0 ? pastMeetings.map(m => (
                         <div key={m.id} style={{padding: 20, borderBottom: '1px solid #f1f5f9', opacity: 0.7}}>
                            <h5>Meeting with {m.teacherName} (regarding {m.studentName || 'your child'})</h5>
                            <p><strong>Reason:</strong> {m.reason}</p>
                            <p>{m.date} - <span className={`badge badge-${m.status === 'COMPLETED' ? 'success' : 'danger'}`}>{m.status}</span></p>
                         </div>
                    )) : <p style={{padding: 20, color: '#94a3b8'}}>No past meetings.</p>}
                </div>
            )}
        </div>
    );
};

export default ParentMeetings;