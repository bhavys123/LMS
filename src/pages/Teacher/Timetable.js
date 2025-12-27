import React from "react";
import { CheckSquare } from "lucide-react";

// Helper to sort time strings
const timeToNum = (t) => parseInt(t.replace(':', ''));

const Timetable = ({ myClasses }) => {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat'];
  
  return (
      <div className="content-card" style={{background:'#fff'}}>
          <div className="card-header"><span className="card-title">Weekly Schedule</span></div>
          <div style={{
              display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'15px', padding:'10px 0'
          }}>
              {days.map(d => {
                  const dayClasses = myClasses
                    .filter(c => c.Days && String(c.Days).toLowerCase().includes(d.toLowerCase()))
                    .sort((a,b) => timeToNum(a.StartTime) - timeToNum(b.StartTime));

                  return (
                      <div key={d} style={{
                          border:'1px solid #e2e8f0', borderRadius:'12px', overflow:'hidden', background: '#fff', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                      }}>
                          <div style={{
                              background: dayClasses.length > 0 ? 'var(--primary)' : '#f1f5f9', 
                              color: dayClasses.length > 0 ? 'white' : '#64748b',
                              padding:'12px', textAlign:'center', fontWeight:700, letterSpacing: '0.5px'
                          }}>
                              {d.toUpperCase()}
                          </div>

                          <div style={{padding:'12px', minHeight:'120px', display:'flex', flexDirection:'column', gap:'10px'}}>
                              {dayClasses.length > 0 ? (
                                  dayClasses.map(c => (
                                      <div key={c.ClassID} style={{
                                          background:'#f8fafc', borderLeft:`4px solid ${['#3b82f6','#10b981','#f59e0b','#ef4444'][Math.floor(Math.random()*4)]}`, 
                                          padding:'10px', borderRadius:'6px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                                      }}>
                                          <div style={{fontSize:'0.8rem', fontWeight:700, color:'#64748b', marginBottom:'4px'}}>{c.StartTime} - {c.EndTime}</div>
                                          <div style={{fontWeight:700, color:'#1e293b', fontSize:'0.95rem'}}>{c.ClassName}</div>
                                          <div style={{fontSize:'0.85rem', color:'#475569'}}>{c.SubjectName}</div>
                                      </div>
                                  ))
                              ) : (
                                  <div style={{height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontStyle:'italic', fontSize:'0.9rem', flexDirection:'column'}}>
                                      <CheckSquare size={24} style={{marginBottom:5, opacity:0.3}}/>
                                      <span>No classes</span>
                                  </div>
                              )}
                          </div>
                      </div>
                  );
              })}
          </div>
      </div>
  );
};

export default Timetable;