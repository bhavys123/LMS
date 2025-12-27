import React, { useState, useEffect } from "react";
import { db } from "../../firebase/firebaseConfig";
import { ref, onValue } from "firebase/database";
import { BookOpen, Clock } from "lucide-react";

// Helper function to get day name
const getDayName = (dateStr) => {
  const d = new Date(`${dateStr}T12:00:00`);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[d.getDay()];
};

// --- Component for the Attendance Progress Circle ---
const AttendanceCircle = ({ percentage }) => {
    const isGood = percentage >= 75;
    const color = isGood ? '#10b981' : '#ef4444';
    const backgroundStyle = {
        background: `conic-gradient(${color} ${percentage}%, #e2e8f0 ${percentage}%)`
    };

    return (
        <div style={{...styles.progressCircle, ...backgroundStyle}}>
            <div style={styles.progressInnerCircle}>
                <span style={{...styles.progressText, color: color}}>{Math.round(percentage)}%</span>
            </div>
        </div>
    );
};

const ParentDashboardHome = ({ selectedChildId, selectedChildName, selectedChildClasses, user }) => {
  const todayDate = new Date().toISOString().split("T")[0];
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [overallAttendance, setOverallAttendance] = useState({ percentage: 0, loading: true });

  useEffect(() => {
    // Exit early if essential data isn't available yet
    if (!selectedChildId || selectedChildClasses.length === 0) {
        setOverallAttendance({ percentage: 100, loading: false }); // Default to 100% if no classes
        setUpcomingAssignments([]);
        return;
    }

    // Create a Set of the selected child's current class IDs for very fast lookups.
    const childClassIDs = new Set(selectedChildClasses.map(c => c.ClassID));

    // --- 1. Fetch Upcoming Assignments for the selected child ---
    const assignmentsRef = ref(db, "assignments");
    const unsubAssignments = onValue(assignmentsRef, (snapshot) => {
      const allAssignments = snapshot.val() || {};
      const relevantAssignments = Object.values(allAssignments).filter(
        (a) =>
          childClassIDs.has(a.classID) && // Use the Set for an efficient check
          a.status === 'ACTIVE' &&
          new Date(a.dueDate) >= new Date(todayDate)
      );
      setUpcomingAssignments(
        relevantAssignments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 5)
      );
    });

    // --- 2. Fetch and Calculate Overall Attendance for the selected child ---
    const attendanceRef = ref(db, "attendance");
    const unsubAttendance = onValue(attendanceRef, (snapshot) => {
        const allData = snapshot.val() || {};
        let totalHeld = 0;
        let totalPresent = 0;

        // Iterate through each date in the attendance records
        Object.values(allData).forEach(dateData => {
            // Iterate through each class marked on that date
            Object.entries(dateData).forEach(([classID, classData]) => {
                // Check if the attendance record is for the selected child AND
                // if the class is one of the selected child's CURRENT classes.
                if(classData[selectedChildId] && childClassIDs.has(classID)) {
                    totalHeld++;
                    if (classData[selectedChildId].status === 'Present' || classData[selectedChildId].status === 'Late') {
                        totalPresent++;
                    }
                }
            });
        });

        const percentage = totalHeld > 0 ? (totalPresent / totalHeld) * 100 : 100;
        setOverallAttendance({ percentage, loading: false });
    });

    return () => {
        unsubAssignments();
        unsubAttendance();
    };
  }, [selectedChildId, selectedChildClasses, todayDate]);

  const todayClasses = selectedChildClasses.filter(
    (c) =>
      c.Days &&
      String(c.Days)
        .toLowerCase()
        .includes(getDayName(todayDate).toLowerCase())
  );

  return (
    <>
      <div className="grid-3" style={{gap: '25px', gridTemplateColumns: '2fr 1fr'}}>
        {/* Left Column for Schedule and Assignments */}
        <div style={{display: 'flex', flexDirection: 'column', gap: '25px'}}>
            <div className="content-card">
                <div className="card-header"><span className="card-title">{selectedChildName}'s Schedule Today</span></div>
                {todayClasses.length > 0 ? (
                    todayClasses.map((c) => (
                    <div key={c.ClassID} style={styles.scheduleItem}>
                        <div style={{color: '#0ea5e9', fontWeight: 700}}><Clock size={14} style={{ marginRight: 5 }} /> {c.StartTime} - {c.EndTime}</div>
                        <div style={{fontWeight: 800, fontSize: "1.1rem"}}>{c.ClassName}</div>
                        <div><BookOpen size={14} style={{ marginRight: 5 }} /> {c.SubjectName}</div>
                    </div>
                    ))
                ) : <p style={styles.placeholder}>🎉 No classes scheduled for {selectedChildName} today.</p>}
            </div>

            <div className="content-card">
                <div className="card-header"><span className="card-title">{selectedChildName}'s Upcoming Assignments</span></div>
                {upcomingAssignments.length > 0 ? (
                    upcomingAssignments.map((a) => (
                    <div key={a.id} style={styles.assignmentItem}>
                        <div>
                        <h5 style={{ margin: 0, fontWeight: 600 }}>{a.title}</h5>
                        <p style={{ margin: "5px 0 0", color: "#64748b" }}>Due: {new Date(a.dueDate).toLocaleString()}</p>
                        </div>
                        <span className="badge badge-warning">Pending</span>
                    </div>
                    ))
                ) : <p style={styles.placeholder}>No upcoming assignments for {selectedChildName}.</p>}
            </div>
        </div>
        
        {/* Right Column for Attendance */}
        <div className="content-card">
            <div className="card-header"><span className="card-title">{selectedChildName}'s Overall Attendance</span></div>
            <div style={styles.attendanceContainer}>
                {overallAttendance.loading ? <p>Loading...</p> : (
                    <>
                        <AttendanceCircle percentage={overallAttendance.percentage} />
                        <p style={styles.attendanceText}>
                            {selectedChildName}'s attendance for current subjects is <strong>{Math.round(overallAttendance.percentage)}%</strong>.
                            {overallAttendance.percentage < 75 && " They need to attend classes more regularly."}
                        </p>
                        <small style={{textAlign: 'center', color: '#94a3b8', display: 'block'}}>
                            Click on 'Child's Attendance' tab for a detailed subject-wise report.
                        </small>
                    </>
                )}
            </div>
        </div>
      </div>
    </>
  );
};

const styles = {
    placeholder: { color: "#94a3b8", fontStyle: "italic", padding: "20px", textAlign: 'center' },
    scheduleItem: { padding: '15px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '5px' },
    assignmentItem: { padding: "15px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" },
    attendanceContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', height: '100%' },
    progressCircle: { width: '150px', height: '150px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.5s ease-in-out' },
    progressInnerCircle: { width: '130px', height: '130px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.1)' },
    progressText: { fontSize: '2rem', fontWeight: 'bold' },
    attendanceText: {textAlign: 'center', marginTop: '20px', color: '#475569', lineHeight: 1.5}
};

export default ParentDashboardHome;