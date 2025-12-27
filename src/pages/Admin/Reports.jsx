import React from 'react';

const Reports = ({ reportData, settings }) => (
  <div className="content-card">
     <div className="card-header">
        <span className="card-title">Attendance Report</span>
        <div style={{display:'flex', gap:'10px'}}>
           <span className="badge badge-success">Passing</span>
           <span className="badge badge-danger">At Risk (&lt;{settings.minAttendance}%)</span>
        </div>
     </div>
     <table className="data-table">
        <thead><tr><th>Student</th><th>Total Classes</th><th>Attended</th><th>Percentage</th><th>Status</th></tr></thead>
        <tbody>
          {reportData.map(r => (
            <tr key={r.StudentID}>
              <td>{r.StudentName}</td>
              <td>{r.total}</td>
              <td>{r.present}</td>
              <td>{r.pct}%</td>
              <td><span className={`badge ${r.status === 'Good' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></td>
            </tr>
          ))}
        </tbody>
     </table>
  </div>
);

export default Reports;