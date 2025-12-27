import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase/firebaseConfig";
import { ref, update, push, onValue } from "firebase/database";
import { Plus, X, Eye, Download, Save, Trash2, Power, CheckCircle, XCircle } from "lucide-react";
import * as XLSX from 'xlsx';

// A reliable function to parse date strings to avoid cross-browser issues
const parseDateTime = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString);
};

// --- Helper Component: Submission Viewer Modal ---
const SubmissionViewer = ({ assignment, studentsList, submissions, onClose, showToast }) => {
    const allStudentsForAssignment = useMemo(() => {
        const classStudents = studentsList.filter(student => {
            if (!assignment.classID) return false;
            return student.ClassID === assignment.classID || (student.classes && student.classes[assignment.classID]);
        });
        return classStudents.map(student => ({
            ...student,
            submission: submissions[assignment.id]?.[student.StudentID]
        })).sort((a, b) => a.StudentName.localeCompare(b.StudentName));
    }, [studentsList, assignment, submissions]);

    const calculateMCQScore = (questions, studentAnswers) => {
        if (!questions || !studentAnswers) return 0;
        return questions.reduce((score, q, index) => {
            return q.correctOption === studentAnswers[index] ? score + parseInt(q.marks || 0) : score;
        }, 0);
    };

    const handleSaveMarks = (studentID, marks) => {
        if (marks === '' || marks === null) return showToast("Marks cannot be empty.", 'error');
        const parsedMarks = parseInt(marks);
        if (isNaN(parsedMarks) || parsedMarks < 0 || parsedMarks > assignment.maxMarks) {
            return showToast(`Marks must be a number between 0 and ${assignment.maxMarks}`, 'error');
        }
        const submissionRef = ref(db, `submissions/${assignment.id}/${studentID}`);
        update(submissionRef, { marksAwarded: parsedMarks, status: 'GRADED' })
            .then(() => showToast("Marks saved successfully!", "success"))
            .catch(() => showToast("Failed to save marks.", "error"));
    };
    
    const handleExportToExcel = () => {
        const dataForExport = allStudentsForAssignment.map(student => {
            let finalMarks = 'Not Graded';
            let status = 'Not Submitted';
            let submissionDate = 'N/A';
            if (student.submission) {
                status = student.submission.status || 'Submitted';
                submissionDate = new Date(student.submission.submittedAt).toLocaleString();
                if (assignment.type === 'MCQ') {
                    finalMarks = calculateMCQScore(assignment.questions, student.submission.answers);
                } else if (student.submission.marksAwarded !== undefined) {
                    finalMarks = student.submission.marksAwarded;
                }
            }
            return { "Student Name": student.StudentName, "Submission Date": submissionDate, "Status": status, "Marks": finalMarks };
        });
        const worksheet = XLSX.utils.json_to_sheet(dataForExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Submissions");
        XLSX.writeFile(workbook, `${assignment.title}_Submissions.xlsx`);
        showToast("Downloading Excel file...", "success");
    };

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
            <div className="content-card" style={{ width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="card-header">
                    <div>
                        <span className="card-title">Submissions for: {assignment.title}</span>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>Max Marks: {assignment.maxMarks}</p>
                    </div>
                    <div>
                        <button className="btn-primary" onClick={handleExportToExcel} style={{marginRight: '10px'}}><Download size={16}/> Download Excel</button>
                        <button className="action-btn btn-red" onClick={onClose}><X size={16}/></button>
                    </div>
                </div>
                <div style={{ padding: '20px' }}>
                    {allStudentsForAssignment.length > 0 ? allStudentsForAssignment.map(student => (
                        <StudentSubmissionEntry key={student.StudentID} student={student} assignment={assignment} onSaveMarks={handleSaveMarks} calculateMCQScore={calculateMCQScore}/>
                    )) : <p>No students found for this class.</p>}
                </div>
            </div>
        </div>
    );
};

// --- Enhanced component for viewing student submissions ---
const StudentSubmissionEntry = ({ student, assignment, onSaveMarks, calculateMCQScore }) => {
    const { StudentName, StudentID, submission } = student;
    const [marks, setMarks] = useState(submission?.marksAwarded ?? '');
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => { setMarks(submission?.marksAwarded ?? ''); }, [submission]);

    return (
        <div className="content-card" style={{ marginBottom: '15px' }}>
            <div style={{ background: '#f8fafc', padding: '10px 15px', borderBottom: isExpanded ? '1px solid #e2e8f0' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => submission && setIsExpanded(!isExpanded)}>
                <strong>{StudentName}</strong>
                {submission ? <span className="badge badge-success">Submitted</span> : <span className="badge badge-danger">Not Submitted</span>}
            </div>
            {isExpanded && submission && (
                <div style={{ padding: '15px' }}>
                    <p style={{fontSize: '0.8rem', color: '#64748b', marginTop: 0}}>Submitted: {new Date(submission.submittedAt).toLocaleString()}</p>
                    
                    {assignment.questions && assignment.questions.length > 0 && (
                        <div style={{marginBottom: '15px', background: '#eef2ff', padding: '10px', borderRadius: '8px'}}>
                            <h5 style={{marginTop: 0, color: '#4338ca'}}>Assignment Prompts</h5>
                            {assignment.questions.map((q, i) => ( <p key={i} style={{margin: '0 0 5px 0'}}><strong>Q{i+1}:</strong> {q.text}</p> ))}
                        </div>
                    )}
                    
                    <h4>Student's Submission:</h4>
                    {assignment.type === 'FILE' && submission.fileData && submission.fileData.map((file, i) => (
                        <a key={i} href={file.url} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{display: 'block', marginBottom: '5px'}}>View Submitted File {i+1}: {file.name}</a>
                    ))}
                    {assignment.type === 'WRITTEN' && submission.answers && submission.answers.map((answer, i) => (
                        <div key={i} style={{...styles.questionCard, borderLeft: '4px solid #4f46e5'}}>
                            <p><strong>Answer for Q{i+1}:</strong></p>
                            <p style={{whiteSpace: 'pre-wrap', margin: 0}}>{answer || <em>Not Answered</em>}</p>
                        </div>
                    ))}
                    
                    {assignment.type === 'MCQ' && assignment.questions.map((q, i) => {
                        const isCorrect = q.correctOption === submission.answers?.[i];
                        return (
                            <div key={i} style={{...styles.questionCard, borderLeft: `4px solid ${isCorrect ? '#22c55e' : '#ef4444'}`}}>
                               <div style={styles.questionHeader}><strong>Q{i+1}: {q.text}</strong>{isCorrect ? <CheckCircle size={20} color="#22c55e" /> : <XCircle size={20} color="#ef4444" />}</div>
                               <p>Student's Answer: {submission.answers?.[i] !== undefined ? q.options[submission.answers[i]] : "Not Answered"}</p>
                               {!isCorrect && (<p style={{color: '#16a34a', fontWeight: '500'}}>Correct Answer: {q.options[q.correctOption]}</p>)}
                            </div>
                        );
                    })}

                    <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '20px', paddingTop: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {assignment.type === 'MCQ' ? (
                            <><strong style={{marginRight: 'auto'}}>Auto-Score:</strong> {calculateMCQScore(assignment.questions, submission.answers)} / {assignment.maxMarks}
                                <button className="btn-primary" onClick={() => onSaveMarks(StudentID, calculateMCQScore(assignment.questions, submission.answers))}><Save size={16}/> Finalize Marks</button></>
                        ) : (
                            <><label className="form-label" style={{margin: 0}}>Award Marks:</label>
                                <input type="number" className="form-control" value={marks} onChange={(e) => setMarks(e.target.value)} style={{width: '100px'}} />
                                <span>/ {assignment.maxMarks}</span>
                                <button className="btn-primary" onClick={() => onSaveMarks(StudentID, marks)}><Save size={16}/> Save Marks</button></>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const Assignments = ({ myClasses, user, studentsList, showToast }) => {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [assignView, setAssignView] = useState('list'); 
  const [questions, setQuestions] = useState([]); 
  const [assignType, setAssignType] = useState("MCQ");
  const [newAssign, setNewAssign] = useState({ title: '', classID: '', subject: '', startTime: '', dueDate: '', maxMarks: 100, allowMultipleFiles: false });
  const [viewingAssignment, setViewingAssignment] = useState(null);

  useEffect(() => {
    if(!user?.details?.TeacherID) return;
    const unsubAssignments = onValue(ref(db, 'assignments'), (snap) => {
        const data = snap.val() || {};
        const arr = Object.keys(data).map(k => ({ id: k, ...data[k] }));
        const teacherAssignments = arr.filter(a => String(a.teacherID) === String(user.details.TeacherID));
        setAssignments(teacherAssignments.sort((a,b) => b.createdAt - a.createdAt));
    });
    const unsubSubmissions = onValue(ref(db, 'submissions'), (snap) => setSubmissions(snap.val() || {}));
    return () => { unsubAssignments(); unsubSubmissions(); };
  }, [user]);

  const handleCreateAssignment = () => {
      if(!newAssign.title || !newAssign.classID || !newAssign.startTime || !newAssign.dueDate) return showToast("Title, Class, Start Time, and End Time are required.", 'error');
      if (new Date(newAssign.startTime) >= new Date(newAssign.dueDate)) return showToast("Start Time must be before End Time.", 'error');
      let totalMarks = questions.length > 0 ? questions.reduce((acc, q) => acc + parseInt(q.marks || 0), 0) : (newAssign.maxMarks || 100);
      const newRef = push(ref(db, 'assignments'));
      update(newRef, {
          ...newAssign, 
          maxMarks: totalMarks,
          id: newRef.key, 
          type: assignType, 
          questions: questions,
          teacherID: user.details.TeacherID, 
          createdAt: Date.now(), 
          status: 'ACTIVE'
      }).then(() => {
          showToast("Assignment Published Successfully!");
          setAssignView('list');
          setNewAssign({ title: '', classID: '', subject: '', startTime: '', dueDate: '', maxMarks: 100, allowMultipleFiles: false });
          setQuestions([]);
      });
  };

  const handleDeleteAssignment = (assignmentId) => {
      if (window.confirm("Are you sure? This will delete the assignment and all student submissions permanently.")) {
          const updates = {};
          updates[`/assignments/${assignmentId}`] = null;
          updates[`/submissions/${assignmentId}`] = null;
          update(ref(db), updates)
              .then(() => showToast("Assignment deleted successfully.", "success"))
              .catch(() => showToast("Failed to delete assignment.", "error"));
      }
  };
  
  const handleToggleAssignmentStatus = (assignmentId, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    update(ref(db, `assignments/${assignmentId}`), { status: newStatus })
        .then(() => showToast(`Assignment marked as ${newStatus.toLowerCase()}.`, "success"))
        .catch(() => showToast("Failed to update status.", "error"));
  };
  
  const handleQuestionChange = (qIndex, field, value) => {
    setQuestions(questions.map((q, index) => index === qIndex ? { ...q, [field]: value } : q));
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    setQuestions(questions.map((q, index) => {
        if (index === qIndex) {
            const newOptions = q.options.map((opt, optionIndex) => optionIndex === oIndex ? value : opt);
            return { ...q, options: newOptions };
        }
        return q;
    }));
  };

  const handleDeleteQuestion = (qIndex) => {
    setQuestions(questions.filter((_, index) => index !== qIndex));
  };
  
  const handleAddQuestion = () => {
    if (questions.length >= 5) { showToast("You can add a maximum of 5 questions.", "error"); return; }
    setQuestions([...questions, { id: Date.now(), text: "", marks: 5, options: ["", "", "", ""], correctOption: 0 }]);
  };

  if(assignView === 'create') {
    return (
        <div className="content-card">
            <div className="card-header">
                <span className="card-title">Create New Assignment</span>
                <button style={styles.cancelButton} onClick={() => setAssignView('list')}><X size={16} /> Cancel</button>
            </div>
            <div style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div className="form-group"><label className="form-label">Title</label><input className="form-control" value={newAssign.title} onChange={e=>setNewAssign({...newAssign, title:e.target.value})} /></div>
                    <div className="form-group"><label className="form-label">Type</label>
                        <select className="form-control" value={assignType} onChange={e=>setAssignType(e.target.value)}>
                            <option value="MCQ">MCQ Quiz</option><option value="WRITTEN">Written Answers</option><option value="FILE">File Upload</option>
                        </select>
                    </div>
                    <div className="form-group"><label className="form-label">Class</label>
                        <select className="form-control" value={newAssign.classID} onChange={e=>setNewAssign({...newAssign, classID:e.target.value})}>
                            <option value="">Select Class</option>{myClasses.map(c => <option key={c.ClassID} value={c.ClassID}>{c.ClassName}</option>)}
                        </select>
                    </div>
                    {assignType === 'FILE' && <div className="form-group" style={{alignSelf: 'center'}}><label className="form-label" style={{display: 'flex', alignItems: 'center', gap: '10px'}}><input type="checkbox" checked={newAssign.allowMultipleFiles} onChange={e => setNewAssign({...newAssign, allowMultipleFiles: e.target.checked})} style={{width: '20px', height: '20px'}}/> Allow multiple file uploads</label></div>}
                    <div className="form-group"><label className="form-label">Start Time</label><input type="datetime-local" className="form-control" value={newAssign.startTime} onChange={e=>setNewAssign({...newAssign, startTime:e.target.value})} /></div>
                    <div className="form-group"><label className="form-label">End Time</label><input type="datetime-local" className="form-control" value={newAssign.dueDate} onChange={e=>setNewAssign({...newAssign, dueDate:e.target.value})} /></div>
                </div>
                
                <div style={{background:'#f8fafc', padding:20, borderRadius:8, marginTop:20}}>
                    <h4>Questions / Prompts</h4>
                    {questions.map((q, questionIndex) => (
                        <div key={q.id} style={styles.questionCard}>
                            <div style={styles.questionHeader}><strong>Question {questionIndex + 1}</strong><button style={styles.deleteQuestionBtn} onClick={() => handleDeleteQuestion(questionIndex)}><X size={14} /></button></div>
                            <div className="form-group" style={{ marginBottom: 15 }}><label className="form-label">Question / Prompt Text</label><textarea className="form-control" value={q.text} onChange={(e) => handleQuestionChange(questionIndex, 'text', e.target.value)} rows="2"/></div>
                            <div className="form-group" style={{ width: '150px' }}><label className="form-label">Marks</label><input className="form-control" type="number" value={q.marks} onChange={(e) => handleQuestionChange(questionIndex, 'marks', e.target.value)} /></div>
                            {assignType === 'MCQ' && (
                                <div style={{ marginTop: 20 }}>
                                    <label className="form-label">Options (Select correct answer)</label>
                                    {q.options.map((opt, optionIndex) => (
                                        <div key={optionIndex} style={styles.optionInputContainer}>
                                            <input type="radio" name={`correct_option_${q.id}`} checked={q.correctOption === optionIndex} onChange={() => handleQuestionChange(questionIndex, 'correctOption', optionIndex)} />
                                            <input className="form-control" value={opt} onChange={(e) => handleOptionChange(questionIndex, optionIndex, e.target.value)} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {questions.length < 5 ? (<button style={styles.addQuestionButton} onClick={handleAddQuestion}><Plus size={16}/> Add Question</button>) : (<p style={{textAlign: 'center', color: '#64748b'}}>Maximum of 5 questions reached.</p>)}
                    {questions.length === 0 && <div className="form-group" style={{marginTop: 20}}><label className="form-label">Total Marks (if no questions added)</label><input type="number" className="form-control" value={newAssign.maxMarks} onChange={e=>setNewAssign({...newAssign, maxMarks: e.target.value})} /></div>}
                </div>
                <button style={styles.publishButton} onClick={handleCreateAssignment}>Publish Assignment</button>
            </div>
        </div>
    );
  }

  return (
    <>
      <div className="content-card">
          <div className="card-header"><span className="card-title">Assignments</span><button style={styles.primaryButtonSmall} onClick={()=>setAssignView('create')}><Plus size={16}/> Create New</button></div>
          <table className="data-table">
              <thead><tr><th>Title</th><th>Class</th><th>Type</th><th>Starts On</th><th>Ends On</th><th>Status</th><th>Submissions</th><th>Actions</th></tr></thead>
              <tbody>
                  {assignments.map(a => {
                      const className = myClasses.find(c => c.ClassID === a.classID)?.ClassName || 'N/A';
                      const submissionCount = Object.keys(submissions[a.id] || {}).length;
                      const isActive = a.status === 'ACTIVE';
                      return (
                      <tr key={a.id}>
                          <td>{a.title}</td>
                          <td>{className}</td>
                          <td><span className="badge badge-info">{a.type}</span></td>
                          <td>{a.startTime ? parseDateTime(a.startTime).toLocaleString() : 'N/A'}</td>
                          <td>{a.dueDate ? parseDateTime(a.dueDate).toLocaleString() : 'N/A'}</td>
                          <td><button style={isActive ? styles.statusButtonActive : styles.statusButtonInactive} onClick={() => handleToggleAssignmentStatus(a.id, a.status)}><Power size={14}/> {isActive ? 'Active' : 'Inactive'}</button></td>
                          <td>{submissionCount}</td>
                          <td style={{display: 'flex', gap: '10px'}}>
                              <button style={styles.viewButton} onClick={() => setViewingAssignment(a)}><Eye size={16}/> View</button>
                              <button style={styles.deleteButton} onClick={() => handleDeleteAssignment(a.id)}><Trash2 size={16}/> Delete</button>
                          </td>
                      </tr>
                  )})}
              </tbody>
          </table>
      </div>
      {viewingAssignment && <SubmissionViewer assignment={viewingAssignment} submissions={submissions} studentsList={studentsList} onClose={() => setViewingAssignment(null)} showToast={showToast}/>}
    </>
  );
};

const styles = {
    baseButton: { border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s ease' },
    primaryButton: { backgroundColor: '#4f46e5', color: 'white' },
    publishButton: { marginTop: '20px', width: '100%', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', backgroundColor: '#4f46e5', color: 'white' },
    primaryButtonSmall: { border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#4f46e5', color: 'white' },
    addQuestionButton: { border: '1px solid #c7d2fe', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#eef2ff', color: '#4338ca' },
    cancelButton: { border: 'none', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fee2e2', color: '#ef4444' },
    viewButton: { border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f1f5f9', color: '#475569' },
    deleteButton: { border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#fee2e2', color: '#dc2626' },
    statusButtonActive: { border: 'none', padding: '8px 12px', borderRadius: '9999px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500', backgroundColor: '#dcfce7', color: '#16a34a' },
    statusButtonInactive: { border: 'none', padding: '8px 12px', borderRadius: '9999px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500', backgroundColor: '#fef3c7', color: '#d97706' },
    questionCard: { background:'white', padding: '20px', marginBottom: '15px', borderRadius: '8px', border:'1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' },
    questionHeader: { display:'flex', justifyContent:'space-between', alignItems: 'center', marginBottom:'15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' },
    deleteQuestionBtn: { background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
    optionInputContainer: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }
};

export default Assignments;