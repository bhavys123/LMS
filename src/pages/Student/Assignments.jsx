import React, { useState, useEffect, useRef, useCallback } from "react";
import { db, storage } from "../../firebase/firebaseConfig";
import { ref, onValue, update } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { Eye, Send, X, Clock, UploadCloud, CheckCircle, XCircle } from "lucide-react";

// A reliable function to parse Firebase date strings to prevent timezone errors.
const parseFirebaseDate = (dateString) => {
  if (!dateString) return new Date(0);
  if (dateString.includes('T')) {
    const [datePart, timePart] = dateString.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hours || 0, minutes || 0);
  } else {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day, 23, 59, 59);
  }
};

// --- This is the definitive, fully restored and styled Assignment Modal ---
const AssignmentModal = ({ assignment, submission, isEditable, onClose, user, showToast }) => {
    const isViewOnly = !isEditable;
    const numQuestions = assignment.questions?.length || 1; // Default to 1 for simple assignments

    const [writtenAnswers, setWrittenAnswers] = useState(() => submission?.answers || Array(numQuestions).fill(""));
    const [files, setFiles] = useState(() => Array(numQuestions).fill(null));
    const [mcqAnswers, setMcqAnswers] = useState(() => submission?.answers || Array(numQuestions).fill(null));
    
    const [timeLeft, setTimeLeft] = useState(null);
    const timerRef = useRef(null);
    const handleSubmitRef = useRef();

    const handleWrittenAnswerChange = (index, value) => {
        const newAnswers = [...writtenAnswers];
        newAnswers[index] = value;
        setWrittenAnswers(newAnswers);
    };

    const handleFileChange = (index, file) => {
        const newFiles = [...files];
        newFiles[index] = file;
        setFiles(newFiles);
    };

    const handleSubmit = useCallback(async (isAutoSubmit = false) => {
        const studentID = user.details.StudentID;
        const submissionRef = ref(db, `submissions/${assignment.id}/${studentID}`);
        let submissionData = { studentID, submittedAt: Date.now(), status: 'SUBMITTED' };

        if (assignment.type === 'WRITTEN') {
            submissionData.answers = writtenAnswers;
        } 
        else if (assignment.type === 'FILE') {
            const uploadPromises = files.map((file, index) => {
                if (file) {
                    const fileStorageRef = storageRef(storage, `submissions/${assignment.id}/${studentID}/${index}_${file.name}`);
                    return uploadBytes(fileStorageRef, file).then(snapshot => getDownloadURL(snapshot.ref).then(url => ({ url, name: file.name })));
                }
                return Promise.resolve(submission?.fileData?.[index] || null);
            });
            const fileData = (await Promise.all(uploadPromises)).filter(data => data !== null);
            submissionData.fileData = fileData;
        }
        else if (assignment.type === 'MCQ') {
            submissionData.answers = mcqAnswers;
        }

        update(submissionRef, submissionData).then(() => {
            const message = isAutoSubmit ? "Time's up! Your work has been submitted." : "Assignment submitted successfully!";
            showToast(message, isAutoSubmit ? 'info' : 'success');
            onClose();
        }).catch(() => showToast("Failed to submit assignment.", "error"));
    }, [user, assignment, submission, mcqAnswers, writtenAnswers, files, onClose, showToast]);
    
    useEffect(() => { handleSubmitRef.current = handleSubmit; });

    useEffect(() => {
        if (isEditable) {
            document.documentElement.requestFullscreen().catch(err => console.log(`Fullscreen error: ${err.message}`));
            const endTime = parseFirebaseDate(assignment.dueDate).getTime();
            timerRef.current = setInterval(() => {
                const distance = endTime - new Date().getTime();
                if (distance <= 0) {
                    setTimeLeft(0);
                    clearInterval(timerRef.current);
                    handleSubmitRef.current(true); 
                } else { setTimeLeft(distance); }
            }, 1000);
            return () => {
                if (document.fullscreenElement) document.exitFullscreen();
                clearInterval(timerRef.current);
            };
        }
    }, [isEditable, assignment.dueDate]);

    const formatTime = (ms) => {
        if (ms === null || ms < 0) return "00:00:00";
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };
    
    return (
        <div style={styles.modalOverlay}>
            <div className="content-card" style={styles.modalContent}>
                <div className="card-header">
                    <span className="card-title">{isViewOnly ? `Viewing: ${assignment.title}` : `Submit: ${assignment.title}`}</span>
                    {isEditable && timeLeft !== null && ( <div style={styles.timer}><Clock size={18} style={{marginRight: 8}}/> {formatTime(timeLeft)}</div> )}
                    <button className="btn-red" onClick={onClose}><X size={16} /></button>
                </div>
                <div className="modal-body" style={styles.modalBody}>
                    {isViewOnly ? (
                        <div>
                            <p><strong>Submitted on:</strong> {new Date(submission.submittedAt).toLocaleString()}</p>
                            {(assignment.questions || []).map((q, i) => (
                                <div key={i} style={styles.questionBox}>
                                    <p><strong>Q{i+1}: {q.text}</strong></p>
                                    {assignment.type === 'FILE' && submission.fileData?.[i] && <a href={submission.fileData[i].url} target="_blank" rel="noopener noreferrer" className="btn-secondary">View Submitted File: {submission.fileData[i].name}</a>}
                                    {assignment.type === 'WRITTEN' && <p style={styles.answerBox}>{submission.answers?.[i] || "Not Answered"}</p>}
                                    {assignment.type === 'MCQ' && (
                                        <>
                                            <p>Your Answer: {submission.answers?.[i] !== undefined ? q.options[submission.answers[i]] : "Not Answered"}</p>
                                            {submission.status === 'GRADED' && q.correctOption !== submission.answers?.[i] && <p style={{color: '#16a34a'}}>Correct Answer: {q.options[q.correctOption]}</p>}
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div>
                            {(assignment.questions || []).map((q, i) => (
                                <div key={i} style={styles.questionBox}>
                                    <p><strong>Q{i+1}: {q.text}</strong> ({q.marks} Marks)</p>
                                    {assignment.type === 'MCQ' && q.options.map((opt, oIdx) => (
                                        <div key={oIdx} style={styles.option}><input type="radio" id={`q${i}_opt${oIdx}`} name={`q${i}`} checked={mcqAnswers[i] === oIdx} onChange={() => {const n = [...mcqAnswers]; n[i] = oIdx; setMcqAnswers(n)}} /><label htmlFor={`q${i}_opt${oIdx}`} style={styles.optionLabel}>{opt}</label></div>
                                    ))}
                                    {assignment.type === 'WRITTEN' && <textarea className="form-control" style={{ minHeight: '150px' }} value={writtenAnswers[i]} onChange={e => handleWrittenAnswerChange(i, e.target.value)} placeholder="Type your answer here..."/>}
                                    {assignment.type === 'FILE' && (
                                        <div style={styles.fileDropZone} onClick={() => document.getElementById(`file_input_${i}`).click()}>
                                            <UploadCloud size={32} color="#94a3b8" />
                                            <p>{files[i] ? `Selected: ${files[i].name}` : (submission?.fileData?.[i] ? `Submitted: ${submission.fileData[i].name}` : "Click or drop file to upload")}</p>
                                            <input id={`file_input_${i}`} type="file" style={{display: 'none'}} onChange={(e) => handleFileChange(i, e.target.files[0])} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div style={styles.modalFooter}>
                    {isViewOnly ? ( <button className="btn-secondary" onClick={onClose}>Close</button> ) 
                    : ( <button className="btn-primary" onClick={() => handleSubmit(false)}><Send size={16} /> {submission ? 'Update Submission' : 'Submit Assignment'}</button> )}
                </div>
            </div>
        </div>
    );
};


const Assignments = ({ myClasses, user, showToast }) => {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [viewingAssignment, setViewingAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const studentID = user?.details?.StudentID;

  useEffect(() => {
    const studentClassIDs = new Set(myClasses.map(c => c.ClassID));
    if (studentClassIDs.size === 0) { setLoading(false); setAssignments([]); return; }
    const unsubAssignments = onValue(ref(db, 'assignments'), (snap) => {
        const data = snap.val() || {};
        const allRelevantAssignments = Object.values(data).filter(a => studentClassIDs.has(a.classID));
        setAssignments(allRelevantAssignments.sort((a,b) => parseFirebaseDate(b.dueDate) - parseFirebaseDate(a.dueDate)));
        setLoading(false);
    });
    const unsubSubmissions = onValue(ref(db, 'submissions'), (snap) => setSubmissions(snap.val() || {}));
    return () => { unsubAssignments(); unsubSubmissions(); };
  }, [myClasses]);

  const getStatus = (assignment) => {
    if (!assignment?.id || !assignment.status) return null;
    const submission = submissions[assignment.id]?.[studentID];
    const deadline = parseFirebaseDate(assignment.dueDate);
    const startTime = parseFirebaseDate(assignment.startTime);
    const now = new Date();
    
    if (submission?.status === 'GRADED') return { text: `Graded (${submission.marksAwarded ?? 0}/${assignment.maxMarks})`, color: 'success', isActionable: true, buttonText: 'View' };
    if (assignment.status !== 'ACTIVE') return { text: 'Closed', color: 'secondary', isActionable: !!submission, buttonText: 'View' };
    if (now < startTime) return { text: `Scheduled`, color: 'info', isActionable: false, buttonText: `Opens at ${startTime.toLocaleTimeString()}` };
    if (now > deadline) return { text: submission ? 'Submitted' : 'Overdue', color: submission ? 'info' : 'danger', isActionable: !!submission, buttonText: 'View' };
    return { text: submission ? 'Submitted (Editable)' : 'Pending', color: 'warning', isActionable: true, buttonText: submission ? 'Resubmit' : 'Submit' };
  };

  return (
    <>
      <div className="content-card">
        <div className="card-header"><span className="card-title">My Assignments</span></div>
        <table className="data-table">
          <thead><tr><th>Title</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {loading ? ( <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr> ) 
            : assignments.length === 0 ? ( <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>No assignments found.</td></tr> ) 
            : (assignments.map(a => {
                    const status = getStatus(a);
                    if (!status) return null;
                    return (
                        <tr key={a.id} style={{ opacity: !status.isActionable ? 0.7 : 1 }}>
                          <td>{a.title}</td>
                          <td>{parseFirebaseDate(a.dueDate).toLocaleString()}</td>
                          <td><span className={`badge badge-${status.color}`}>{status.text}</span></td>
                          <td>
                            <button className="btn-primary" onClick={() => setViewingAssignment(a)} disabled={!status.isActionable}>
                              {status.buttonText === 'View' ? <Eye size={16}/> : status.buttonText.startsWith('Opens') ? <Clock size={16}/> : <Send size={16}/>}
                              <span style={{marginLeft: '5px'}}>{status.buttonText}</span>
                            </button>
                          </td>
                        </tr>
                    )
                })
            )}
          </tbody>
        </table>
      </div>
      {viewingAssignment && (
        <AssignmentModal assignment={viewingAssignment} submission={submissions[viewingAssignment.id]?.[studentID]} isEditable={['Submit', 'Resubmit'].includes(getStatus(viewingAssignment)?.buttonText)} onClose={() => setViewingAssignment(null)} user={user} showToast={showToast} />
      )}
    </>
  );
};

const styles = {
    modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    modalContent: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 0, boxShadow: 'none', background: 'white' },
    modalBody: { padding: '20px', overflowY: 'auto', flexGrow: 1, background: '#f8fafc' },
    modalFooter: { padding: '15px 20px', borderTop: '1px solid #e2e8f0', textAlign: 'right', background: 'white' },
    timer: { fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', marginLeft: 'auto', padding: '5px 10px', borderRadius: '6px', background: '#e0e7ff', color: '#4f46e5' },
    questionBox: { background: 'white', padding: '20px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #e2e8f0' },
    answerBox: { whiteSpace: 'pre-wrap', background: '#f1f5f9', padding: '15px', borderRadius: '8px' },
    option: { padding: '8px 0', display: 'flex', alignItems: 'center' },
    optionLabel: { marginLeft: '10px', cursor: 'pointer' },
    fileDropZone: { border: '2px dashed #cbd5e1', borderRadius: '8px', padding: '20px', textAlign: 'center', cursor: 'pointer', background: '#f1f5f9' }
};

export default Assignments;