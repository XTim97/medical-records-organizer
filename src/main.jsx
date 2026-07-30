import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const STORAGE_KEY = 'medical-records-organizer-v1';

const emptyData = {
  personal: {
    fullName: '', dateOfBirth: '', phone: '', address: '', city: '', state: '', zip: '',
    bloodType: '', allergies: '', medicalConditions: '', emergencyContactName: '', emergencyContactPhone: ''
  },
  insurance: [], doctors: [], surgeries: [], labs: [], appointments: [], notes: []
};

const tabs = [
  ['personal', 'Personal Info'], ['insurance', 'Insurance Info'], ['doctors', 'Doctors'],
  ['surgeries', 'Surgeries'], ['labs', 'Lab Results'], ['appointments', 'Upcoming Appointments'], ['notes', 'Miscellaneous Notes']
];

function uid() { return `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

function Field({ label, value, onChange, type='text', textarea=false, placeholder='' }) {
  return <label className="field"><span>{label}</span>{textarea
    ? <textarea value={value ?? ''} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>
    : <input type={type} value={value ?? ''} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>}</label>;
}

function Card({ title, onDelete, children }) {
  return <section className="card"><div className="card-head"><h3>{title}</h3>{onDelete && <button className="danger small" onClick={onDelete}>Delete</button>}</div>{children}</section>;
}

function App() {
  const [active, setActive] = useState('personal');
  const [data, setData] = useState(() => {
    try { return {...clone(emptyData), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')}; }
    catch { return clone(emptyData); }
  });
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setSaved(false);
    const t = setTimeout(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); setSaved(true); }, 250);
    return () => clearTimeout(t);
  }, [data]);

  const updatePersonal = (key, value) => setData(d => ({...d, personal:{...d.personal,[key]:value}}));
  const updateItem = (section, id, key, value) => setData(d => ({...d,[section]:d[section].map(x=>x.id===id?{...x,[key]:value}:x)}));
  const removeItem = (section, id) => setData(d => ({...d,[section]:d[section].filter(x=>x.id!==id)}));
  const addItem = (section, item) => setData(d => ({...d,[section]:[...d[section],{id:uid(),...item}]}));

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `medical-records-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
  };
  const importBackup = async (file) => {
    if (!file) return;
    try { const incoming = JSON.parse(await file.text()); setData({...clone(emptyData), ...incoming}); }
    catch { alert('That backup file could not be read.'); }
  };
  const clearAll = () => { if (confirm('Delete all medical records stored in this browser?')) setData(clone(emptyData)); };

  const content = useMemo(() => {
    if (active === 'personal') return <div className="grid two">
      <Field label="Full name" value={data.personal.fullName} onChange={v=>updatePersonal('fullName',v)}/>
      <Field label="Date of birth" type="date" value={data.personal.dateOfBirth} onChange={v=>updatePersonal('dateOfBirth',v)}/>
      <Field label="Phone number" type="tel" value={data.personal.phone} onChange={v=>updatePersonal('phone',v)}/>
      <Field label="Blood type" value={data.personal.bloodType} onChange={v=>updatePersonal('bloodType',v)}/>
      <Field label="Street address" value={data.personal.address} onChange={v=>updatePersonal('address',v)}/>
      <Field label="City" value={data.personal.city} onChange={v=>updatePersonal('city',v)}/>
      <Field label="State" value={data.personal.state} onChange={v=>updatePersonal('state',v)}/>
      <Field label="ZIP code" value={data.personal.zip} onChange={v=>updatePersonal('zip',v)}/>
      <Field label="Allergies" textarea value={data.personal.allergies} onChange={v=>updatePersonal('allergies',v)}/>
      <Field label="Medical conditions" textarea value={data.personal.medicalConditions} onChange={v=>updatePersonal('medicalConditions',v)}/>
      <Field label="Emergency contact name" value={data.personal.emergencyContactName} onChange={v=>updatePersonal('emergencyContactName',v)}/>
      <Field label="Emergency contact phone" type="tel" value={data.personal.emergencyContactPhone} onChange={v=>updatePersonal('emergencyContactPhone',v)}/>
    </div>;

    const configs = {
      insurance: {label:'Insurance Plan', add:'Add Insurance', blank:{company:'', planName:'', memberId:'', groupNumber:'', phone:'', effectiveDate:'', notes:''}, fields:[['company','Insurance company'],['planName','Plan name'],['memberId','Member ID'],['groupNumber','Group number'],['phone','Customer service phone','tel'],['effectiveDate','Effective date','date'],['notes','Notes','textarea']]},
      doctors: {label:'Doctor', add:'Add Doctor', blank:{name:'', specialty:'', phone:'', address:'', city:'', state:'', zip:''}, fields:[['name','Doctor name'],['specialty','Specialty'],['phone','Phone number','tel'],['address','Street address'],['city','City'],['state','State'],['zip','ZIP code']]},
      surgeries: {label:'Surgery', add:'Add Surgery', blank:{procedure:'', date:'', hospital:'', surgeon:'', reason:'', outcome:''}, fields:[['procedure','Procedure'],['date','Date','date'],['hospital','Hospital or facility'],['surgeon','Surgeon'],['reason','Reason','textarea'],['outcome','Outcome / follow-up','textarea']]},
      labs: {label:'Lab Result', add:'Add Lab Result', blank:{testName:'', date:'', facility:'', result:'', normalRange:'', doctor:'', notes:''}, fields:[['testName','Test name'],['date','Date','date'],['facility','Lab or facility'],['result','Result'],['normalRange','Reference range'],['doctor','Ordering doctor'],['notes','Notes','textarea']]},
      appointments: {label:'Appointment', add:'Add Appointment', blank:{date:'', time:'', doctor:'', reason:'', location:'', phone:'', notes:''}, fields:[['date','Date','date'],['time','Time','time'],['doctor','Doctor or provider'],['reason','Reason for visit'],['location','Location'],['phone','Phone number','tel'],['notes','Notes','textarea']]},
      notes: {label:'Note', add:'Add Note', blank:{title:'', date:'', text:''}, fields:[['title','Title'],['date','Date','date'],['text','Note','textarea']]}
    };
    const cfg = configs[active];
    return <>
      <div className="section-actions"><button className="primary" onClick={()=>addItem(active,cfg.blank)}>+ {cfg.add}</button></div>
      {data[active].length===0 && <div className="empty">No records yet. Select “{cfg.add}” to create one.</div>}
      <div className="stack">{data[active].map((item,i)=><Card key={item.id} title={`${cfg.label} ${i+1}`} onDelete={()=>removeItem(active,item.id)}>
        <div className="grid two">{cfg.fields.map(([key,label,type])=><Field key={key} label={label} type={type==='textarea'?'text':type||'text'} textarea={type==='textarea'} value={item[key]} onChange={v=>updateItem(active,item.id,key,v)}/>)}</div>
      </Card>)}</div>
    </>;
  }, [active, data]);

  return <div className="app">
    <header><div><h1>My Medical Records</h1><p>Private records stored on this device</p></div><div className={`save-state ${saved?'saved':''}`}>{saved?'Saved':'Saving…'}</div></header>
    <nav>{tabs.map(([id,label])=><button key={id} className={active===id?'active':''} onClick={()=>setActive(id)}>{label}</button>)}</nav>
    <main><div className="title-row"><h2>{tabs.find(t=>t[0]===active)[1]}</h2></div>{content}</main>
    <footer>
      <button onClick={exportBackup}>Export Backup</button>
      <label className="button-like">Import Backup<input hidden type="file" accept="application/json" onChange={e=>importBackup(e.target.files?.[0])}/></label>
      <button className="danger" onClick={clearAll}>Erase All Data</button>
    </footer>
  </div>;
}

createRoot(document.getElementById('root')).render(<App />);
