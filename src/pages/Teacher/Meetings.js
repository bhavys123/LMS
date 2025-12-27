// FIX: Added 'useMemo' to the import statement
import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase/firebaseConfig";
import { ref, onValue, push } from "firebase/database";
import { Video, Calendar, Clock, Send } from "lucide-react";

const Meetings = ({ user, myClasses, teachersList, showToast }) => {
    const [meetings, setMeetings] = useState([]);
    const [view, setView] = useState('upcoming'); // upcoming, request
    const [requestDetails, setRequestDetails] = useState({ teacherID: '', reason: '' });
    const studentID = user?.details?.StudentID;

    useEffect(() => {
        if (!studentID) return;
        const meetingsRef = ref(db, 'meetings');
        const unsub = onValue(meetingsRef, (snap) => {
            const data = snap.val() || {};
            const studentMeetings = Object.values(data).filter(m => m.studentID === studentID);
            setMeetings(studentMeetings.sort((a,b) => new Date(b.date) - new Date(a.date)));
        });
        return () => unsub();
    }, [studentID]);

    const handleRequestMeeting = () => {
        if (!requestDetails.teacherID || !requestDetails.reason) {
            return showToast("Please select a teacher and provide a reason.", "error");
        }
        const teacher = teachersList.find(t => t.TeacherID === requestDetails.teacherID);
        push(ref(db, 'meetings'), {
            studentID,
            studentName: user.details.StudentName,
            teacherID: requestDetails.teacherID,
            teacherName: teacher?.TeacherName,
            parentName: user.details.FatherName || "Parent",
            classID: user.details.ClassID,
            reason: requestDetails.reason,
            status: 'REQUESTED',
            createdAt: Date.now(),
            recipientType: 'parent'
        }).then(() => {
            showToast("Meeting request sent successfully!", "success");
            setView('upcoming');
            setRequestDetails({ teacherID: '', reason: '' });
        });
    };

    // FIX: This useMemo hook now has 'useMemo' properly imported
    const myTeachers = useMemo(() => {
        if (!teachersList || !myClasses) return [];
        const teacherIDs = new Set(myClasses.map(c => c.TeacherID));
        return teachersList.filter(t => teacherIDs.has(t.TeacherID));
    }, [teachersList, myClasses]);

    const upcomingMeetings = meetings.filter(m => m.status === 'CONFIRMED' && new Date(m.date) >= new Date());
    const pastMeetings = meetings.filter(m => m.status === 'COMPLETED' || new Date(m.date) < new Date());

    return (
        <div className="content-card">
            <div className="card-header">
                <span className="card-title">My Meetings</span>
                <button className="btn-primary" onClick={() => setView(view === 'request' ? 'upcoming' : 'request')}>
                    {view === 'request' ? 'View Upcoming' : 'Request a Meeting'}
                </button>
            </div>
            
            {view === 'request' ? (
                <div style={{padding: 20}}>
                    <h3>Request a New Meeting</h3>
                    <div className="form-group">
                        <label>Teacher</label>
                        <select className="form-control" value={requestDetails.teacherID} onChange={e => setRequestDetails({...requestDetails, teacherID: e.target.value})}>
                            <option value="">-- Select Teacher --</option>
                            {myTeachers.map(t => <option key={t.TeacherID} value={t.TeacherID}>{t.TeacherName}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Reason for Meeting</label>
                        <textarea className="form-control" value={requestDetails.reason} onChange={e => setRequestDetails({...requestDetails, reason: e.target.value})}></textarea>
                    </div>
                    <button className="btn-primary" onClick={handleRequestMeeting}><Send size={16}/> Send Request</button>
                </div>
            ) : (
                <div>
                    <h4 style={{padding: '0 20px'}}>Upcoming Meetings</h4>
                    {upcomingMeetings.length > 0 ? upcomingMeetings.map(m => (
                        <div key={m.id} style={{padding: 20, borderBottom: '1px solid #f1f5f9'}}>
                            <h5>{m.teacherName}</h5>
                            <p><Calendar size={14}/> {m.date} <Clock size={14}/> {m.startTime} - {m.endTime}</p>
                            <a href={m.link} target="_blank" rel="noopener noreferrer" className="btn-primary"><Video size={16}/> Join Meeting</a>
                        </div>
                    )) : <p style={{padding: 20, color: '#94a3b8'}}>No upcoming meetings.</p>}

                    <h4 style={{padding: '20px 20px 0'}}>Past Meetings</h4>
                    {pastMeetings.length > 0 ? pastMeetings.map(m => (
                         <div key={m.id} style={{padding: 20, borderBottom: '1px solid #f1f5f9', opacity: 0.7}}>
                            <h5>{m.teacherName}</h5>
                            <p>{m.date} - <span className={`badge badge-${m.status === 'COMPLETED' ? 'success' : 'danger'}`}>{m.status}</span></p>
                         </div>
                    )) : <p style={{padding: 20, color: '#94a3b8'}}>No past meetings.</p>}
                </div>
            )}
        </div>
    );
};

export default Meetings;