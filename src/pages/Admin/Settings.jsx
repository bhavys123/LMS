import React, { useState } from 'react';
import { db } from '../../firebase/firebaseConfig';
import { ref, update, remove } from 'firebase/database';
import { Plus, Trash2 } from 'lucide-react';

const Settings = ({ initialSettings, holidays: initialHolidays, showToast }) => {
  const [settings, setSettings] = useState(initialSettings);
  const [holidayForm, setHolidayForm] = useState({ name: "", date: "" });

  const handleSaveSettings = () => {
    update(ref(db, 'settings'), settings).then(() => showToast("Settings saved"));
  };

  const handleAddHoliday = () => {
    if (!holidayForm.name || !holidayForm.date) return;
    update(ref(db, `holidays/${holidayForm.date}`), { name: holidayForm.name, date: holidayForm.date }).then(() => {
      showToast("Holiday added");
      setHolidayForm({ name: "", date: "" });
    });
  };

  return (
    <div className="grid-2" style={{alignItems: 'start'}}>
       <div className="content-card">
          <div className="card-header"><span className="card-title">System Rules</span></div>
          <div className="form-group">
             <label className="form-label">Edit Window (Hours)</label>
             <input type="number" className="form-control" value={settings.editWindow} onChange={e=>setSettings({...settings, editWindow: parseInt(e.target.value)})} />
          </div>
          <div className="form-group">
             <label className="form-label">Min. Attendance (%)</label>
             <input type="number" className="form-control" value={settings.minAttendance} onChange={e=>setSettings({...settings, minAttendance: parseInt(e.target.value)})} />
          </div>
          <button className="btn-primary" onClick={handleSaveSettings}>Save Settings</button>
       </div>

       <div className="content-card">
          <div className="card-header"><span className="card-title">Holidays</span></div>
          <div style={{display:'flex', gap:'10px', marginBottom:'15px'}}>
             <input className="form-control" placeholder="Name" value={holidayForm.name} onChange={e=>setHolidayForm({...holidayForm, name: e.target.value})} />
             <input type="date" className="form-control" value={holidayForm.date} onChange={e=>setHolidayForm({...holidayForm, date: e.target.value})} />
             <button className="action-btn btn-blue" onClick={handleAddHoliday}><Plus size={16}/></button>
          </div>
          <div style={{maxHeight:'300px', overflowY:'auto'}}>
            <table className="data-table">
               <tbody>
                  {Object.keys(initialHolidays).sort().map(d => (
                    <tr key={d}>
                      <td>{d}</td><td>{initialHolidays[d].name}</td>
                      <td><button className="action-btn btn-red" onClick={()=>remove(ref(db, `holidays/${d}`))}><Trash2 size={14}/></button></td>
                    </tr>
                  ))}
               </tbody>
            </table>
          </div>
       </div>
    </div>
  );
};

export default Settings;