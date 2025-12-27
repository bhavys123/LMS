import React, { useState, useEffect, useMemo } from 'react';
import { Search, Edit, Trash2, UserPlus, Upload } from 'lucide-react';
import { ref, update, remove, set, onValue } from "firebase/database";
import * as XLSX from "xlsx";
import { db } from '../../firebase/firebaseConfig';
import Modal from '../../components/ui/Modal'; // Ensure this path is correct

const TeacherManagement = ({ showToast }) => {
    const [teachersList, setTeachersList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [editModal, setEditModal] = useState({ open: false, data: null });
    const [addModal, setAddModal] = useState(false);
    const [uploadModal, setUploadModal] = useState(false);
    const [teacherFile, setTeacherFile] = useState(null);

    const initialUserState = { TeacherID: '', TeacherName: '', Email: '', Phone: '' };
    const [newUser, setNewUser] = useState(initialUserState);

    useEffect(() => {
        const teachersRef = ref(db, 'teachers');
        const unsubscribe = onValue(teachersRef, (snapshot) => {
            const data = snapshot.val() || {};
            setTeachersList(Object.values(data));
            setLoading(false);
        }, (error) => {
            showToast(`Failed to fetch teachers: ${error.message}`, "error");
            setLoading(false);
        });
        return () => unsubscribe();
    }, [showToast]);

    const filteredList = useMemo(() => 
        teachersList.filter(item => 
            item.TeacherName?.toLowerCase().includes(search.toLowerCase()) ||
            item.Email?.toLowerCase().includes(search.toLowerCase())
        ), [teachersList, search]);

    const deleteItem = (item) => {
        if (window.confirm(`Are you sure you want to delete ${item.TeacherName}?`)) {
            remove(ref(db, `teachers/${item.TeacherID}`)).then(() => showToast("Teacher deleted successfully."));
        }
    };

    const toggleStatus = (item) => {
        update(ref(db, `teachers/${item.TeacherID}`), { disabled: !item.disabled })
            .then(() => showToast("Teacher status updated."));
    };

    const handleEditSave = () => {
        const { data } = editModal;
        const payload = { TeacherName: data.TeacherName, Email: data.Email, Phone: data.Phone };
        update(ref(db, `teachers/${data.TeacherID}`), payload)
            .then(() => {
                showToast("Teacher updated successfully.");
                setEditModal({ open: false, data: null });
            });
    };

    const handleAddUser = () => {
        if (!newUser.TeacherID || !newUser.TeacherName) return showToast("Teacher ID and Name are required.", "error");
        set(ref(db, `teachers/${newUser.TeacherID}`), { ...newUser, disabled: false })
            .then(() => {
                showToast(`Teacher added successfully.`);
                setAddModal(false);
                setNewUser(initialUserState);
            });
    };
    
    const handleBulkUpload = () => {
        if (!teacherFile) return showToast("Please select an Excel file.", "error");
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                const updates = {};
                let count = 0;
                jsonData.forEach(row => {
                    const teacherId = row.TeacherID || row['Teacher ID'];
                    if (teacherId) {
                        const trimmedId = String(teacherId).trim();
                        updates[`teachers/${trimmedId}`] = {
                            TeacherID: trimmedId,
                            TeacherName: row.TeacherName || row['Teacher Name'] || 'N/A',
                            Email: row.Email || '',
                            Phone: row.Phone || '',
                            disabled: false
                        };
                        count++;
                    }
                });
                if (count > 0) {
                    update(ref(db), updates).then(() => {
                        showToast(`Successfully processed ${count} teachers.`);
                        setUploadModal(false);
                        setTeacherFile(null);
                    });
                } else { showToast("No teachers with a valid 'TeacherID' column found.", "error"); }
            } catch (err) { showToast("Error parsing file.", "error"); }
        };
        reader.readAsArrayBuffer(teacherFile);
    };

    if (loading) {
        return <div className="content-card" style={{textAlign: 'center', padding: '40px'}}>Loading Teacher Data...</div>;
    }

    return (
        <div className="content-card">
            <div className="card-header">
                <span className="card-title">Teacher Management</span>
                {/* ======================= UI FIX IS HERE ======================= */}
                <div className="header-actions">
                    <input className="form-control" placeholder="Search Teachers..." value={search} onChange={e => setSearch(e.target.value)} />
                    
                    {/* This button uses the 'btn-secondary' class for an outlined look */}
                    <button className="btn-secondary" onClick={() => setUploadModal(true)}>
                        <Upload size={16} />
                        <span>Upload Roster</span>
                    </button>
                    
                    {/* This button uses the 'btn-primary' class for a solid look */}
                    <button className="btn-primary" onClick={() => setAddModal(true)}>
                        <UserPlus size={16}/>
                        <span>Add Teacher</span>
                    </button>
                </div>
                {/* ============================================================= */}
            </div>
            <table className="data-table">
                <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                    {filteredList.length > 0 ? filteredList.map(item => (
                        <tr key={item.TeacherID}>
                            <td>{item.TeacherID}</td>
                            <td>{item.TeacherName}</td>
                            <td>{item.Email || 'N/A'}</td>
                            <td>{item.Phone || 'N/A'}</td>
                            <td><span className={`badge ${item.disabled ? 'badge-danger' : 'badge-success'}`}>{item.disabled ? 'Disabled' : 'Active'}</span></td>
                            <td className="actions-cell">
                                <button className="action-btn btn-blue" onClick={() => setEditModal({ open: true, data: {...initialUserState, ...item} })}><Edit size={14}/></button>
                                <button className={`action-btn ${item.disabled ? 'btn-green' : 'btn-yellow'}`} onClick={() => toggleStatus(item)}>{item.disabled ? 'Enable' : 'Disable'}</button>
                                <button className="action-btn btn-red" onClick={() => deleteItem(item)}><Trash2 size={14}/></button>
                            </td>
                        </tr>
                    )) : <tr><td colSpan="6" style={{textAlign: 'center'}}>No teachers found.</td></tr>}
                </tbody>
            </table>
            
            {addModal && <Modal title="Add New Teacher" onClose={() => setAddModal(false)}>
                <div className="form-group"><label>Teacher ID</label><input className="form-control" value={newUser.TeacherID} onChange={e => setNewUser({...newUser, TeacherID: e.target.value})} /></div>
                <div className="form-group"><label>Full Name</label><input className="form-control" value={newUser.TeacherName} onChange={e => setNewUser({...newUser, TeacherName: e.target.value})} /></div>
                <div className="form-group"><label>Email</label><input type="email" className="form-control" value={newUser.Email} onChange={e => setNewUser({...newUser, Email: e.target.value})} /></div>
                <div className="form-group"><label>Phone</label><input type="tel" className="form-control" value={newUser.Phone} onChange={e => setNewUser({...newUser, Phone: e.target.value})} /></div>
                <div className="modal-actions"><button className="btn-secondary" onClick={() => setAddModal(false)}>Cancel</button><button className="btn-primary" onClick={handleAddUser}>Save Teacher</button></div>
            </Modal>}

            {editModal.open && <Modal title="Edit Teacher" onClose={() => setEditModal({open: false, data: null})}>
                <div className="form-group"><label>Name</label><input className="form-control" value={editModal.data.TeacherName} onChange={e => setEditModal({...editModal, data: {...editModal.data, TeacherName: e.target.value}})} /></div>
                <div className="form-group"><label>Email</label><input type="email" className="form-control" value={editModal.data.Email} onChange={e => setEditModal({...editModal, data: {...editModal.data, Email: e.target.value}})} /></div>
                <div className="form-group"><label>Phone</label><input type="tel" className="form-control" value={editModal.data.Phone} onChange={e => setEditModal({...editModal, data: {...editModal.data, Phone: e.target.value}})} /></div>
                <div className="modal-actions"><button className="btn-secondary" onClick={() => setEditModal({open: false, data: null})}>Cancel</button><button className="btn-primary" onClick={handleEditSave}>Save Changes</button></div>
            </Modal>}

            {uploadModal && <Modal title="Upload Teacher Roster" onClose={() => setUploadModal(false)}>
                <div className="form-group">
                    <label>Select Roster File (.xlsx)</label>
                    <input type="file" className="form-control" accept=".xlsx, .xls" onChange={e => setTeacherFile(e.target.files[0])} />
                    <small className="form-text"><b>Required:</b> `TeacherID`. <b>Optional:</b> `TeacherName`, `Email`, `Phone`.</small>
                </div>
                <div className="modal-actions"><button className="btn-secondary" onClick={() => setUploadModal(false)}>Cancel</button><button className="btn-primary" onClick={handleBulkUpload}>Upload & Process</button></div>
            </Modal>}
        </div>
    );
};

export default TeacherManagement;