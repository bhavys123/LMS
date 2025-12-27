import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase/firebaseConfig";
import { ref, onValue } from "firebase/database";

const ParentAttendance = ({ user, selectedChildClasses, selectedChildId, selectedChildName }) => {
  const [attendanceSummary, setAttendanceSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const studentID = selectedChildId; // Use selected child's ID

  useEffect(() => {
    if (!studentID || !selectedChildClasses) {
      setLoading(false);
      return;
    }
    const classIdToSubjectMap = new Map();
    selectedChildClasses.forEach(cls => classIdToSubjectMap.set(cls.ClassID, cls.SubjectName || "Unknown Subject"));

    const initialSummary = {};
    selectedChildClasses.forEach(cls => {
        const subjectName = cls.SubjectName || "Unknown Subject";
        if (!initialSummary[subjectName]) {
            initialSummary[subjectName] = { total: 0, present: 0, absent: 0 };
        }
    });

    const attendanceRef = ref(db, "attendance");
    const unsub = onValue(attendanceRef, (snapshot) => {
      const allData = snapshot.val() || {};
      let summaryMap = JSON.parse(JSON.stringify(initialSummary));

      Object.values(allData).forEach((dateData) => {
        Object.entries(dateData).forEach(([classID, classData]) => {
          if (classData[studentID] && classIdToSubjectMap.has(classID)) {
            const subjectName = classIdToSubjectMap.get(classID);
            summaryMap[subjectName].total++;
            const status = classData[studentID].status;
            if (status === 'Present' || status === 'Late') summaryMap[subjectName].present++;
            else if (status === 'Absent') summaryMap[subjectName].absent++;
          }
        });
      });

      const finalSummary = Object.entries(summaryMap).map(([subjectName, data]) => ({
        subjectName,
        ...data,
        percentage: data.total > 0 ? (data.present / data.total) * 100 : 100,
      }));

      setAttendanceSummary(finalSummary);
      setLoading(false);
    });

    return () => unsub();
  }, [studentID, selectedChildClasses]);

  // Calculate overall totals from the per-subject summary
  const overallTotals = useMemo(() => {
    if (attendanceSummary.length === 0) {
      return { total: 0, present: 0, absent: 0, percentage: 100 };
    }
    const totals = attendanceSummary.reduce((acc, subject) => {
      acc.total += subject.total;
      acc.present += subject.present;
      acc.absent += subject.absent;
      return acc;
    }, { total: 0, present: 0, absent: 0 });
    totals.percentage = totals.total > 0 ? (totals.present / totals.total) * 100 : 100;
    return totals;
  }, [attendanceSummary]);

  return (
    <div className="content-card">
      <div className="card-header">
        <span className="card-title">{selectedChildName}'s Attendance Report</span>
      </div>
      {loading ? (
        <p style={{ textAlign: "center", padding: "20px" }}>Calculating attendance for {selectedChildName}...</p>
      ) : (
        <>
          {/* Overall Summary Section */}
          <div style={styles.overallSummary}>
            <h3 style={styles.summaryTitle}>Overall Summary for {selectedChildName}</h3>
            <div style={styles.summaryStats}>
              <div style={styles.statItem}><span>Total Classes</span><strong>{overallTotals.total}</strong></div>
              <div style={styles.statItem}><span>Present</span><strong style={{color: '#10b981'}}>{overallTotals.present}</strong></div>
              <div style={styles.statItem}><span>Absent</span><strong style={{color: '#ef4444'}}>{overallTotals.absent}</strong></div>
              <div style={styles.statItem}>
                <span>Percentage</span>
                <strong style={{color: overallTotals.percentage >= 75 ? '#10b981' : '#ef4444'}}>
                  {Math.round(overallTotals.percentage)}%
                </strong>
              </div>
            </div>
          </div>

          {/* Per-Subject Breakdown */}
          <div style={styles.grid}>
            {attendanceSummary.length === 0 ? (
                <p style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px', color: '#94a3b8' }}>No attendance records found for {selectedChildName}.</p>
            ) : (
                attendanceSummary.map((subject) => {
                    const isGood = subject.percentage >= 75;
                    const color = isGood ? '#10b981' : '#ef4444';
                    return (
                        <div key={subject.subjectName} style={styles.card}>
                        <div className="badge badge-primary" style={styles.subjectBadge}>{subject.subjectName}</div>
                        <div style={styles.statsContainer}>
                            <div className="badge badge-secondary">Total Classes: <strong>{subject.total}</strong></div>
                            <div className="badge badge-success">Present: <strong>{subject.present}</strong></div>
                            <div className="badge badge-danger">Absent: <strong>{subject.absent}</strong></div>
                        </div>
                        <div style={styles.progressContainer}>
                            <div style={{ ...styles.progressBar, width: `${subject.percentage}%`, backgroundColor: color }}></div>
                        </div>
                        <div style={{ ...styles.percentageText, color: 'white', backgroundColor: color }} className="badge">
                            {Math.round(subject.percentage)}% Attendance
                        </div>
                        </div>
                    );
                })
            )}
          </div>
        </>
      )}
    </div>
  );
};

const styles = {
    overallSummary: {
        padding: '20px',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '20px',
        background: '#f8fafc',
    },
    summaryTitle: {
        margin: '0 0 15px 0',
        textAlign: 'center',
        color: '#334155'
    },
    summaryStats: {
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '20px'
    },
    statItem: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        fontSize: '1rem',
        color: '#64748b'
    },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', padding: '0 20px 20px 20px' },
    card: { background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' },
    subjectBadge: { alignSelf: 'flex-start', fontSize: '1rem', padding: '8px 12px', marginBottom: '15px' },
    statsContainer: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '15px', fontSize: '0.9rem' },
    progressContainer: { height: '10px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden', marginBottom: '10px' },
    progressBar: { height: '100%', borderRadius: '5px', transition: 'width 0.5s ease-in-out' },
    percentageText: { fontWeight: 'bold', textAlign: 'center', alignSelf: 'flex-end', fontSize: '1rem', padding: '6px 10px' }
};

export default ParentAttendance;