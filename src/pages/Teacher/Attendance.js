import React, { useState, useEffect } from "react";
import { db } from "../../firebase/firebaseConfig";
import { ref, update, onValue } from "firebase/database";
import { Check, X, Clock, Calendar, Users, Briefcase, ChevronLeft, Bell } from "lucide-react";

// Helper function to get the 3-letter day name (e.g., "Mon")
const getDayName = (dateStr) => {
  const d = new Date(`${dateStr}T12:00:00`); 
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[d.getDay()];
};

const Attendance = ({ myClasses, user, studentsList, showToast }) => {
  const [selectedClassID, setSelectedClassID] = useState(""); 
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [holidays, setHolidays] = useState({});
  const [att, setAtt] = useState({}); // Stores the attendance status for students
  
  // New states for screen switching and summary
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [absentSummary, setAbsentSummary] = useState([]);

  const dayName = getDayName(selectedDate);
  const classesForDate = myClasses.filter(c => c.Days && String(c.Days).toLowerCase().includes(dayName.toLowerCase()));
  const selectedClass = myClasses.find(c => c.ClassID === selectedClassID);
  const isHoliday = holidays[selectedDate];

  // Effect to fetch Holidays and Attendance
  useEffect(() => {
    // 1. Fetch Holidays (runs once and persists)
    const unsubHolidays = onValue(ref(db, 'holidays'), (snap) => setHolidays(snap.val() || {}));
    let unsubAtt = () => {};

    // 2. Fetch/Initialize Attendance
    if(selectedClassID && selectedDate && !isHoliday) {
         setAtt({}); // Clear previous attendance while loading new one
         setIsSubmitted(false); // Reset submission status when class/date changes
         const attRef = ref(db, `attendance/${selectedDate}/${selectedClassID}`);
         
         unsubAtt = onValue(attRef, (snap) => {
             const existingData = snap.val() || {};
             
             // Get students enrolled in the selected class
             const enrolledStudents = studentsList.filter(s => {
                 return !s.disabled && (s.ClassID === selectedClassID || (s.classes && s.classes[selectedClassID]));
             });

             const init = {};
             enrolledStudents.forEach(s => {
                 const status = existingData[s.StudentID]?.status || existingData[s.StudentID] || "Present";
                 init[s.StudentID] = status;
             });
             setAtt(init);
         });
    }

    return () => { 
        unsubHolidays(); 
        unsubAtt();
    }
  }, [selectedClassID, selectedDate, studentsList, isHoliday]);

  const submitAttendance = () => {
      if(isHoliday) return showToast(`Holiday: ${isHoliday.name}`, 'error');
      if(!selectedClassID) return showToast("Select a class first", 'error');
      if(Object.keys(att).length === 0) return showToast("No students to mark attendance for.", 'error');
      
      const updates = {};
      const newAbsentStudents = [];
      
      Object.keys(att).forEach(sid => {
          if (att[sid] === 'Absent') {
              const stObj = studentsList.find(s=>s.StudentID===sid);
              if(stObj) newAbsentStudents.push(stObj.StudentName);
          }

          updates[`attendance/${selectedDate}/${selectedClassID}/${sid}`] = { 
              status: att[sid], 
              timestamp: Date.now(), 
              markedBy: user.details.TeacherName 
          };
      });
      
      update(ref(db), updates)
          .then(() => {
              showToast("Attendance Saved Successfully!");
              setAbsentSummary(newAbsentStudents); // Capture the full absent list
              setIsSubmitted(true); // Switch screen
          })
          .catch(e => showToast(`Error saving: ${e.message}`, 'error'));
  };

  const handleStatusChange = (studentID, status) => {
      setAtt(prev => ({ ...prev, [studentID]: status }));
  };

  const attendanceStatuses = [
      {label:'Present', val:'Present', color:'#10b981', icon: <Check size={16}/>},
      {label:'Absent', val:'Absent', color:'#ef4444', icon: <X size={16}/>},
      {label:'Late', val:'Late', color:'#f59e0b', icon: <Clock size={16}/>}
  ];
  
  // --- SUBMISSION SUCCESS SCREEN ---
  if (isSubmitted && selectedClass) {
    const absentCount = absentSummary.length;
    const absenteesToShow = absentSummary.slice(0, 5); // Show only the first five

    return (
        <div className="content-card" style={{padding: '50px 30px', textAlign: 'center'}}>
            <Check size={64} style={{color: '#10b981', marginBottom: '20px', border: '3px solid #10b981', borderRadius: '50%', padding: '10px'}}/>
            <h1 style={{color: '#1e293b', marginBottom: '10px'}}>Attendance Marked Successfully!</h1>
            <p style={{color: '#64748b', fontSize: '1.1rem'}}>
                Attendance for **{selectedClass.ClassName}** on **{selectedDate}** has been recorded.
            </p>

            <div style={{marginTop: '30px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', maxWidth: '500px', margin: '30px auto'}}>
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', color: absentCount > 0 ? '#ef4444' : '#10b981', fontWeight: 700, fontSize: '1.2rem'}}>
                    <Bell size={20} style={{marginRight: '10px'}}/>
                    {absentCount} Student(s) Absent
                </div>
                
                {absentCount > 0 && (
                    <div style={{marginTop: '15px', textAlign: 'left', display: 'inline-block'}}>
                        <ul style={{listStyleType: 'none', padding: 0, margin: 0}}>
                            {absenteesToShow.map((name, index) => (
                                <li key={index} style={{padding: '5px 0', display: 'flex', alignItems: 'center', color: '#334155'}}>
                                    <X size={14} style={{marginRight: '10px', color: '#ef4444'}}/> {name}
                                </li>
                            ))}
                            {absentCount > 5 && (
                                <li style={{padding: '5px 0', fontStyle: 'italic', color: '#64748b'}}>
                                    ... and {absentCount - 5} more.
                                </li>
                            )}
                        </ul>
                    </div>
                )}
            </div>
            
            <button 
                className="btn-primary" 
                onClick={() => setIsSubmitted(false)} 
                style={{marginTop: '40px', padding:'12px 25px', background: '#0ea5e9'}}
            >
                <ChevronLeft size={18} style={{marginRight: '10px'}}/> Return to Register
            </button>
        </div>
    );
  }

  // --- ATTENDANCE REGISTER SCREEN ---
  return (
    <div className="content-card">
        <div className="card-header">
            <span className="card-title">Class Attendance Register</span>
        </div>

        {/* TOP SECTION: FILTERS & SAVE BUTTON */}
        <div style={{ background:'#f8fafc', padding:20, borderRadius:12, border:'1px solid #e2e8f0', marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'flex-end'}}>
            
            <div className="form-group" style={{flex: 1, minWidth: '200px', margin: 0}}>
                <label className="form-label" style={{display: 'flex', alignItems: 'center'}}><Calendar size={16} style={{marginRight: '8px'}}/> 1. Select Date</label>
                <input type="date" className="form-control" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} />
                {isHoliday && <p style={{color: '#ef4444', fontSize: '0.85rem', marginTop: '8px', fontWeight: 600}}>Holiday: {isHoliday.name}</p>}
            </div>
            
            <div className="form-group" style={{flex: 1, minWidth: '200px', margin: 0}}>
                <label className="form-label" style={{display: 'flex', alignItems: 'center'}}><Briefcase size={16} style={{marginRight: '8px'}}/> 2. Select Class ({dayName})</label>
                <select className="form-control" value={selectedClassID} onChange={e=>setSelectedClassID(e.target.value)} disabled={isHoliday}>
                    <option value="">-- Choose Class --</option>
                    {classesForDate.map(c => <option key={c.ClassID} value={c.ClassID}>{c.StartTime} - {c.ClassName}</option>)}
                </select>
            </div>

            <button className="btn-primary" onClick={submitAttendance} style={{padding:'10px 20px', whiteSpace:'nowrap'}} disabled={!selectedClassID || isHoliday}>
                Save Attendance
            </button>
        </div>


        {/* MAIN REGISTER SECTION */}
        <div style={{padding: '0 10px'}}>
            {selectedClassID && !isHoliday ? (
                <>
                    <div style={{marginBottom: 20, paddingBottom: 10}}>
                        <h3 style={{margin:0, color:'#1e293b'}}>Register: {selectedClass?.ClassName}</h3>
                        <p style={{margin: '5px 0 0 0', color:'#64748b'}}>Total Students: {Object.keys(att).length}</p>
                    </div>
                    
                    <div className="attendance-list" style={{display:'flex', flexDirection:'column', gap:'15px', maxHeight:'70vh', overflowY:'auto', paddingRight: '10px'}}>
                        {Object.keys(att).map(sid => {
                            const stObj = studentsList.find(s=>s.StudentID===sid);
                            if(!stObj) return null;
                            return (
                                <div 
                                    key={sid} 
                                    style={{
                                        background:'white', 
                                        padding:'15px 25px', 
                                        borderRadius:12, 
                                        border:'1px solid #e2e8f0', 
                                        boxShadow:'0 2px 8px rgba(0,0,0,0.05)', 
                                        display:'grid', 
                                        gridTemplateColumns:'300px 1fr',
                                        alignItems:'center', 
                                        gap:'30px'
                                    }}
                                >
                                    {/* Student Name */}
                                    <div style={{display:'flex', alignItems:'center', fontWeight:700, fontSize:'1.1rem', color:'#1e293b'}}>
                                        <Users size={20} style={{marginRight: 15, color:'#0ea5e9'}}/>
                                        {stObj.StudentName}
                                    </div>
                                    
                                    {/* Status Buttons */}
                                    <div style={{display:'flex', gap:10}}>
                                        {attendanceStatuses.map(st => {
                                            const isSelected = att[sid]===st.val;
                                            return (
                                                <button 
                                                    key={st.val} 
                                                    onClick={()=>handleStatusChange(sid, st.val)} 
                                                    style={{
                                                        flex:1, 
                                                        border:`1px solid ${isSelected ? st.color : '#e2e8f0'}`, 
                                                        borderRadius:10, 
                                                        padding:'12px 15px', 
                                                        fontSize:'1rem', 
                                                        fontWeight:600, 
                                                        cursor:'pointer', 
                                                        transition:'all 0.2s',
                                                        background: isSelected ? st.color : 'white',
                                                        color: isSelected ? 'white' : '#4b5563',
                                                        display:'flex', 
                                                        alignItems:'center', 
                                                        justifyContent:'center', 
                                                        gap:'8px',
                                                        boxShadow: isSelected ? `0 4px 6px -1px ${st.color}40` : 'none',
                                                    }}
                                                >
                                                    {st.icon} {st.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {Object.keys(att).length === 0 && <p style={{padding:40, textAlign:'center', color:'#94a3b8', border:'2px dashed #e2e8f0', borderRadius:12}}>No active students found for this class.</p>}
                </>
            ) : isHoliday ? (
                <div style={{padding:40, textAlign:'center', color:'#ef4444', background: '#fee2e2', border:'2px dashed #fca5a5', borderRadius:12}}>
                    <h4 style={{marginTop:0}}>School Holiday</h4>
                    <p>Attendance cannot be marked on a holiday: {isHoliday.name}</p>
                </div>
            ) : (
                <div style={{padding:40, textAlign:'center', color:'#94a3b8', border:'2px dashed #e2e8f0', borderRadius:12}}>
                    <h4 style={{marginTop:0}}>Attendance Register</h4>
                    <p>Please select a date and a class to load the student list.</p>
                </div>
            )}
        </div>
    </div>
  );
};

export default Attendance;