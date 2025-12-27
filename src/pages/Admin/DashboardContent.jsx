import React from 'react';

const DashboardContent = ({ studentsCount, teachersCount, classesCount, reportData }) => {
  const lowAttendanceCount = reportData.filter(r => r.status === 'Low').length;
  const goodAttendanceCount = studentsCount - lowAttendanceCount;

  return (
    <>
      <div className="grid-3">
        <div className="stat-box" style={{borderLeftColor: '#3b82f6'}}><h4>Total Students</h4><h2>{studentsCount}</h2></div>
        <div className="stat-box" style={{borderLeftColor: '#6366f1'}}><h4>Teachers</h4><h2>{teachersCount}</h2></div>
        <div className="stat-box" style={{borderLeftColor: '#10b981'}}><h4>Classes</h4><h2>{classesCount}</h2></div>
      </div>
      <div className="content-card" style={{marginTop: '25px'}}>
         <div className="card-header"><span className="card-title">System Health</span></div>
         <div className="grid-2">
           <div style={{background: '#f0f9ff', padding: '20px', borderRadius: '12px', border: '1px solid #bae6fd'}}>
              <div style={{color: '#0284c7', fontWeight: 600, marginBottom: '5px'}}>Passing Rate</div>
              <div style={{fontSize: '28px', fontWeight: 'bold', color: '#0c4a6e'}}>{goodAttendanceCount} <small style={{fontSize:'14px', fontWeight:400}}>Students</small></div>
           </div>
           <div style={{background: '#fef2f2', padding: '20px', borderRadius: '12px', border: '1px solid #fecaca'}}>
              <div style={{color: '#dc2626', fontWeight: 600, marginBottom: '5px'}}>Attendance Alert</div>
              <div style={{fontSize: '28px', fontWeight: 'bold', color: '#7f1d1d'}}>{lowAttendanceCount} <small style={{fontSize:'14px', fontWeight:400}}>Students</small></div>
           </div>
         </div>
      </div>
    </>
  );
};

export default DashboardContent;