import React, { useState, useEffect, useMemo } from 'react';
import { Search, Edit, UserPlus, ChevronDown, ChevronRight, Plus, Upload, Trash2 } from 'lucide-react';
import { ref, update, remove, set, push, onValue } from "firebase/database";
import * as XLSX from "xlsx";
import { db } from '../../firebase/firebaseConfig';
import Modal from '../../components/ui/Modal'; // Ensure this path is correct

//================================================================================
//== Sub-Component 1: All Students Roster
//================================================================================
const AllStudentsView = ({ studentsList, showToast }) => {
    const [search, setSearch] = useState("");
    const [editModal, setEditModal] = useState({ open: false, data: null });
    const [addModal, setAddModal] = useState(false);
    const [uploadModal, setUploadModal] = useState(false);
    const [studentFile, setStudentFile] = useState(null);

    const initialStudentState = { 
        StudentID: '', StudentName: '', FatherName: '', MotherName: '', 
        StudentPhoneNumber: '', ParentPhoneNumber: '', StudentEmail: '', ParentEmail: '' 
    };
    const [newUser, setNewUser] = useState(initialStudentState);

    const filteredList = useMemo(() => 
        (studentsList || []).filter(item => 
            item.StudentName?.toLowerCase().includes(search.toLowerCase()) ||
            item.StudentID?.toLowerCase().includes(search.toLowerCase())
        ), [studentsList, search]);

    const toggleStatus = (item) => {
        update(ref(db, `students/${item.StudentID}`), { disabled: !item.disabled })
            .then(() => showToast(`Status updated for ${item.StudentName}.`));
    };

    const handleEditSave = () => {
        update(ref(db, `students/${editModal.data.StudentID}`), editModal.data)
            .then(() => {
                showToast("Student details updated.");
                setEditModal({ open: false, data: null });
            });
    };

    const handleAddUser = () => {
        if (!newUser.StudentID || !newUser.StudentName) return showToast("Student ID and Name are required.", "error");
        set(ref(db, `students/${newUser.StudentID}`), { ...newUser, disabled: false })
            .then(() => {
                showToast(`Student added successfully.`);
                setAddModal(false);
                setNewUser(initialStudentState);
            });
    };

    const handleBulkUpload = () => {
        if (!studentFile) return showToast("Please select an Excel file.", "error");
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                
                const updates = {};
                let count = 0;
                jsonData.forEach(row => {
                    const studentId = row['Student ID'] || row['StudentID'];
                    if (studentId) {
                        updates[`students/${String(studentId).trim()}`] = {
                            StudentID: String(studentId).trim(), StudentName: row['Student Name'] || 'N/A',
                            FatherName: row['Father Name'] || '', MotherName: row['Mother Name'] || '',
                            StudentPhoneNumber: row['Student Phone Number'] || '', ParentPhoneNumber: row['Parent Phone Number'] || '',
                            StudentEmail: row['Student Email'] || '', ParentEmail: row['Parent Email'] || '',
                            disabled: false
                        };
                        count++;
                    }
                });
                if (count > 0) {
                    update(ref(db), updates).then(() => {
                        showToast(`Successfully processed ${count} students.`);
                        setUploadModal(false); setStudentFile(null);
                    });
                } else { showToast("No students with a valid 'Student ID' found.", "error"); }
            } catch (err) { showToast("Error parsing file.", "error"); }
        };
        reader.readAsArrayBuffer(studentFile);
    };

    return (
        <div className="content-card">
            <div className="card-header">
                <span className="card-title">All Students Roster</span>
                <div className="header-actions">
                    <input className="form-control" placeholder="Search by Student Name or ID..." value={search} onChange={e => setSearch(e.target.value)} />
                    {/* --- UI FIX: Button order and classes updated --- */}
                    <button className="btn-secondary" onClick={() => setAddModal(true)}>
                        <UserPlus size={16} />
                        <span>Add Student</span>
                    </button>
                    <button className="btn-primary" onClick={() => setUploadModal(true)}>
                        <Upload size={16} />
                        <span>Upload Roster</span>
                    </button>
                </div>
            </div>
            <table className="data-table">
                <thead><tr><th>ID</th><th>Name</th><th>Father's Name</th><th>Student Email</th><th>Parent Phone</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                    {filteredList.length > 0 ? filteredList.map(item => (
                        <tr key={item.StudentID}>
                            <td>{item.StudentID}</td><td>{item.StudentName}</td><td>{item.FatherName || 'N/A'}</td><td>{item.StudentEmail || 'N/A'}</td><td>{item.ParentPhoneNumber || 'N/A'}</td>
                            <td><span className={`badge ${item.disabled ? 'badge-danger' : 'badge-success'}`}>{item.disabled ? 'Disabled' : 'Active'}</span></td>
                            <td className="actions-cell">
                                <button className="action-btn btn-blue" onClick={() => setEditModal({ open: true, data: { ...initialStudentState, ...item } })}><Edit size={14} /></button>
                                <button className={`action-btn ${item.disabled ? 'btn-green' : 'btn-yellow'}`} onClick={() => toggleStatus(item)}>{item.disabled ? 'Enable' : 'Disable'}</button>
                            </td>
                        </tr>
                    )) : <tr><td colSpan="7" style={{textAlign: 'center'}}>No students found.</td></tr>}
                </tbody>
            </table>

            {(addModal || editModal.open) && <Modal title={addModal ? "Add New Student" : "Edit Student Details"} onClose={() => { setAddModal(false); setEditModal({ open: false, data: null }); }} size="large">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px 25px' }}>
                    {Object.keys(addModal ? newUser : editModal.data).map(key => (!['disabled', 'classes'].includes(key) &&
                        <div className="form-group" key={key} style={{marginBottom: 0}}>
                            <label>{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                            <input className="form-control" value={addModal ? newUser[key] : editModal.data[key]} onChange={e => {
                                if(addModal) setNewUser({...newUser, [key]: e.target.value});
                                else setEditModal({...editModal, data: {...editModal.data, [key]: e.target.value}});
                            }} disabled={key === 'StudentID' && editModal.open} />
                        </div>
                    ))}
                </div>
                <div className="modal-actions"><button className="btn-secondary" onClick={() => { setAddModal(false); setEditModal({ open: false, data: null }); }}>Cancel</button><button className="btn-primary" onClick={addModal ? handleAddUser : handleEditSave}>Save</button></div>
            </Modal>}

            {uploadModal && <Modal title="Upload Student Roster" onClose={() => setUploadModal(false)}>
                <div className="form-group"><label>Select Roster File (.xlsx)</label><input type="file" className="form-control" accept=".xlsx, .xls" onChange={e => setStudentFile(e.target.files[0])} /><small className="form-text"><b>Required:</b> `Student ID`. <b>Optional:</b> `Student Name`, `Father Name`, etc.</small></div>
                <div className="modal-actions"><button className="btn-secondary" onClick={() => setUploadModal(false)}>Cancel</button><button className="btn-primary" onClick={handleBulkUpload}>Upload</button></div>
            </Modal>}
        </div>
    );
};

//================================================================================
//== Sub-Component 2: Class & Student Enrollment
//================================================================================
const ClassEnrollmentView = ({ studentsList, classesList, teachersList, showToast }) => {
    const [search, setSearch] = useState("");
    const [expandedClassId, setExpandedClassId] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newClassForm, setNewClassForm] = useState({ className: '', studentFile: null });
    const [addStudentModal, setAddStudentModal] = useState({ open: false, classId: null, className: '' });
    const [newStudentId, setNewStudentId] = useState('');

    const classData = useMemo(() => classesList.map(cls => ({...cls, students: studentsList.filter(s => s.classes && s.classes[cls.ClassID])})).filter(cls => cls.ClassName.toLowerCase().includes(search.toLowerCase()) || teachersList.find(t => t.TeacherID === cls.TeacherID)?.TeacherName.toLowerCase().includes(search.toLowerCase())), [classesList, studentsList, teachersList, search]);

    const handleCreateClassAndEnroll = () => {
        if (!newClassForm.className || !newClassForm.studentFile) return showToast("Class Name and File are required.", "error");
        const classId = push(ref(db, 'classes')).key;
        const updates = {[`classes/${classId}`]: { ClassID: classId, ClassName: newClassForm.className }};
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                let count = 0;
                jsonData.forEach(row => {
                    const studentId = row.StudentID || row['Student ID'];
                    if (studentId) {
                        updates[`students/${String(studentId).trim()}/classes/${classId}`] = { enrolledOn: new Date().toISOString().split('T')[0] };
                        count++;
                    }
                });
                if (count > 0) {
                    update(ref(db), updates).then(() => { showToast(`Created class and enrolled ${count} students.`); setIsAddModalOpen(false); setNewClassForm({className: '', studentFile: null}); });
                } else { showToast("No 'StudentID' column found in file.", "error"); }
            } catch (error) { showToast("Failed to parse file. Please check the format.", "error"); }
        };
        reader.readAsArrayBuffer(newClassForm.studentFile);
    };

    const handleAddSingleStudent = () => {
        const { classId, className } = addStudentModal;
        if (!newStudentId) return showToast("Student ID is required.", "error");
        update(ref(db, `students/${newStudentId}/classes/${classId}`), { enrolledOn: new Date().toISOString().split('T')[0] }).then(() => { showToast(`Student enrolled in ${className}.`); setAddStudentModal({ open: false }); setNewStudentId(''); }).catch(() => showToast("Failed to enroll. Check if student ID exists.", "error"));
    };

    const removeStudentFromClass = (studentId, classId) => {
        if (window.confirm("Un-enroll this student?")) { remove(ref(db, `students/${studentId}/classes/${classId}`)).then(() => showToast("Student removed from class.")); }
    };

    return (
        <div className="content-card">
            <div className="card-header"><span className="card-title">Class & Student Enrollment</span><div className="header-actions"><input className="form-control" placeholder="Search by Class or Teacher..." value={search} onChange={e => setSearch(e.target.value)} /><button className="btn-primary" onClick={() => setIsAddModalOpen(true)}><Plus size={16}/><span>Add Class & Enroll</span></button></div></div>
            <div className="class-accordion">
                {classData.length > 0 ? classData.map(cls => (
                    <div key={cls.ClassID} className="class-card">
                        <div className="class-card-header" onClick={() => setExpandedClassId(expandedClassId === cls.ClassID ? null : cls.ClassID)}>
                            <div className="class-header-title"><ChevronDown size={20} style={{transform: expandedClassId === cls.ClassID ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s'}}/><strong>{cls.ClassName}</strong><span className="subject-pill">{teachersList.find(t => t.TeacherID === cls.TeacherID)?.TeacherName || 'Unassigned'}</span><span className="student-count-badge">{cls.students.length} Students</span></div>
                            <button className="btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); setAddStudentModal({ open: true, classId: cls.ClassID, className: cls.ClassName }) }}><UserPlus size={14}/><span>Add Student</span></button>
                        </div>
                        {expandedClassId === cls.ClassID && <div className="class-card-body">
                            {cls.students.length > 0 ? <table className="data-table simple"><thead><tr><th>ID</th><th>Name</th><th>Enrolled On</th><th>Actions</th></tr></thead><tbody>{cls.students.map(s => (<tr key={s.StudentID}><td>{s.StudentID}</td><td>{s.StudentName}</td><td>{s.classes[cls.ClassID]?.enrolledOn || 'N/A'}</td><td className="actions-cell"><button className="action-btn btn-red" onClick={() => removeStudentFromClass(s.StudentID, cls.ClassID)}><Trash2 size={14}/></button></td></tr>))}</tbody></table> : <p className="no-students-message">No students are enrolled.</p>}
                        </div>}
                    </div>
                )) : <div style={{textAlign: 'center', padding: '20px'}}>No classes found.</div>}
            </div>
            
            {isAddModalOpen && <Modal title="Add New Class & Bulk Enroll" onClose={() => setIsAddModalOpen(false)}><div className="form-group"><label>New Class Name</label><input className="form-control" value={newClassForm.className} onChange={e => setNewClassForm({...newClassForm, className: e.target.value})} /></div><div className="form-group"><label>Upload Student Roster</label><input type="file" className="form-control" accept=".xlsx, .xls" onChange={e => setNewClassForm({...newClassForm, studentFile: e.target.files[0]})}/><small className="form-text">Excel file must contain a 'StudentID' column.</small></div><div className="modal-actions"><button className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button><button className="btn-primary" onClick={handleCreateClassAndEnroll}>Create</button></div></Modal>}
            {addStudentModal.open && <Modal title={`Enroll Student in ${addStudentModal.className}`} onClose={() => setAddStudentModal({ open: false })}><div className="form-group"><label>Student ID</label><input className="form-control" placeholder="Enter an existing Student ID" value={newStudentId} onChange={e => setNewStudentId(e.target.value)} /></div><div className="modal-actions"><button className="btn-secondary" onClick={() => setAddStudentModal({ open: false })}>Cancel</button><button className="btn-primary" onClick={handleAddSingleStudent}>Enroll</button></div></Modal>}
        </div>
    );
};

//================================================================================
//== MAIN StudentManagement COMPONENT
//================================================================================
const StudentManagement = ({ showToast }) => {
    const [activeTab, setActiveTab] = useState('students');
    const [studentsList, setStudentsList] = useState([]);
    const [classesList, setClassesList] = useState([]);
    const [teachersList, setTeachersList] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const onData = (path, setter) => onValue(ref(db, path), (snapshot) => {
            setter(Object.values(snapshot.val() || {}));
            setLoading(false);
        }, (error) => { setLoading(false); showToast(`Failed to fetch data: ${error.message}`, "error"); });

        const unsubStudents = onData('students', setStudentsList);
        const unsubClasses = onData('classes', setClassesList);
        const unsubTeachers = onData('teachers', setTeachersList);

        return () => { unsubStudents(); unsubClasses(); unsubTeachers(); };
    }, [showToast]);

    if (loading) {
        return <div className="content-card" style={{textAlign: 'center', padding: '40px'}}>Loading Student Data...</div>;
    }

    return (
        <div>
            {/* --- UI FIX: Tab container for segmented control styling --- */}
            <div className="tabs-container">
                <button className={`tab-button ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>All Students Roster</button>
                <button className={`tab-button ${activeTab === 'enrollment' ? 'active' : ''}`} onClick={() => setActiveTab('enrollment')}>Class & Student Enrollment</button>
            </div>
            <div className="tab-content">
                {activeTab === 'students' ? 
                    <AllStudentsView studentsList={studentsList} showToast={showToast} /> : 
                    <ClassEnrollmentView {...{ studentsList, classesList, teachersList, showToast }} />
                }
            </div>
        </div>
    );
};

export default StudentManagement;