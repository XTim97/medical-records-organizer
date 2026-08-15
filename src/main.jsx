import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./App.css";
import "./styles.css";
import { supabase } from "./supabase";
const sections = [
  { name: "Personal Information", className: "red" },
  { name: "Insurance Information", className: "orange" },
  { name: "Doctors", className: "yellow" },
  { name: "Surgeries", className: "green" },
  { name: "Lab / Procedures", className: "blue" },
  { name: "Appointments", className: "indigo" },
  { name: "Miscellaneous Info", className: "violet" },
];

const emptyPersonalInfo = {
  fullName: "",
  dateOfBirth: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  phoneNumber: "",
  emailAddress: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  bloodType: "",
  allergies: "",
};

const emptyInsurance = {
  insuranceCompany: "",
  planName: "",
  memberId: "",
  groupNumber: "",
  policyholderName: "",
  policyholderDob: "",
  notes: "",
};

const emptyDoctor = {
  doctorName: "",
  specialty: "",
  officeAddress: "",
  city: "",
  state: "",
  zipCode: "",
  phoneNumber: "",
};

const emptySurgery = {
  procedureName: "",
  surgeryDate: "",
  surgeon: "",
  facility: "",
  city: "",
  state: "",
  notes: "",
};

const emptyLabResult = {
  testDate: "",
  labName: "",
};

const emptyNote = {
  date: "",
  title: "",
  note: "",
};

const LAB_DB_NAME = "MedicalRecordsLabDatabase";
const LAB_STORE_NAME = "labResults";

function openLabDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(LAB_DB_NAME, 1);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(LAB_STORE_NAME)) {
        db.createObjectStore(LAB_STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    };
  });
}

async function getAllLabResults() {
  const db = await openLabDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(LAB_STORE_NAME, "readonly");
    const store = transaction.objectStore(LAB_STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveLabResultToDatabase(labResult) {
  const db = await openLabDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(LAB_STORE_NAME, "readwrite");
    const store = transaction.objectStore(LAB_STORE_NAME);

    const request = labResult.id
      ? store.put(labResult)
      : store.add(labResult);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function deleteLabResultFromDatabase(id) {
  const db = await openLabDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(LAB_STORE_NAME, "readwrite");
    const store = transaction.objectStore(LAB_STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
function formatTime(time) {
  if (!time) return "";

  const [hours, minutes] = time.split(":");
  const hour = Number(hours);

  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minutes} ${period}`;
}
function formatDate(date) {
  if (!date) return "";

  const [year, month, day] = date.split("-");

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  ).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}


function GeneralRecordDocuments({ session, target, onClose, onSavedMessage }) {
  const [file, setFile] = useState(null);
  const [documentName, setDocumentName] = useState("");
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("manage");
  const [editName, setEditName] = useState("");
  const [addingNewDocument, setAddingNewDocument] = useState(false);

  const bucket = "note-documents";
  const userId = session?.user?.id;
  const safeRecordId = String(target?.id || "record").replace(/[^a-zA-Z0-9_-]+/g, "-");
  const safeKind = String(target?.kind || "record").replace(/[^a-zA-Z0-9_-]+/g, "-");
  const folder = userId ? `${userId}/${safeKind}-${safeRecordId}` : "";

  function displayName(storedName) {
    if (!storedName) return "Document";
    const withoutTimestamp = storedName.replace(/^\d+-/, "");
    const lastDot = withoutTimestamp.lastIndexOf(".");
    const baseName = lastDot > 0 ? withoutTimestamp.slice(0, lastDot) : withoutTimestamp;
    return baseName.replace(/-/g, " ");
  }

  async function loadDocuments() {
    if (!folder) return [];
    setBusy(true);
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    if (error) {
      console.error("Could not load record documents:", error);
      window.alert("The documents could not be loaded.");
      setBusy(false);
      return [];
    }
    const items = (data || [])
      .filter((item) => item.name && item.name !== ".emptyFolderPlaceholder")
      .map((item) => ({
        name: item.name,
        displayName: displayName(item.name),
        path: `${folder}/${item.name}`,
        mimeType: item.metadata?.mimetype || "",
      }));
    setDocuments(items);
    setSelectedDocument((current) => {
      if (!current) return null;
      return items.find((item) => item.path === current.path) || null;
    });
    setBusy(false);
    return items;
  }

  useEffect(() => {
    loadDocuments();
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [folder]);

  function selectFile(event) {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setFile(picked);
    const originalName = picked.name || "document";
    const lastDot = originalName.lastIndexOf(".");
    setDocumentName(lastDot > 0 ? originalName.slice(0, lastDot) : originalName);
    setSelectedDocument(null);
    setPreviewUrl("");
    setMode("manage");
    setAddingNewDocument(true);
  }

  function selectSavedDocument(document) {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setDocumentName("");
    setSelectedDocument(document);
    setPreviewUrl("");
    setMode("manage");
    setEditName(document.displayName || displayName(document.name));
    setAddingNewDocument(false);
  }

  function beginNewDocument() {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setDocumentName("");
    setSelectedDocument(null);
    setPreviewUrl("");
    setMode("manage");
    setEditName("");
    setAddingNewDocument(true);
  }

  async function previewPickedFile() {
    if (!file) return;
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setMode("preview-new");
  }

  async function viewSavedDocument() {
    if (!selectedDocument?.path) return;
    setBusy(true);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(selectedDocument.path, 300);
    if (error) {
      console.error("Could not view record document:", error);
      window.alert("The document could not be viewed.");
      setBusy(false);
      return;
    }
    setPreviewUrl(data.signedUrl);
    setMode("view");
    setBusy(false);
  }

  function closeViewer() {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setMode("manage");
  }

  async function saveDocument() {
    if (!file || !folder) {
      window.alert("Please take a photo or choose a file first.");
      return;
    }
    const trimmed = documentName.trim();
    if (!trimmed) {
      window.alert("Please enter a name for this document before saving.");
      return;
    }
    const originalName = file.name || "document";
    const lastDot = originalName.lastIndexOf(".");
    const extension = lastDot > 0 ? originalName.slice(lastDot).replace(/[^a-zA-Z0-9.]+/g, "") : "";
    const safeName = trimmed.replace(/[^a-zA-Z0-9._ -]+/g, "").trim().replace(/\s+/g, "-").replace(/^-+|-+$/g, "") || "document";
    const path = `${folder}/${Date.now()}-${safeName}${extension}`;
    setBusy(true);
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      contentType: file.type || undefined,
      upsert: false,
    });
    if (error) {
      console.error("Could not save record document:", error);
      window.alert("The document could not be saved. Please try again.");
      setBusy(false);
      return;
    }
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setDocumentName("");
    setPreviewUrl("");
    setMode("manage");
    await loadDocuments();
    onSavedMessage?.("Document saved");

    const addAnother = window.confirm("Document saved successfully. Do you want to add another document?");
    if (addAnother) {
      setSelectedDocument(null);
      setAddingNewDocument(true);
      return;
    }

    onClose?.();
  }

  async function deleteDocument() {
    if (file) {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      setFile(null);
      setDocumentName("");
      setPreviewUrl("");
      setMode("manage");
      return;
    }
    if (!selectedDocument?.path) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedDocument.displayName || selectedDocument.name}?`)) return;
    setBusy(true);
    const deletedPath = selectedDocument.path;
    const { error } = await supabase.storage.from(bucket).remove([deletedPath]);
    if (error) {
      console.error("Could not delete record document:", error);
      window.alert("The document could not be deleted.");
      setBusy(false);
      return;
    }
    const remaining = documents.filter((item) => item.path !== deletedPath);
    setDocuments(remaining);
    setSelectedDocument(remaining[0] || null);
    setPreviewUrl("");
    setBusy(false);
    onSavedMessage?.("Document deleted");
  }

  function beginEdit() {
    if (!selectedDocument) return;
    setEditName(selectedDocument.displayName || displayName(selectedDocument.name));
    setMode("edit");
  }

  async function saveEdit() {
    if (!selectedDocument?.path || !folder) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      window.alert("Please enter a document name.");
      return;
    }
    const oldName = selectedDocument.name || "document";
    const lastDot = oldName.lastIndexOf(".");
    const extension = lastDot > 0 ? oldName.slice(lastDot) : "";
    const base = lastDot > 0 ? oldName.slice(0, lastDot) : oldName;
    const timestamp = base.match(/^(\d+)-/)?.[1] || String(Date.now());
    const safeName = trimmed.replace(/[^a-zA-Z0-9._ -]+/g, "").trim().replace(/\s+/g, "-").replace(/^-+|-+$/g, "") || "document";
    const newPath = `${folder}/${timestamp}-${safeName}${extension}`;
    if (newPath === selectedDocument.path) {
      setMode("manage");
      return;
    }
    setBusy(true);
    const { error } = await supabase.storage.from(bucket).move(selectedDocument.path, newPath);
    if (error) {
      console.error("Could not rename record document:", error);
      window.alert("The document name could not be changed.");
      setBusy(false);
      return;
    }
    const items = await loadDocuments();
    setSelectedDocument(items.find((item) => item.path === newPath) || items[0] || null);
    setMode("manage");
    setBusy(false);
    onSavedMessage?.("Document updated");
  }

  const activeName = file?.name || selectedDocument?.name || "";
  const activeType = file?.type || selectedDocument?.mimeType || "";
  const isPdf = activeType === "application/pdf" || activeName.toLowerCase().endsWith(".pdf");

  if ((mode === "view" || mode === "preview-new") && previewUrl) {
    return (
      <main className="app document-fullscreen-viewer">
        <h1>{target?.heading || "Scanned Document"}</h1>
        <p className="document-policy-name">{file ? documentName || file.name : selectedDocument?.displayName || selectedDocument?.name}</p>
        <div className="form-card document-card">
          <div className="document-preview">
            {isPdf ? <iframe src={previewUrl} title="Scanned document" /> : <img src={previewUrl} alt="Scanned document" />}
          </div>
          <div className="document-action-buttons document-view-actions">
            <button className="save-button" type="button" onClick={closeViewer}>OK</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <div className="navigation-buttons">
        <button className="back-button" type="button" onClick={onClose}>← Back</button>
      </div>
      <h1>Insurance Document</h1>
      <p className="document-policy-name">{target?.label || "Record"}</p>
      <div className="form-card document-card">
        {!selectedDocument && mode !== "edit" && (documents.length === 0 || addingNewDocument) && (
          <>
            <div className="document-source-buttons">
              <label className="document-source-button">Take Photo
                <input className="document-file-input" type="file" accept="image/*" capture="environment" onChange={selectFile} />
              </label>
              <label className="document-source-button">Choose File
                <input className="document-file-input" type="file" accept="image/*,application/pdf" onChange={selectFile} />
              </label>
            </div>
            {file && (
              <div className="document-selected-file">
                <span>Selected file:</span><strong>{file.name}</strong>
                <label className="document-name-label">Document Name
                  <input type="text" value={documentName} onChange={(e) => setDocumentName(e.target.value)} placeholder="Enter a name for this document" disabled={busy} />
                </label>
                <div className="document-action-buttons">
                  <button className="edit-button" type="button" onClick={previewPickedFile} disabled={busy}>Preview</button>
                  <button className="save-button" type="button" onClick={saveDocument} disabled={busy}>Save</button>
                  <button className="delete-button" type="button" onClick={deleteDocument} disabled={busy}>Delete</button>
                </div>
              </div>
            )}
          </>
        )}

        {documents.length > 0 && mode !== "edit" && (
          <div className="saved-documents-section">
            {!addingNewDocument && <button className="document-source-button" type="button" onClick={beginNewDocument} disabled={busy}>+ Add Another Document</button>}
            <h2>Saved Documents</h2>
            <div className="saved-documents-list">
              {documents.map((document) => (
                <button type="button" key={document.path} className={`saved-document-item ${selectedDocument?.path === document.path ? "selected" : ""}`} onClick={() => selectSavedDocument(document)} disabled={busy}>
                  {document.displayName || document.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedDocument && mode === "manage" && (
          <div className="document-action-buttons saved-document-actions">
            <button className="edit-button" type="button" onClick={viewSavedDocument} disabled={busy}>View</button>
            <button className="save-button" type="button" onClick={beginEdit} disabled={busy}>Edit</button>
            <button className="delete-button" type="button" onClick={deleteDocument} disabled={busy}>Delete</button>
          </div>
        )}

        {mode === "edit" && selectedDocument && (
          <div className="document-edit-panel">
            <h2>Edit Document</h2>
            <label className="document-name-label">Document Name
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} disabled={busy} />
            </label>
            <div className="document-action-buttons">
              <button className="save-button" type="button" onClick={saveEdit} disabled={busy}>Save</button>
              <button className="cancel-button" type="button" onClick={() => setMode("manage")} disabled={busy}>Cancel</button>
            </div>
          </div>
        )}

        {!busy && documents.length === 0 && !file && <p className="document-help-text">No scanned documents saved yet.</p>}
        {busy && <p className="document-help-text">Loading...</p>}
      </div>
    </main>
  );
}

function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeSection, setActiveSection] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [generalDocumentTarget, setGeneralDocumentTarget] = useState(null);
  const [pendingDocumentFile, setPendingDocumentFile] = useState(null);
  const [pendingDocumentName, setPendingDocumentName] = useState("");
  const [pendingDocumentKind, setPendingDocumentKind] = useState("");

  const [appointments, setAppointments] = useState(() => {
    const saved = localStorage.getItem("medicalRecordsAppointments");
    return saved ? JSON.parse(saved) : [];
  });

  const [appointmentForm, setAppointmentForm] = useState({
    date: "",
    time: "",
    doctor: "",
    specialty: "",
    location: "",
    reason: "",
    notes: "",
  });
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [editingAppointmentIndex, setEditingAppointmentIndex] = useState(null);
  const [appointmentView, setAppointmentView] = useState("menu");

  const [personalInfo, setPersonalInfo] = useState(() => {
    const saved = localStorage.getItem("medicalRecordsPersonalInfo");
    if (!saved) return emptyPersonalInfo;
    try {
      return JSON.parse(saved);
    } catch {
      return emptyPersonalInfo;
    }
  });

  const [insurancePolicies, setInsurancePolicies] = useState(() => {
    const saved = localStorage.getItem("medicalRecordsInsurance");
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });
  const [insuranceForm, setInsuranceForm] = useState(emptyInsurance);
  const [editingInsuranceIndex, setEditingInsuranceIndex] = useState(null);
  const [showInsuranceForm, setShowInsuranceForm] = useState(false);
  const [selectedInsuranceIndex, setSelectedInsuranceIndex] = useState(null);
  const [showInsuranceDocument, setShowInsuranceDocument] = useState(false);
  const [documentPolicy, setDocumentPolicy] = useState(null);
  const [insuranceDocumentFile, setInsuranceDocumentFile] = useState(null);
  const [insuranceDocumentName, setInsuranceDocumentName] = useState("");
  const [savedInsuranceDocuments, setSavedInsuranceDocuments] = useState([]);
  const [selectedInsuranceDocument, setSelectedInsuranceDocument] = useState(null);
  const [insuranceDocumentPreviewUrl, setInsuranceDocumentPreviewUrl] = useState("");
  const [insuranceDocumentBusy, setInsuranceDocumentBusy] = useState(false);
  const [insuranceDocumentMode, setInsuranceDocumentMode] = useState("manage");
  const [insuranceDocumentEditName, setInsuranceDocumentEditName] = useState("");
  const [addingNewInsuranceDocument, setAddingNewInsuranceDocument] = useState(false);

  const [doctors, setDoctors] = useState(() => {
    const saved = localStorage.getItem("medicalRecordsDoctors");
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });
  const [doctorForm, setDoctorForm] = useState(emptyDoctor);
  const [editingDoctorIndex, setEditingDoctorIndex] = useState(null);
  const [showDoctorForm, setShowDoctorForm] = useState(false);
  const [selectedDoctorIndex, setSelectedDoctorIndex] = useState(null);

  const [surgeries, setSurgeries] = useState(() => {
    const saved = localStorage.getItem("medicalRecordsSurgeries");
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });
  const [surgeryForm, setSurgeryForm] = useState(emptySurgery);
  const [editingSurgeryIndex, setEditingSurgeryIndex] = useState(null);
  const [showSurgeryForm, setShowSurgeryForm] = useState(false);
  const [selectedSurgeryIndex, setSelectedSurgeryIndex] = useState(null);

  const [labResults, setLabResults] = useState([]);
  const [labForm, setLabForm] = useState(emptyLabResult);
  const [editingLabId, setEditingLabId] = useState(null);
  const [showLabForm, setShowLabForm] = useState(false);
  const [selectedLabId, setSelectedLabId] = useState(null);
  const [showLabDocument, setShowLabDocument] = useState(false);
  const [documentLab, setDocumentLab] = useState(null);
  const [labDocumentFile, setLabDocumentFile] = useState(null);
  const [labDocumentName, setLabDocumentName] = useState("");
  const [savedLabDocuments, setSavedLabDocuments] = useState([]);
  const [selectedLabDocument, setSelectedLabDocument] = useState(null);
  const [labDocumentPreviewUrl, setLabDocumentPreviewUrl] = useState("");
  const [labDocumentBusy, setLabDocumentBusy] = useState(false);
  const [labDocumentMode, setLabDocumentMode] = useState("manage");
  const [labDocumentEditName, setLabDocumentEditName] = useState("");
  const [addingNewLabDocument, setAddingNewLabDocument] = useState(false);
  const [selectedLabCategory, setSelectedLabCategory] = useState("");
  const [showLabMoveChoices, setShowLabMoveChoices] = useState(false);
  const [showLabSaveChoices, setShowLabSaveChoices] = useState(false);

  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem("medicalRecordsNotes");
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  });
  const [noteForm, setNoteForm] = useState(emptyNote);
  const [editingNoteIndex, setEditingNoteIndex] = useState(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [selectedNoteIndex, setSelectedNoteIndex] = useState(null);
  const [showNoteDocument, setShowNoteDocument] = useState(false);
  const [documentNote, setDocumentNote] = useState(null);
  const [noteDocumentFile, setNoteDocumentFile] = useState(null);
  const [noteDocumentName, setNoteDocumentName] = useState("");
  const [savedNoteDocuments, setSavedNoteDocuments] = useState([]);
  const [selectedNoteDocument, setSelectedNoteDocument] = useState(null);
  const [noteDocumentPreviewUrl, setNoteDocumentPreviewUrl] = useState("");
  const [noteDocumentBusy, setNoteDocumentBusy] = useState(false);
  const [noteDocumentMode, setNoteDocumentMode] = useState("manage");
  const [noteDocumentEditName, setNoteDocumentEditName] = useState("");
  const [addingNewNoteDocument, setAddingNewNoteDocument] = useState(false);

  function safeDate(value) {
    return value || null;
  }

  function normalizeLabDateForStorage(value) {
    const trimmed = (value || "").trim();
    if (!trimmed) return null;

    if (/^\d{4}-\d{2}$/.test(trimmed)) return `${trimmed}-01`;

    const monthNames = {
      jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03",
      apr: "04", april: "04", may: "05", jun: "06", june: "06", jul: "07", july: "07",
      aug: "08", august: "08", sep: "09", sept: "09", september: "09", oct: "10", october: "10",
      nov: "11", november: "11", dec: "12", december: "12",
    };
    const monthYear = trimmed.match(/^([A-Za-z]+)\s+(\d{4})$/);
    if (monthYear) {
      const month = monthNames[monthYear[1].toLowerCase()];
      if (month) return `${monthYear[2]}-${month}-01`;
    }

    return trimmed;
  }

  function displayLabDate(value) {
    const trimmed = (value || "").trim();
    const monthOnly = trimmed.match(/^(\d{4})-(\d{2})-01$/);
    if (monthOnly) return `${monthOnly[1]}-${monthOnly[2]}`;
    return trimmed;
  }

  function parseLabDocumentFilename(fileName) {
    const originalName = fileName || "";
    const lastDot = originalName.lastIndexOf(".");
    const baseName = (lastDot > 0 ? originalName.slice(0, lastDot) : originalName)
      .replace(/[_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const months = {
      jan: "01", january: "01", feb: "02", february: "02", mar: "03", march: "03",
      apr: "04", april: "04", may: "05", jun: "06", june: "06", jul: "07", july: "07",
      aug: "08", august: "08", sep: "09", sept: "09", september: "09", oct: "10", october: "10",
      nov: "11", november: "11", dec: "12", december: "12",
    };

    let name = baseName;
    let date = "";

    const exactDate = baseName.match(/^(.*?)[\s_-]+(\d{4})[-_](\d{1,2})[-_](\d{1,2})$/);
    if (exactDate) {
      name = exactDate[1].trim();
      date = `${exactDate[2]}-${String(exactDate[3]).padStart(2, "0")}-${String(exactDate[4]).padStart(2, "0")}`;
      return { name, date };
    }

    const monthYear = baseName.match(/^(.*?)[\s_-]+([A-Za-z]+)\s+(\d{4})$/);
    if (monthYear) {
      const month = months[monthYear[2].toLowerCase()];
      if (month) {
        name = monthYear[1].trim();
        date = `${monthYear[3]}-${month}`;
      }
    }

    return { name, date };
  }

  function safeTime(value) {
    return value || null;
  }

  function clearPendingDocument() {
    setPendingDocumentFile(null);
    setPendingDocumentName("");
    setPendingDocumentKind("");
  }

  function selectPendingDocument(event, kind) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPendingDocumentFile(file);
    setPendingDocumentKind(kind);
    const originalName = file.name || "document";
    const lastDot = originalName.lastIndexOf(".");
    setPendingDocumentName(lastDot > 0 ? originalName.slice(0, lastDot) : originalName);

    if (kind === "lab") {
      const parsed = parseLabDocumentFilename(originalName);
      setLabForm((current) => ({
        ...current,
        labName: parsed.name || current.labName,
        testDate: parsed.date || current.testDate,
      }));
    }

    if (kind === "note") {
      const parsed = parseLabDocumentFilename(originalName);
      const parsedDate = parsed.date
        ? (/^\d{4}-\d{2}$/.test(parsed.date) ? `${parsed.date}-01` : parsed.date)
        : "";
      setNoteForm((current) => ({
        ...current,
        title: parsed.name || current.title,
        date: parsedDate || current.date,
      }));
    }
  }

  function viewPendingDocument(kind) {
    if (!pendingDocumentFile || pendingDocumentKind !== kind) {
      window.alert("Please add a document first.");
      return;
    }
    const url = URL.createObjectURL(pendingDocumentFile);
    window.open(url, "_blank");
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function uploadPendingDocument(userId, kind, recordId, bucket, folder, askAddAnother = true) {
    if (!pendingDocumentFile || pendingDocumentKind !== kind || !recordId) return false;

    const trimmedName = (pendingDocumentName || "document").trim() || "document";
    const originalName = pendingDocumentFile.name || "document";
    const lastDot = originalName.lastIndexOf(".");
    const extension = lastDot > 0 ? originalName.slice(lastDot).replace(/[^a-zA-Z0-9.]+/g, "") : "";
    const safeName = trimmedName
      .replace(/[^a-zA-Z0-9._ -]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "") || "document";
    const path = `${folder}/${Date.now()}-${safeName}${extension}`;

    const { error } = await supabase.storage.from(bucket).upload(path, pendingDocumentFile, {
      cacheControl: "3600",
      contentType: pendingDocumentFile.type || undefined,
      upsert: false,
    });

    if (error) {
      console.error("Could not save pending document:", error);
      window.alert("The record was saved, but the document could not be uploaded.");
      return false;
    }

    clearPendingDocument();
    if (!askAddAnother) return false;
    return window.confirm("Document saved successfully. Do you want to add another document?");
  }

  function personalFromRow(row) {
    if (!row) return emptyPersonalInfo;
    return {
      fullName: row.full_name || "",
      dateOfBirth: row.date_of_birth || "",
      address: row.address || "",
      city: row.city || "",
      state: row.state || "",
      zipCode: row.zip_code || "",
      phoneNumber: row.phone_number || "",
      emailAddress: row.email_address || "",
      emergencyContactName: row.emergency_contact_name || "",
      emergencyContactPhone: row.emergency_contact_phone || "",
      bloodType: row.blood_type || "",
      allergies: row.allergies || "",
    };
  }

  function personalToRow(info, userId) {
    return {
      user_id: userId,
      full_name: info.fullName || null,
      date_of_birth: safeDate(info.dateOfBirth),
      address: info.address || null,
      city: info.city || null,
      state: info.state || null,
      zip_code: info.zipCode || null,
      phone_number: info.phoneNumber || null,
      email_address: info.emailAddress || null,
      emergency_contact_name: info.emergencyContactName || null,
      emergency_contact_phone: info.emergencyContactPhone || null,
      blood_type: info.bloodType || null,
      allergies: info.allergies || null,
    };
  }

  function insuranceFromRow(row) {
    return {
      id: row.id,
      insuranceCompany: row.insurance_company || "",
      planName: row.plan_name || "",
      memberId: row.member_id || "",
      groupNumber: row.group_number || "",
      policyholderName: row.policyholder_name || "",
      policyholderDob: row.policyholder_dob || "",
      notes: row.notes || "",
    };
  }

  function insuranceToRow(policy, userId) {
    return {
      user_id: userId,
      insurance_company: policy.insuranceCompany || null,
      plan_name: policy.planName || null,
      member_id: policy.memberId || null,
      group_number: policy.groupNumber || null,
      policyholder_name: policy.policyholderName || null,
      policyholder_dob: safeDate(policy.policyholderDob),
      notes: policy.notes || null,
    };
  }

  function doctorFromRow(row) {
    return {
      id: row.id,
      doctorName: row.doctor_name || "",
      specialty: row.specialty || "",
      officeAddress: row.office_address || "",
      city: row.city || "",
      state: row.state || "",
      zipCode: row.zip_code || "",
      phoneNumber: row.phone_number || "",
    };
  }

  function doctorToRow(doctor, userId) {
    return {
      user_id: userId,
      doctor_name: doctor.doctorName || null,
      specialty: doctor.specialty || null,
      office_address: doctor.officeAddress || null,
      city: doctor.city || null,
      state: doctor.state || null,
      zip_code: doctor.zipCode || null,
      phone_number: doctor.phoneNumber || null,
    };
  }

  function surgeryFromRow(row) {
    return {
      id: row.id,
      procedureName: row.procedure_name || "",
      surgeryDate: row.surgery_date || "",
      surgeon: row.surgeon || "",
      facility: row.facility || "",
      city: row.city || "",
      state: row.state || "",
      notes: row.notes || "",
    };
  }

  function surgeryToRow(surgery, userId) {
    return {
      user_id: userId,
      procedure_name: surgery.procedureName || null,
      surgery_date: safeDate(surgery.surgeryDate),
      surgeon: surgery.surgeon || null,
      facility: surgery.facility || null,
      city: surgery.city || null,
      state: surgery.state || null,
      notes: surgery.notes || null,
    };
  }

  function appointmentFromRow(row) {
    return {
      id: row.id,
      date: row.appointment_date || "",
      time: row.appointment_time ? row.appointment_time.slice(0, 5) : "",
      doctor: row.doctor || "",
      specialty: row.specialty || "",
      location: row.location || "",
      reason: row.reason || "",
      notes: row.notes || "",
    };
  }

  function appointmentToRow(appointment, userId) {
    return {
      user_id: userId,
      appointment_date: safeDate(appointment.date),
      appointment_time: safeTime(appointment.time),
      doctor: appointment.doctor || null,
      specialty: appointment.specialty || null,
      location: appointment.location || null,
      reason: appointment.reason || null,
      notes: appointment.notes || null,
    };
  }

  function noteFromRow(row) {
    return {
      id: row.id,
      date: row.note_date || "",
      title: row.title || "",
      note: row.note || "",
    };
  }

  function noteToRow(note, userId) {
    return {
      user_id: userId,
      note_date: safeDate(note.date),
      title: note.title || null,
      note: note.note || null,
    };
  }

  function labFromRow(row) {
    return {
      id: row.id,
      testDate: displayLabDate(row.test_date || ""),
      labName: row.lab_name || "",
      category: row.category || "",
    };
  }

  function cachePersonal(info) {
    localStorage.setItem("medicalRecordsPersonalInfo", JSON.stringify(info));
  }

  function cacheInsurance(items) {
    localStorage.setItem("medicalRecordsInsurance", JSON.stringify(items));
  }

  function cacheDoctors(items) {
    localStorage.setItem("medicalRecordsDoctors", JSON.stringify(items));
  }

  function cacheSurgeries(items) {
    localStorage.setItem("medicalRecordsSurgeries", JSON.stringify(items));
  }

  function cacheAppointments(items) {
    localStorage.setItem("medicalRecordsAppointments", JSON.stringify(items));
  }

  function cacheNotes(items) {
    localStorage.setItem("medicalRecordsNotes", JSON.stringify(items));
  }

  async function loadPersonalInfo(userId) {
    const { data, error } = await supabase
      .from("personal_info")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Could not load personal information:", error);
      return;
    }

    if (data) {
      const info = personalFromRow(data);
      setPersonalInfo(info);
      cachePersonal(info);
      return;
    }

    const local = localStorage.getItem("medicalRecordsPersonalInfo");
    if (!local) return;

    try {
      const info = JSON.parse(local);
      const hasData = Object.values(info).some((value) => String(value || "").trim());
      if (!hasData) return;

      const { error: insertError } = await supabase
        .from("personal_info")
        .upsert(personalToRow(info, userId), { onConflict: "user_id" });

      if (insertError) console.error("Could not migrate personal information:", insertError);
    } catch (error) {
      console.error("Could not read cached personal information:", error);
    }
  }

  async function loadInsurance(userId) {
    const { data, error } = await supabase
      .from("insurance_policies")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Could not load insurance:", error);
      return;
    }

    if (data?.length) {
      const items = data.map(insuranceFromRow);
      setInsurancePolicies(items);
      cacheInsurance(items);
      return;
    }

    const local = localStorage.getItem("medicalRecordsInsurance");
    if (!local) {
      setInsurancePolicies([]);
      return;
    }

    try {
      const items = JSON.parse(local);
      if (!Array.isArray(items) || items.length === 0) return;
      const { error: insertError } = await supabase
        .from("insurance_policies")
        .insert(items.map((item) => insuranceToRow(item, userId)));
      if (insertError) console.error("Could not migrate insurance:", insertError);
    } catch (error) {
      console.error("Could not read cached insurance:", error);
    }
  }

  async function loadDoctors(userId) {
    const { data, error } = await supabase
      .from("doctors")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Could not load doctors:", error);
      return;
    }

    if (data?.length) {
      const items = data.map(doctorFromRow);
      setDoctors(items);
      cacheDoctors(items);
      return;
    }

    const local = localStorage.getItem("medicalRecordsDoctors");
    if (!local) {
      setDoctors([]);
      return;
    }

    try {
      const items = JSON.parse(local);
      if (!Array.isArray(items) || items.length === 0) return;
      const { error: insertError } = await supabase
        .from("doctors")
        .insert(items.map((item) => doctorToRow(item, userId)));
      if (insertError) console.error("Could not migrate doctors:", insertError);
    } catch (error) {
      console.error("Could not read cached doctors:", error);
    }
  }

  async function loadSurgeries(userId) {
    const { data, error } = await supabase
      .from("surgeries")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Could not load surgeries:", error);
      return;
    }

    if (data?.length) {
      const items = data.map(surgeryFromRow);
      setSurgeries(items);
      cacheSurgeries(items);
      return;
    }

    const local = localStorage.getItem("medicalRecordsSurgeries");
    if (!local) {
      setSurgeries([]);
      return;
    }

    try {
      const items = JSON.parse(local);
      if (!Array.isArray(items) || items.length === 0) return;
      const { error: insertError } = await supabase
        .from("surgeries")
        .insert(items.map((item) => surgeryToRow(item, userId)));
      if (insertError) console.error("Could not migrate surgeries:", insertError);
    } catch (error) {
      console.error("Could not read cached surgeries:", error);
    }
  }

  async function loadAppointments(userId) {
    const { data, error } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", userId)
      .order("appointment_date", { ascending: true })
      .order("appointment_time", { ascending: true });

    if (error) {
      console.error("Could not load appointments:", error);
      return;
    }

    if (data?.length) {
      const items = data.map(appointmentFromRow);
      setAppointments(items);
      cacheAppointments(items);
      return;
    }

    const local = localStorage.getItem("medicalRecordsAppointments");
    if (!local) {
      setAppointments([]);
      return;
    }

    try {
      const items = JSON.parse(local);
      if (!Array.isArray(items) || items.length === 0) return;
      const { error: insertError } = await supabase
        .from("appointments")
        .insert(items.map((item) => appointmentToRow(item, userId)));
      if (insertError) console.error("Could not migrate appointments:", insertError);
    } catch (error) {
      console.error("Could not read cached appointments:", error);
    }
  }

  async function loadNotes(userId) {
    const { data, error } = await supabase
      .from("notes")
      .select("*")
      .eq("user_id", userId)
      .order("note_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load notes:", error);
      return;
    }

    if (data?.length) {
      const items = data.map(noteFromRow);
      setNotes(items);
      cacheNotes(items);
      return;
    }

    const local = localStorage.getItem("medicalRecordsNotes");
    if (!local) {
      setNotes([]);
      return;
    }

    try {
      const items = JSON.parse(local);
      if (!Array.isArray(items) || items.length === 0) return;
      const { error: insertError } = await supabase
        .from("notes")
        .insert(items.map((item) => noteToRow(item, userId)));
      if (insertError) console.error("Could not migrate notes:", insertError);
    } catch (error) {
      console.error("Could not read cached notes:", error);
    }
  }

  async function loadLabResults(userId) {
    const { data, error } = await supabase
      .from("lab_results")
      .select("*")
      .eq("user_id", userId)
      .order("test_date", { ascending: false });

    if (error) {
      console.error("Could not load lab results:", error);
      return;
    }

    if (data?.length) {
      setLabResults(data.map(labFromRow));
      return;
    }

    try {
      const localLabs = await getAllLabResults();
      localLabs.sort((a, b) => (b.testDate || "").localeCompare(a.testDate || ""));
      setLabResults(localLabs);
    } catch (indexedDbError) {
      console.error("Could not load local lab results:", indexedDbError);
      setLabResults([]);
    }
  }

  async function initializeCloudData(userId) {
    await Promise.all([
      loadPersonalInfo(userId),
      loadInsurance(userId),
      loadDoctors(userId),
      loadSurgeries(userId),
      loadAppointments(userId),
      loadNotes(userId),
      loadLabResults(userId),
    ]);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return undefined;

    initializeCloudData(userId);

    const channel = supabase
      .channel(`medical-records-sync-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "personal_info", filter: `user_id=eq.${userId}` }, () => loadPersonalInfo(userId))
      .on("postgres_changes", { event: "*", schema: "public", table: "insurance_policies", filter: `user_id=eq.${userId}` }, () => loadInsurance(userId))
      .on("postgres_changes", { event: "*", schema: "public", table: "doctors", filter: `user_id=eq.${userId}` }, () => loadDoctors(userId))
      .on("postgres_changes", { event: "*", schema: "public", table: "surgeries", filter: `user_id=eq.${userId}` }, () => loadSurgeries(userId))
      .on("postgres_changes", { event: "*", schema: "public", table: "lab_results", filter: `user_id=eq.${userId}` }, () => loadLabResults(userId))
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments", filter: `user_id=eq.${userId}` }, () => loadAppointments(userId))
      .on("postgres_changes", { event: "*", schema: "public", table: "notes", filter: `user_id=eq.${userId}` }, () => loadNotes(userId))
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id]);

  useEffect(() => {
    if (!saveMessage) return undefined;
    const timer = setTimeout(() => setSaveMessage(""), 2000);
    return () => clearTimeout(timer);
  }, [saveMessage]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoginError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) setLoginError(error.message);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setActiveSection(null);
    setLoginPassword("");
  }

  function goHome() {
    setActiveSection(null);

    setShowInsuranceForm(false);
    setSelectedInsuranceIndex(null);
    setEditingInsuranceIndex(null);
    setShowInsuranceDocument(false);
    setDocumentPolicy(null);
    setInsuranceDocumentMode("manage");

    setShowDoctorForm(false);
    setSelectedDoctorIndex(null);
    setEditingDoctorIndex(null);
    setDoctorForm(emptyDoctor);

    setShowSurgeryForm(false);
    setEditingSurgeryIndex(null);
    setSelectedSurgeryIndex(null);
    setSurgeryForm(emptySurgery);

    setShowLabForm(false);
    setEditingLabId(null);
    setSelectedLabId(null);
    setShowLabDocument(false);
    setDocumentLab(null);
    setLabDocumentMode("manage");

    setAppointmentView("menu");
    setSelectedAppointment(null);
    setEditingAppointmentIndex(null);
    setAppointmentForm({ date: "", time: "", doctor: "", specialty: "", location: "", reason: "", notes: "" });

    setShowNoteForm(false);
    setSelectedNoteIndex(null);
    setEditingNoteIndex(null);
    setShowNoteDocument(false);
    setDocumentNote(null);
    setNoteDocumentMode("manage");
  }

  function handlePersonalChange(event) {
    const { name, value } = event.target;
    setPersonalInfo((current) => ({ ...current, [name]: value }));
  }

  async function savePersonalInfo() {
    const userId = session?.user?.id;
    if (!userId) {
      setSaveMessage("You must be signed in.");
      return;
    }

    const { error } = await supabase
      .from("personal_info")
      .upsert(personalToRow(personalInfo, userId), { onConflict: "user_id" });

    if (error) {
      console.error("Error saving personal information:", error);
      setSaveMessage("Could not save.");
      return;
    }

    cachePersonal(personalInfo);
    setSaveMessage("Saved.");
  }

  const closeSelectedAppointment = () => {
    setSelectedAppointment(null);
    setEditingAppointmentIndex(null);
    setAppointmentForm({
      date: "",
      time: "",
      doctor: "",
      specialty: "",
      location: "",
      reason: "",
      notes: "",
    });
  };

  async function deleteAppointment(appointmentToDelete) {
    if (!window.confirm("Delete this appointment?")) return;

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", appointmentToDelete.id);

    if (error) {
      console.error("Could not delete appointment:", error);
      setSaveMessage("Could not delete appointment.");
      return;
    }

    setAppointments((currentAppointments) => {
      const remainingAppointments = currentAppointments.filter(
        (appointment) => appointment.id !== appointmentToDelete.id
      );
      cacheAppointments(remainingAppointments);
      return remainingAppointments;
    });

    closeSelectedAppointment();
    setSaveMessage("Appointment deleted");
  }

  async function saveAppointment() {
    const userId = session?.user?.id;
    if (!userId) return;

    const editing = editingAppointmentIndex !== null
      ? appointments[editingAppointmentIndex]
      : null;

    let query;
    if (editing?.id) {
      query = supabase
        .from("appointments")
        .update(appointmentToRow(appointmentForm, userId))
        .eq("id", editing.id);
    } else {
      query = supabase
        .from("appointments")
        .insert(appointmentToRow(appointmentForm, userId));
    }

    const { data: savedRows, error } = await query.select("id");
    if (error) {
      console.error("Could not save appointment:", error);
      setSaveMessage("Could not save appointment.");
      return;
    }

    const savedId = editing?.id || savedRows?.[0]?.id;
    let addAnotherDocument = false;
    if (savedId) {
      addAnotherDocument = await uploadPendingDocument(
        userId, "appointment", savedId, "note-documents", `${userId}/appointment-${savedId}`
      );
    }

    const savedAppointment = { ...appointmentForm, id: savedId };

    setAppointmentForm({ date: "", time: "", doctor: "", specialty: "", location: "", reason: "", notes: "" });
    setEditingAppointmentIndex(null);
    setSelectedAppointment(null);
    setAppointmentView("menu");
    setSaveMessage("Saved");
    await loadAppointments(userId);

    if (addAnotherDocument && savedId) {
      setGeneralDocumentTarget({
        kind: "appointment",
        id: savedId,
        heading: "Appointment Documents",
        label: `${formatDate(savedAppointment.date)}${savedAppointment.doctor ? ` - ${savedAppointment.doctor}` : ""}`,
      });
    }
  }

  function handleInsuranceChange(event) {
    const { name, value } = event.target;
    setInsuranceForm((current) => ({ ...current, [name]: value }));
  }

  function addInsurance() {
    clearPendingDocument();
    setInsuranceForm(emptyInsurance);
    setEditingInsuranceIndex(null);
    setSelectedInsuranceIndex(null);
    setShowInsuranceForm(true);
  }

  async function saveInsurance() {
    const userId = session?.user?.id;
    if (!userId) return;

    const editing = editingInsuranceIndex !== null
      ? insurancePolicies[editingInsuranceIndex]
      : null;

    let query;
    if (editing?.id) {
      query = supabase
        .from("insurance_policies")
        .update(insuranceToRow(insuranceForm, userId))
        .eq("id", editing.id);
    } else {
      query = supabase
        .from("insurance_policies")
        .insert(insuranceToRow(insuranceForm, userId));
    }

    const { data: savedRows, error } = await query.select("id");
    if (error) {
      console.error("Could not save insurance:", error);
      setSaveMessage("Could not save insurance.");
      return;
    }

    const savedId = editing?.id || savedRows?.[0]?.id;
    let addAnotherDocument = false;
    if (savedId) {
      addAnotherDocument = await uploadPendingDocument(
        userId, "insurance", savedId, "insurance-documents", `${userId}/${savedId}`
      );
    }

    const savedPolicy = { ...insuranceForm, id: savedId };

    setInsuranceForm(emptyInsurance);
    setEditingInsuranceIndex(null);
    setSelectedInsuranceIndex(null);
    setShowInsuranceForm(false);
    setSaveMessage("Insurance saved");
    await loadInsurance(userId);

    if (addAnotherDocument && savedId) {
      await openInsuranceDocument(savedPolicy);
      setSelectedInsuranceDocument(null);
    }
  }

  function editInsurance(index) {
    setInsuranceForm(insurancePolicies[index]);
    setEditingInsuranceIndex(index);
    setShowInsuranceForm(true);
  }

  async function deleteInsurance(index) {
    if (!window.confirm("Are you sure you want to delete this insurance policy?")) return;

    const policy = insurancePolicies[index];
    const { error } = await supabase.from("insurance_policies").delete().eq("id", policy.id);
    if (error) {
      console.error("Could not delete insurance:", error);
      setSaveMessage("Could not delete insurance.");
      return;
    }

    setInsurancePolicies((currentPolicies) => {
      const remainingPolicies = currentPolicies.filter((item) => item.id !== policy.id);
      cacheInsurance(remainingPolicies);
      return remainingPolicies;
    });
    setSelectedInsuranceIndex(null);
    setEditingInsuranceIndex(null);
    setShowInsuranceForm(false);
    setSaveMessage("Insurance deleted");
  }

  function cancelInsuranceEdit() {
    setInsuranceForm(emptyInsurance);
    setEditingInsuranceIndex(null);
    setShowInsuranceForm(false);
  }


  function displayInsuranceDocumentName(storedName) {
    if (!storedName) return "Document";
    const withoutTimestamp = storedName.replace(/^\d+-/, "");
    const lastDot = withoutTimestamp.lastIndexOf(".");
    const baseName = lastDot > 0 ? withoutTimestamp.slice(0, lastDot) : withoutTimestamp;
    return baseName.replace(/-/g, " ");
  }

  async function loadInsuranceDocuments(policy = documentPolicy) {
    const userId = session?.user?.id;
    if (!userId || !policy?.id) return [];

    const folder = `${userId}/${policy.id}`;
    const { data, error } = await supabase.storage
      .from("insurance-documents")
      .list(folder, { limit: 100, sortBy: { column: "created_at", order: "desc" } });

    if (error) {
      console.error("Could not load insurance documents:", error);
      setSaveMessage("Could not load documents.");
      return [];
    }

    const storedDocuments = (data || [])
      .filter((item) => item.name && item.name !== ".emptyFolderPlaceholder")
      .map((item) => ({
        name: item.name,
        displayName: displayInsuranceDocumentName(item.name),
        path: `${folder}/${item.name}`,
        mimeType: item.metadata?.mimetype || "",
        createdAt: item.created_at || item.updated_at || "",
      }));

    setSavedInsuranceDocuments(storedDocuments);
    setSelectedInsuranceDocument((current) => {
      if (!current) return null;
      return storedDocuments.find((item) => item.path === current.path) || null;
    });
    return storedDocuments;
  }

  async function openInsuranceDocument(policy) {
    const userId = session?.user?.id;
    if (!userId || !policy?.id) return;

    setDocumentPolicy(policy);
    setInsuranceDocumentFile(null);
    setInsuranceDocumentName("");
    setSavedInsuranceDocuments([]);
    setSelectedInsuranceDocument(null);
    setInsuranceDocumentPreviewUrl("");
    setInsuranceDocumentMode("manage");
    setInsuranceDocumentEditName("");
    setAddingNewInsuranceDocument(false);
    setShowInsuranceDocument(true);
    setInsuranceDocumentBusy(true);

    await loadInsuranceDocuments(policy);
    setInsuranceDocumentBusy(false);
  }

  function selectSavedInsuranceDocument(document) {
    if (insuranceDocumentPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(insuranceDocumentPreviewUrl);
    }
    setInsuranceDocumentFile(null);
    setInsuranceDocumentName("");
    setSelectedInsuranceDocument(document);
    setInsuranceDocumentPreviewUrl("");
    setInsuranceDocumentMode("manage");
    setInsuranceDocumentEditName(document.displayName || displayInsuranceDocumentName(document.name));
    setAddingNewInsuranceDocument(false);
  }

  function beginNewInsuranceDocument() {
    if (insuranceDocumentPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(insuranceDocumentPreviewUrl);
    }
    setInsuranceDocumentFile(null);
    setInsuranceDocumentName("");
    setSelectedInsuranceDocument(null);
    setInsuranceDocumentPreviewUrl("");
    setInsuranceDocumentMode("manage");
    setInsuranceDocumentEditName("");
    setAddingNewInsuranceDocument(true);
  }

  function selectInsuranceDocumentFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (insuranceDocumentPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(insuranceDocumentPreviewUrl);
    }

    setInsuranceDocumentFile(file);
    const originalName = file.name || "document";
    const lastDot = originalName.lastIndexOf(".");
    const baseName = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;
    setInsuranceDocumentName(baseName);
    setSelectedInsuranceDocument(null);
    setInsuranceDocumentPreviewUrl("");
    setAddingNewInsuranceDocument(true);
  }

  async function previewInsuranceDocument() {
    if (insuranceDocumentFile) {
      if (insuranceDocumentPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(insuranceDocumentPreviewUrl);
      }
      setInsuranceDocumentPreviewUrl(URL.createObjectURL(insuranceDocumentFile));
      return;
    }

    if (!selectedInsuranceDocument?.path) {
      window.alert("Choose a photo/file or select a saved document first.");
      return;
    }

    setInsuranceDocumentBusy(true);
    const { data, error } = await supabase.storage
      .from("insurance-documents")
      .createSignedUrl(selectedInsuranceDocument.path, 300);

    if (error) {
      console.error("Could not preview insurance document:", error);
      window.alert("The document could not be previewed.");
      setInsuranceDocumentBusy(false);
      return;
    }

    setInsuranceDocumentPreviewUrl(data.signedUrl);
    setInsuranceDocumentBusy(false);
  }

  async function viewInsuranceDocument() {
    if (!selectedInsuranceDocument?.path) {
      window.alert("Select a saved document first.");
      return;
    }

    setInsuranceDocumentBusy(true);
    const { data, error } = await supabase.storage
      .from("insurance-documents")
      .createSignedUrl(selectedInsuranceDocument.path, 300);

    if (error) {
      console.error("Could not view insurance document:", error);
      window.alert("The document could not be viewed.");
      setInsuranceDocumentBusy(false);
      return;
    }

    setInsuranceDocumentPreviewUrl(data.signedUrl);
    setInsuranceDocumentMode("view");
    setInsuranceDocumentBusy(false);
  }

  function closeInsuranceDocumentView() {
    if (insuranceDocumentPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(insuranceDocumentPreviewUrl);
    }
    setInsuranceDocumentPreviewUrl("");
    setInsuranceDocumentMode("manage");
  }

  function beginInsuranceDocumentEdit() {
    if (!selectedInsuranceDocument) {
      window.alert("Select a saved document first.");
      return;
    }
    setInsuranceDocumentEditName(
      selectedInsuranceDocument.displayName ||
      displayInsuranceDocumentName(selectedInsuranceDocument.name)
    );
    setInsuranceDocumentMode("edit");
  }

  async function saveInsuranceDocumentEdit() {
    const userId = session?.user?.id;
    if (!userId || !selectedInsuranceDocument?.path) return;

    const trimmedName = insuranceDocumentEditName.trim();
    if (!trimmedName) {
      window.alert("Please enter a document name.");
      return;
    }

    const oldPath = selectedInsuranceDocument.path;
    const oldFileName = selectedInsuranceDocument.name || oldPath.split("/").pop() || "document";
    const lastDot = oldFileName.lastIndexOf(".");
    const extension = lastDot > 0 ? oldFileName.slice(lastDot) : "";
    const baseWithoutExtension = lastDot > 0 ? oldFileName.slice(0, lastDot) : oldFileName;
    const timestampMatch = baseWithoutExtension.match(/^(\d+)-/);
    const timestamp = timestampMatch ? timestampMatch[1] : String(Date.now());

    const safeName = trimmedName
      .replace(/[^a-zA-Z0-9._ -]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "") || "document";

    const folder = `${userId}/${documentPolicy.id}`;
    const newFileName = `${timestamp}-${safeName}${extension}`;
    const newPath = `${folder}/${newFileName}`;

    if (newPath === oldPath) {
      setInsuranceDocumentMode("manage");
      return;
    }

    setInsuranceDocumentBusy(true);
    const { error } = await supabase.storage
      .from("insurance-documents")
      .move(oldPath, newPath);

    if (error) {
      console.error("Could not rename insurance document:", error);
      window.alert("The document name could not be changed.");
      setInsuranceDocumentBusy(false);
      return;
    }

    const documents = await loadInsuranceDocuments(documentPolicy);
    const renamedDocument = documents.find((item) => item.path === newPath) || null;
    setSelectedInsuranceDocument(renamedDocument);
    setInsuranceDocumentEditName(trimmedName);
    setInsuranceDocumentMode("manage");
    setInsuranceDocumentBusy(false);
    setSaveMessage("Document updated");
  }

  async function saveInsuranceDocument() {
    const userId = session?.user?.id;
    if (!userId || !documentPolicy?.id) return;

    if (!insuranceDocumentFile) {
      if (selectedInsuranceDocument || savedInsuranceDocuments.length > 0) {
        setShowInsuranceDocument(false);
        setInsuranceDocumentPreviewUrl("");
        setDocumentPolicy(null);
        setSaveMessage("Document saved");
        return;
      }
      window.alert("Please take a photo or choose a file first.");
      return;
    }

    const trimmedDocumentName = insuranceDocumentName.trim();
    if (!trimmedDocumentName) {
      window.alert("Please enter a name for this document before saving.");
      return;
    }

    setInsuranceDocumentBusy(true);
    const folder = `${userId}/${documentPolicy.id}`;
    const originalName = insuranceDocumentFile.name || "document";
    const lastDot = originalName.lastIndexOf(".");
    const extension = lastDot > 0 ? originalName.slice(lastDot) : "";
    const safeDocumentName = trimmedDocumentName
      .replace(/[^a-zA-Z0-9._ -]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "") || "document";
    const safeExtension = extension.replace(/[^a-zA-Z0-9.]+/g, "");
    const filePath = `${folder}/${Date.now()}-${safeDocumentName}${safeExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("insurance-documents")
      .upload(filePath, insuranceDocumentFile, {
        cacheControl: "3600",
        contentType: insuranceDocumentFile.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      console.error("Could not save insurance document:", uploadError);
      window.alert("The document could not be saved. Please try again.");
      setInsuranceDocumentBusy(false);
      return;
    }

    if (insuranceDocumentPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(insuranceDocumentPreviewUrl);
    }

    setInsuranceDocumentFile(null);
    setInsuranceDocumentName("");
    setInsuranceDocumentPreviewUrl("");
    setInsuranceDocumentMode("manage");
    setInsuranceDocumentEditName("");
    setAddingNewInsuranceDocument(false);
    setInsuranceDocumentBusy(false);
    setSaveMessage("Document saved");

    const addAnother = window.confirm("Document saved successfully. Do you want to add another document?");
    if (addAnother) {
      await loadInsuranceDocuments(documentPolicy);
      setSelectedInsuranceDocument(null);
      setAddingNewInsuranceDocument(true);
      return;
    }

    closeInsuranceDocument();
  }

  async function deleteInsuranceDocument() {
    if (insuranceDocumentFile) {
      if (insuranceDocumentPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(insuranceDocumentPreviewUrl);
      }
      setInsuranceDocumentFile(null);
      setInsuranceDocumentName("");
      setInsuranceDocumentPreviewUrl("");
      return;
    }

    if (!selectedInsuranceDocument?.path) {
      window.alert("Select a saved document to delete.");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedInsuranceDocument.displayName || selectedInsuranceDocument.name}?`)) return;

    setInsuranceDocumentBusy(true);
    const deletedPath = selectedInsuranceDocument.path;
    const { error } = await supabase.storage
      .from("insurance-documents")
      .remove([deletedPath]);

    if (error) {
      console.error("Could not delete insurance document:", error);
      window.alert("The document could not be deleted.");
      setInsuranceDocumentBusy(false);
      return;
    }

    setInsuranceDocumentPreviewUrl("");
    const remaining = savedInsuranceDocuments.filter((item) => item.path !== deletedPath);
    setSavedInsuranceDocuments(remaining);
    setSelectedInsuranceDocument(remaining[0] || null);
    setInsuranceDocumentBusy(false);
    setSaveMessage("Document deleted");
  }

  function closeInsuranceDocument() {
    if (insuranceDocumentPreviewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(insuranceDocumentPreviewUrl);
    }
    setInsuranceDocumentFile(null);
    setInsuranceDocumentName("");
    setSavedInsuranceDocuments([]);
    setSelectedInsuranceDocument(null);
    setInsuranceDocumentPreviewUrl("");
    setDocumentPolicy(null);
    setShowInsuranceDocument(false);
  }

  function handleDoctorChange(event) {
    const { name, value } = event.target;
    setDoctorForm((current) => ({ ...current, [name]: value }));
  }

  function addDoctor() {
    clearPendingDocument();
    setDoctorForm(emptyDoctor);
    setEditingDoctorIndex(null);
    setSelectedDoctorIndex(null);
    setShowDoctorForm(true);
  }

  async function saveDoctor() {
    const userId = session?.user?.id;
    if (!userId) return;

    const editing = editingDoctorIndex !== null ? doctors[editingDoctorIndex] : null;
    let query;
    if (editing?.id) {
      query = supabase.from("doctors").update(doctorToRow(doctorForm, userId)).eq("id", editing.id);
    } else {
      query = supabase.from("doctors").insert(doctorToRow(doctorForm, userId));
    }

    const { data: savedRows, error } = await query.select("id");
    if (error) {
      console.error("Could not save doctor:", error);
      setSaveMessage("Could not save doctor.");
      return;
    }

    const savedId = editing?.id || savedRows?.[0]?.id;
    let addAnotherDocument = false;
    if (savedId) {
      addAnotherDocument = await uploadPendingDocument(
        userId, "doctor", savedId, "note-documents", `${userId}/doctor-${savedId}`
      );
    }

    const savedDoctor = { ...doctorForm, id: savedId };

    setDoctorForm(emptyDoctor);
    setEditingDoctorIndex(null);
    setSelectedDoctorIndex(null);
    setShowDoctorForm(false);
    setSaveMessage("Doctor saved");
    await loadDoctors(userId);

    if (addAnotherDocument && savedId) {
      setGeneralDocumentTarget({
        kind: "doctor",
        id: savedId,
        heading: "Doctor Documents",
        label: savedDoctor.doctorName || "Doctor",
      });
    }
  }

  function editDoctor(index) {
    setDoctorForm(doctors[index]);
    setEditingDoctorIndex(index);
    setShowDoctorForm(true);
  }

  async function deleteDoctor(index) {
    if (!window.confirm("Are you sure you want to delete this doctor?")) return;

    const doctor = doctors[index];
    const { error } = await supabase.from("doctors").delete().eq("id", doctor.id);
    if (error) {
      console.error("Could not delete doctor:", error);
      setSaveMessage("Could not delete doctor.");
      return;
    }

    setDoctors((currentDoctors) => {
      const remainingDoctors = currentDoctors.filter((item) => item.id !== doctor.id);
      cacheDoctors(remainingDoctors);
      return remainingDoctors;
    });
    setEditingDoctorIndex(null);
    setSelectedDoctorIndex(null);
    setShowDoctorForm(false);
    setSaveMessage("Doctor deleted");
  }

  function cancelDoctorEdit() {
    setDoctorForm(emptyDoctor);
    setEditingDoctorIndex(null);
    setShowDoctorForm(false);
  }

  function handleSurgeryChange(event) {
    const { name, value } = event.target;
    setSurgeryForm((current) => ({ ...current, [name]: value }));
  }

  function addSurgery() {
    clearPendingDocument();
    setSurgeryForm(emptySurgery);
    setEditingSurgeryIndex(null);
    setSelectedSurgeryIndex(null);
    setShowSurgeryForm(true);
  }

  async function saveSurgery() {
    const userId = session?.user?.id;
    if (!userId) return;

    const editing = editingSurgeryIndex !== null ? surgeries[editingSurgeryIndex] : null;
    let query;
    if (editing?.id) {
      query = supabase.from("surgeries").update(surgeryToRow(surgeryForm, userId)).eq("id", editing.id);
    } else {
      query = supabase.from("surgeries").insert(surgeryToRow(surgeryForm, userId));
    }

    const { data: savedRows, error } = await query.select("id");
    if (error) {
      console.error("Could not save surgery:", error);
      setSaveMessage("Could not save surgery.");
      return;
    }

    const savedId = editing?.id || savedRows?.[0]?.id;
    let addAnotherDocument = false;
    if (savedId) {
      addAnotherDocument = await uploadPendingDocument(
        userId, "surgery", savedId, "note-documents", `${userId}/surgery-${savedId}`
      );
    }

    const savedSurgery = { ...surgeryForm, id: savedId };

    setSurgeryForm(emptySurgery);
    setEditingSurgeryIndex(null);
    setShowSurgeryForm(false);
    setSaveMessage("Surgery saved");
    await loadSurgeries(userId);

    if (addAnotherDocument && savedId) {
      setGeneralDocumentTarget({
        kind: "surgery",
        id: savedId,
        heading: "Surgery Documents",
        label: savedSurgery.procedureName || "Surgery",
      });
    }
  }

  function editSurgery(index) {
    setSurgeryForm(surgeries[index]);
    setEditingSurgeryIndex(index);
    setSelectedSurgeryIndex(null);
    setShowSurgeryForm(true);
  }

  async function deleteSurgery(index) {
    if (!window.confirm("Are you sure you want to delete this surgery?")) return;

    const surgery = surgeries[index];
    const { error } = await supabase.from("surgeries").delete().eq("id", surgery.id);
    if (error) {
      console.error("Could not delete surgery:", error);
      setSaveMessage("Could not delete surgery.");
      return;
    }

    setSurgeries((currentSurgeries) => {
      const remainingSurgeries = currentSurgeries.filter((item) => item.id !== surgery.id);
      cacheSurgeries(remainingSurgeries);
      return remainingSurgeries;
    });
    setEditingSurgeryIndex(null);
    setSelectedSurgeryIndex(null);
    setShowSurgeryForm(false);
    setSaveMessage("Surgery deleted");
  }

  function cancelSurgeryEdit() {
    setSurgeryForm(emptySurgery);
    setEditingSurgeryIndex(null);
    setSelectedSurgeryIndex(null);
    setShowSurgeryForm(false);
  }

  function handleLabChange(event) {
    const { name, value } = event.target;
    setLabForm((current) => ({ ...current, [name]: value }));
  }


  function addLabResult() {
    clearPendingDocument();
    setLabForm({ ...emptyLabResult, category: selectedLabCategory || "" });
    setEditingLabId(null);
    setSelectedLabId(null);
    setShowLabForm(true);
    setShowLabSaveChoices(false);
  }

  async function saveLabResult(destinationCategory) {
    const userId = session?.user?.id;
    if (!userId) return;

    if (!labForm.testDate || !labForm.labName) {
      window.alert("Please enter the date and lab / procedure name.");
      return;
    }

    const payload = {
      user_id: userId,
      test_date: normalizeLabDateForStorage(labForm.testDate),
      lab_name: labForm.labName || null,
      category: destinationCategory || labForm.category || selectedLabCategory || null,
    };

    let query;
    if (editingLabId) {
      query = supabase.from("lab_results").update(payload).eq("id", editingLabId);
    } else {
      query = supabase.from("lab_results").insert(payload);
    }

    const { data: savedRows, error: databaseError } = await query.select("id");
    if (databaseError) {
      console.error("Could not save lab result:", databaseError);
      window.alert("The lab / procedure record could not be saved.");
      return;
    }

    const savedId = editingLabId || savedRows?.[0]?.id;
    if (savedId) {
      await uploadPendingDocument(
        userId, "lab", savedId, "lab-documents", `${userId}/${savedId}`, false
      );
    }

    setLabForm(emptyLabResult);
    setEditingLabId(null);
    setShowLabForm(false);
    setShowLabSaveChoices(false);
    setSelectedLabId(null);
    setSelectedLabCategory("");
    setSaveMessage("Lab / procedure record saved");
    await loadLabResults(userId);
  }

  async function moveLabResult(lab, destination) {
    const destinationLabels = {
      blood_work: "Blood Work",
      radiology: "Radiology",
      other: "Other",
    };
    const destinationLabel = destinationLabels[destination] || destination;
    if (!window.confirm(`Move this record to ${destinationLabel}?`)) return;

    const { error } = await supabase
      .from("lab_results")
      .update({ category: destination })
      .eq("id", lab.id);

    if (error) {
      console.error("Could not move lab/procedure record:", error);
      window.alert("The record could not be moved. Make sure the lab_results category database update has been applied.");
      return;
    }

    setShowLabMoveChoices(false);
    setSelectedLabId(null);
    await loadLabResults(session?.user?.id);
    setSaveMessage(`Record moved to ${destinationLabel}`);
  }

  function editLabResult(lab) {
    setShowLabMoveChoices(false);
    setLabForm({
      testDate: lab.testDate,
      labName: lab.labName,
      category: lab.category || "",
    });
    setEditingLabId(lab.id);
    setSelectedLabId(null);
    setShowLabForm(true);
  }

  async function deleteLabResult(id) {
    if (!window.confirm("Are you sure you want to delete this lab result?")) return;

    const { error } = await supabase.from("lab_results").delete().eq("id", id);
    if (error) {
      console.error("Could not delete lab result:", error);
      window.alert("The lab result could not be deleted.");
      return;
    }

    setLabResults((currentResults) => currentResults.filter((item) => item.id !== id));
    setEditingLabId(null);
    setSelectedLabId(null);
    setShowLabForm(false);
    setSaveMessage("Lab result deleted");
  }

  function cancelLabEdit() {
    setLabForm(emptyLabResult);
    setEditingLabId(null);
    setSelectedLabId(null);
    setShowLabForm(false);
    setShowLabSaveChoices(false);
  }


  async function loadLabDocuments(lab = documentLab) {
    const userId = session?.user?.id;
    if (!userId || !lab?.id) return [];

    const folder = `${userId}/${lab.id}`;
    const { data, error } = await supabase.storage
      .from("lab-documents")
      .list(folder, { limit: 100, sortBy: { column: "created_at", order: "desc" } });

    if (error) {
      console.error("Could not load lab documents:", error);
      setSaveMessage("Could not load documents.");
      return [];
    }

    const storedDocuments = (data || [])
      .filter((item) => item.name && item.name !== ".emptyFolderPlaceholder")
      .map((item) => ({
        name: item.name,
        displayName: displayInsuranceDocumentName(item.name),
        path: `${folder}/${item.name}`,
        mimeType: item.metadata?.mimetype || "",
        createdAt: item.created_at || item.updated_at || "",
      }));

    setSavedLabDocuments(storedDocuments);
    setSelectedLabDocument((current) => {
      if (!current) return null;
      return storedDocuments.find((item) => item.path === current.path) || null;
    });
    return storedDocuments;
  }

  async function openLabDocument(lab) {
    const userId = session?.user?.id;
    if (!userId || !lab?.id) return;

    setDocumentLab(lab);
    setLabDocumentFile(null);
    setLabDocumentName("");
    setSavedLabDocuments([]);
    setSelectedLabDocument(null);
    setLabDocumentPreviewUrl("");
    setLabDocumentMode("manage");
    setLabDocumentEditName("");
    setAddingNewLabDocument(false);
    setShowLabDocument(true);
    setLabDocumentBusy(true);
    await loadLabDocuments(lab);
    setLabDocumentBusy(false);
  }

  function selectSavedLabDocument(document) {
    if (labDocumentPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(labDocumentPreviewUrl);
    setLabDocumentFile(null);
    setLabDocumentName("");
    setSelectedLabDocument(document);
    setLabDocumentPreviewUrl("");
    setLabDocumentMode("manage");
    setLabDocumentEditName(document.displayName || displayInsuranceDocumentName(document.name));
    setAddingNewLabDocument(false);
  }

  function beginNewLabDocument() {
    if (labDocumentPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(labDocumentPreviewUrl);
    setLabDocumentFile(null);
    setLabDocumentName("");
    setSelectedLabDocument(null);
    setLabDocumentPreviewUrl("");
    setLabDocumentMode("manage");
    setLabDocumentEditName("");
    setAddingNewLabDocument(true);
  }

  function selectLabDocumentFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (labDocumentPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(labDocumentPreviewUrl);
    setLabDocumentFile(file);
    const originalName = file.name || "document";
    const lastDot = originalName.lastIndexOf(".");
    setLabDocumentName(lastDot > 0 ? originalName.slice(0, lastDot) : originalName);
    setSelectedLabDocument(null);
    setLabDocumentPreviewUrl("");
    setAddingNewLabDocument(true);
  }

  async function previewLabDocument() {
    if (labDocumentFile) {
      if (labDocumentPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(labDocumentPreviewUrl);
      setLabDocumentPreviewUrl(URL.createObjectURL(labDocumentFile));
      return;
    }
    if (!selectedLabDocument?.path) {
      window.alert("Choose a photo/file or select a saved document first.");
      return;
    }
    setLabDocumentBusy(true);
    const { data, error } = await supabase.storage.from("lab-documents").createSignedUrl(selectedLabDocument.path, 300);
    if (error) {
      console.error("Could not preview lab document:", error);
      window.alert("The document could not be previewed.");
      setLabDocumentBusy(false);
      return;
    }
    setLabDocumentPreviewUrl(data.signedUrl);
    setLabDocumentBusy(false);
  }

  async function viewSavedLabDocument() {
    if (!selectedLabDocument?.path) {
      window.alert("Select a saved document first.");
      return;
    }

    setLabDocumentBusy(true);
    const { data, error } = await supabase.storage
      .from("lab-documents")
      .createSignedUrl(selectedLabDocument.path, 300);

    if (error) {
      console.error("Could not view lab document:", error);
      window.alert("The document could not be viewed.");
      setLabDocumentBusy(false);
      return;
    }

    setLabDocumentPreviewUrl(data.signedUrl);
    setLabDocumentMode("view");
    setLabDocumentBusy(false);
  }

  function closeSavedLabDocumentView() {
    if (labDocumentPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(labDocumentPreviewUrl);
    setLabDocumentPreviewUrl("");
    setLabDocumentMode("manage");
  }

  function beginLabDocumentEdit() {
    if (!selectedLabDocument) {
      window.alert("Select a saved document first.");
      return;
    }
    setLabDocumentEditName(
      selectedLabDocument.displayName || displayInsuranceDocumentName(selectedLabDocument.name)
    );
    setLabDocumentMode("edit");
  }

  async function saveLabDocumentEdit() {
    const userId = session?.user?.id;
    if (!userId || !documentLab?.id || !selectedLabDocument?.path) return;

    const trimmedName = labDocumentEditName.trim();
    if (!trimmedName) {
      window.alert("Please enter a document name.");
      return;
    }

    const oldPath = selectedLabDocument.path;
    const oldFileName = selectedLabDocument.name || oldPath.split("/").pop() || "document";
    const lastDot = oldFileName.lastIndexOf(".");
    const extension = lastDot > 0 ? oldFileName.slice(lastDot) : "";
    const baseWithoutExtension = lastDot > 0 ? oldFileName.slice(0, lastDot) : oldFileName;
    const timestampMatch = baseWithoutExtension.match(/^(\d+)-/);
    const timestamp = timestampMatch ? timestampMatch[1] : String(Date.now());
    const safeName = trimmedName
      .replace(/[^a-zA-Z0-9._ -]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "") || "document";

    const folder = `${userId}/${documentLab.id}`;
    const newPath = `${folder}/${timestamp}-${safeName}${extension}`;

    if (newPath === oldPath) {
      setLabDocumentMode("manage");
      return;
    }

    setLabDocumentBusy(true);
    const { error } = await supabase.storage
      .from("lab-documents")
      .move(oldPath, newPath);

    if (error) {
      console.error("Could not rename lab document:", error);
      window.alert("The document name could not be changed.");
      setLabDocumentBusy(false);
      return;
    }

    const documents = await loadLabDocuments(documentLab);
    const renamed = documents.find((item) => item.path === newPath) || null;
    setSelectedLabDocument(renamed);
    setLabDocumentEditName(trimmedName);
    setLabDocumentMode("manage");
    setLabDocumentBusy(false);
    setSaveMessage("Document updated");
  }

  async function saveLabDocument() {
    const userId = session?.user?.id;
    if (!userId || !documentLab?.id) return;
    if (!labDocumentFile) {
      if (selectedLabDocument || savedLabDocuments.length > 0) {
        closeLabDocument();
        setSaveMessage("Document saved");
        return;
      }
      window.alert("Please take a photo or choose a file first.");
      return;
    }
    const trimmedDocumentName = labDocumentName.trim();
    if (!trimmedDocumentName) {
      window.alert("Please enter a name for this document before saving.");
      return;
    }
    setLabDocumentBusy(true);
    const folder = `${userId}/${documentLab.id}`;
    const originalName = labDocumentFile.name || "document";
    const lastDot = originalName.lastIndexOf(".");
    const extension = lastDot > 0 ? originalName.slice(lastDot) : "";
    const safeDocumentName = trimmedDocumentName.replace(/[^a-zA-Z0-9._ -]+/g, "").trim().replace(/\s+/g, "-").replace(/^-+|-+$/g, "") || "document";
    const safeExtension = extension.replace(/[^a-zA-Z0-9.]+/g, "");
    const filePath = `${folder}/${Date.now()}-${safeDocumentName}${safeExtension}`;
    const { error } = await supabase.storage.from("lab-documents").upload(filePath, labDocumentFile, {
      cacheControl: "3600", contentType: labDocumentFile.type || undefined, upsert: false,
    });
    if (error) {
      console.error("Could not save lab document:", error);
      window.alert("The document could not be saved. Please try again.");
      setLabDocumentBusy(false);
      return;
    }
    setLabDocumentFile(null);
    setLabDocumentName("");
    setLabDocumentPreviewUrl("");
    setLabDocumentMode("manage");
    setLabDocumentEditName("");
    setAddingNewLabDocument(false);
    setLabDocumentBusy(false);
    setSaveMessage("Document saved");

    const addAnother = window.confirm("Document saved successfully. Do you want to add another document?");
    if (addAnother) {
      await loadLabDocuments(documentLab);
      setSelectedLabDocument(null);
      setAddingNewLabDocument(true);
      return;
    }

    closeLabDocument();
  }

  async function deleteLabDocument() {
    if (labDocumentFile) {
      if (labDocumentPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(labDocumentPreviewUrl);
      setLabDocumentFile(null); setLabDocumentName(""); setLabDocumentPreviewUrl(""); return;
    }
    if (!selectedLabDocument?.path) { window.alert("Select a saved document to delete."); return; }
    if (!window.confirm(`Are you sure you want to delete ${selectedLabDocument.displayName || selectedLabDocument.name}?`)) return;
    setLabDocumentBusy(true);
    const deletedPath = selectedLabDocument.path;
    const { error } = await supabase.storage.from("lab-documents").remove([deletedPath]);
    if (error) {
      console.error("Could not delete lab document:", error);
      window.alert("The document could not be deleted.");
      setLabDocumentBusy(false); return;
    }
    setLabDocumentPreviewUrl("");
    const remaining = savedLabDocuments.filter((item) => item.path !== deletedPath);
    setSavedLabDocuments(remaining); setSelectedLabDocument(remaining[0] || null);
    setLabDocumentBusy(false); setSaveMessage("Document deleted");
  }

  function closeLabDocument() {
    if (labDocumentPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(labDocumentPreviewUrl);
    setLabDocumentFile(null); setLabDocumentName(""); setSavedLabDocuments([]); setSelectedLabDocument(null);
    setLabDocumentPreviewUrl(""); setLabDocumentMode("manage"); setLabDocumentEditName("");
    setDocumentLab(null); setShowLabDocument(false); setLabDocumentBusy(false);
  }

  async function loadNoteDocuments(note = documentNote) {
    const userId = session?.user?.id;
    if (!userId || !note?.id) return [];
    const folder = `${userId}/${note.id}`;
    const { data, error } = await supabase.storage.from("note-documents")
      .list(folder, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
    if (error) {
      console.error("Could not load note documents:", error);
      setSaveMessage("Could not load documents."); return [];
    }
    const storedDocuments = (data || []).filter((item) => item.name && item.name !== ".emptyFolderPlaceholder").map((item) => ({
      name: item.name, displayName: displayInsuranceDocumentName(item.name), path: `${folder}/${item.name}`,
      mimeType: item.metadata?.mimetype || "", createdAt: item.created_at || item.updated_at || "",
    }));
    setSavedNoteDocuments(storedDocuments);
    setSelectedNoteDocument((current) => {
      if (!current) return null;
      return storedDocuments.find((item) => item.path === current.path) || null;
    });
    return storedDocuments;
  }

  async function openNoteDocument(note) {
    const userId = session?.user?.id;
    if (!userId || !note?.id) return;
    setDocumentNote(note); setNoteDocumentFile(null); setNoteDocumentName(""); setSavedNoteDocuments([]);
    setSelectedNoteDocument(null); setNoteDocumentPreviewUrl(""); setNoteDocumentMode("manage"); setNoteDocumentEditName("");
    setAddingNewNoteDocument(false);
    setShowNoteDocument(true); setNoteDocumentBusy(true);
    await loadNoteDocuments(note); setNoteDocumentBusy(false);
  }

  function selectSavedNoteDocument(document) {
    if (noteDocumentPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(noteDocumentPreviewUrl);
    setNoteDocumentFile(null);
    setNoteDocumentName("");
    setSelectedNoteDocument(document);
    setNoteDocumentPreviewUrl("");
    setNoteDocumentMode("manage");
    setNoteDocumentEditName(document.displayName || displayInsuranceDocumentName(document.name));
    setAddingNewNoteDocument(false);
  }

  function beginNewNoteDocument() {
    if (noteDocumentPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(noteDocumentPreviewUrl);
    setNoteDocumentFile(null);
    setNoteDocumentName("");
    setSelectedNoteDocument(null);
    setNoteDocumentPreviewUrl("");
    setNoteDocumentMode("manage");
    setNoteDocumentEditName("");
    setAddingNewNoteDocument(true);
  }

  function selectNoteDocumentFile(event) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    if (noteDocumentPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(noteDocumentPreviewUrl);
    setNoteDocumentFile(file);
    const originalName = file.name || "document"; const lastDot = originalName.lastIndexOf(".");
    setNoteDocumentName(lastDot > 0 ? originalName.slice(0, lastDot) : originalName);

    // Match the Lab / Procedures behavior: use the filename to pre-fill
    // the Miscellaneous Info note title and date.
    const parsed = parseLabDocumentFilename(originalName);
    const parsedDate = parsed.date
      ? (/^\d{4}-\d{2}$/.test(parsed.date) ? `${parsed.date}-01` : parsed.date)
      : "";
    setNoteForm((current) => ({
      ...current,
      title: parsed.name || current.title,
      date: parsedDate || current.date,
    }));

    setSelectedNoteDocument(null); setNoteDocumentPreviewUrl("");
    setAddingNewNoteDocument(true);
  }

  async function previewNoteDocument() {
    if (noteDocumentFile) {
      if (noteDocumentPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(noteDocumentPreviewUrl);
      setNoteDocumentPreviewUrl(URL.createObjectURL(noteDocumentFile)); return;
    }
    if (!selectedNoteDocument?.path) { window.alert("Choose a photo/file or select a saved document first."); return; }
    setNoteDocumentBusy(true);
    const { data, error } = await supabase.storage.from("note-documents").createSignedUrl(selectedNoteDocument.path, 300);
    if (error) {
      console.error("Could not preview note document:", error); window.alert("The document could not be previewed.");
      setNoteDocumentBusy(false); return;
    }
    setNoteDocumentPreviewUrl(data.signedUrl); setNoteDocumentBusy(false);
  }

  async function viewSavedNoteDocument() {
    if (!selectedNoteDocument?.path) {
      window.alert("Select a saved document first.");
      return;
    }

    setNoteDocumentBusy(true);
    const { data, error } = await supabase.storage
      .from("note-documents")
      .createSignedUrl(selectedNoteDocument.path, 300);

    if (error) {
      console.error("Could not view note document:", error);
      window.alert("The document could not be viewed.");
      setNoteDocumentBusy(false);
      return;
    }

    setNoteDocumentPreviewUrl(data.signedUrl);
    setNoteDocumentMode("view");
    setNoteDocumentBusy(false);
  }

  function closeSavedNoteDocumentView() {
    if (noteDocumentPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(noteDocumentPreviewUrl);
    setNoteDocumentPreviewUrl("");
    setNoteDocumentMode("manage");
  }

  function beginNoteDocumentEdit() {
    if (!selectedNoteDocument) {
      window.alert("Select a saved document first.");
      return;
    }
    setNoteDocumentEditName(
      selectedNoteDocument.displayName || displayInsuranceDocumentName(selectedNoteDocument.name)
    );
    setNoteDocumentMode("edit");
  }

  async function saveNoteDocumentEdit() {
    const userId = session?.user?.id;
    if (!userId || !documentNote?.id || !selectedNoteDocument?.path) return;

    const trimmedName = noteDocumentEditName.trim();
    if (!trimmedName) {
      window.alert("Please enter a document name.");
      return;
    }

    const oldPath = selectedNoteDocument.path;
    const oldFileName = selectedNoteDocument.name || oldPath.split("/").pop() || "document";
    const lastDot = oldFileName.lastIndexOf(".");
    const extension = lastDot > 0 ? oldFileName.slice(lastDot) : "";
    const baseWithoutExtension = lastDot > 0 ? oldFileName.slice(0, lastDot) : oldFileName;
    const timestampMatch = baseWithoutExtension.match(/^(\d+)-/);
    const timestamp = timestampMatch ? timestampMatch[1] : String(Date.now());
    const safeName = trimmedName
      .replace(/[^a-zA-Z0-9._ -]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "") || "document";

    const folder = `${userId}/${documentNote.id}`;
    const newPath = `${folder}/${timestamp}-${safeName}${extension}`;

    if (newPath === oldPath) {
      setNoteDocumentMode("manage");
      return;
    }

    setNoteDocumentBusy(true);
    const { error } = await supabase.storage
      .from("note-documents")
      .move(oldPath, newPath);

    if (error) {
      console.error("Could not rename note document:", error);
      window.alert("The document name could not be changed.");
      setNoteDocumentBusy(false);
      return;
    }

    const documents = await loadNoteDocuments(documentNote);
    const renamed = documents.find((item) => item.path === newPath) || null;
    setSelectedNoteDocument(renamed);
    setNoteDocumentEditName(trimmedName);
    setNoteDocumentMode("manage");
    setNoteDocumentBusy(false);
    setSaveMessage("Document updated");
  }

  async function saveNoteDocument() {
    const userId = session?.user?.id;
    if (!userId || !documentNote?.id) return;
    if (!noteDocumentFile) {
      if (selectedNoteDocument || savedNoteDocuments.length > 0) {
        closeNoteDocument(); setSaveMessage("Document saved"); return;
      }
      window.alert("Please take a photo or choose a file first."); return;
    }
    const trimmedDocumentName = noteDocumentName.trim();
    if (!trimmedDocumentName) { window.alert("Please enter a name for this document before saving."); return; }
    setNoteDocumentBusy(true);
    const folder = `${userId}/${documentNote.id}`;
    const originalName = noteDocumentFile.name || "document"; const lastDot = originalName.lastIndexOf(".");
    const extension = lastDot > 0 ? originalName.slice(lastDot) : "";
    const safeDocumentName = trimmedDocumentName.replace(/[^a-zA-Z0-9._ -]+/g, "").trim().replace(/\s+/g, "-").replace(/^-+|-+$/g, "") || "document";
    const safeExtension = extension.replace(/[^a-zA-Z0-9.]+/g, "");
    const filePath = `${folder}/${Date.now()}-${safeDocumentName}${safeExtension}`;
    const { error } = await supabase.storage.from("note-documents").upload(filePath, noteDocumentFile, {
      cacheControl: "3600", contentType: noteDocumentFile.type || undefined, upsert: false,
    });
    if (error) {
      console.error("Could not save note document:", error); window.alert("The document could not be saved. Please try again.");
      setNoteDocumentBusy(false); return;
    }
    setNoteDocumentFile(null);
    setNoteDocumentName("");
    setNoteDocumentPreviewUrl("");
    setNoteDocumentMode("manage");
    setNoteDocumentEditName("");
    setAddingNewNoteDocument(false);
    setNoteDocumentBusy(false);
    setSaveMessage("Document saved");

    const addAnother = window.confirm("Document saved successfully. Do you want to add another document?");
    if (addAnother) {
      await loadNoteDocuments(documentNote);
      setSelectedNoteDocument(null);
      setAddingNewNoteDocument(true);
      return;
    }

    closeNoteDocument();
  }

  async function deleteNoteDocument() {
    if (noteDocumentFile) {
      if (noteDocumentPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(noteDocumentPreviewUrl);
      setNoteDocumentFile(null); setNoteDocumentName(""); setNoteDocumentPreviewUrl(""); return;
    }
    if (!selectedNoteDocument?.path) { window.alert("Select a saved document to delete."); return; }
    if (!window.confirm(`Are you sure you want to delete ${selectedNoteDocument.displayName || selectedNoteDocument.name}?`)) return;
    setNoteDocumentBusy(true);
    const deletedPath = selectedNoteDocument.path;
    const { error } = await supabase.storage.from("note-documents").remove([deletedPath]);
    if (error) {
      console.error("Could not delete note document:", error); window.alert("The document could not be deleted.");
      setNoteDocumentBusy(false); return;
    }
    setNoteDocumentPreviewUrl("");
    const remaining = savedNoteDocuments.filter((item) => item.path !== deletedPath);
    setSavedNoteDocuments(remaining); setSelectedNoteDocument(remaining[0] || null);
    setNoteDocumentBusy(false); setSaveMessage("Document deleted");
  }

  function closeNoteDocument() {
    if (noteDocumentPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(noteDocumentPreviewUrl);
    setNoteDocumentFile(null); setNoteDocumentName(""); setSavedNoteDocuments([]); setSelectedNoteDocument(null);
    setNoteDocumentPreviewUrl(""); setNoteDocumentMode("manage"); setNoteDocumentEditName("");
    setDocumentNote(null); setShowNoteDocument(false); setNoteDocumentBusy(false);
  }

  function handleNoteChange(event) {
    const { name, value } = event.target;
    setNoteForm((current) => ({ ...current, [name]: value }));
  }

  function addNote() {
    clearPendingDocument();
    setNoteForm(emptyNote);
    setEditingNoteIndex(null);
    setSelectedNoteIndex(null);
    setShowNoteForm(true);
  }

  async function saveNote() {
    const userId = session?.user?.id;
    if (!userId) return;

    if (!noteForm.date || !noteForm.title.trim() || (!noteForm.note.trim() && !(pendingDocumentFile && pendingDocumentKind === "note"))) {
      window.alert("Please enter a date and title, and either a note or a document.");
      return;
    }

    const noteToSave = {
      ...noteForm,
      title: noteForm.title.trim(),
      note: noteForm.note.trim(),
    };

    const editing = editingNoteIndex !== null ? notes[editingNoteIndex] : null;
    let query;
    if (editing?.id) {
      query = supabase.from("notes").update(noteToRow(noteToSave, userId)).eq("id", editing.id);
    } else {
      query = supabase.from("notes").insert(noteToRow(noteToSave, userId));
    }

    const { data: savedRows, error } = await query.select("id");
    if (error) {
      console.error("Could not save note:", error);
      setSaveMessage("Could not save note.");
      return;
    }

    const savedId = editing?.id || savedRows?.[0]?.id;
    let addAnotherDocument = false;
    if (savedId) {
      addAnotherDocument = await uploadPendingDocument(
        userId, "note", savedId, "note-documents", `${userId}/${savedId}`
      );
    }

    const savedNote = { ...noteToSave, id: savedId };

    setNoteForm(emptyNote);
    setEditingNoteIndex(null);
    setShowNoteForm(false);
    setSelectedNoteIndex(null);
    setSaveMessage("Note saved");
    await loadNotes(userId);

    if (addAnotherDocument && savedId) {
      await openNoteDocument(savedNote);
      setSelectedNoteDocument(null);
    }
  }

  function editNote(index) {
    setNoteForm(notes[index]);
    setEditingNoteIndex(index);
    setSelectedNoteIndex(null);
    setShowNoteForm(true);
  }

  async function deleteNote(index) {
    if (!window.confirm("Are you sure you want to delete this note?")) return;

    const note = notes[index];
    const { error } = await supabase.from("notes").delete().eq("id", note.id);
    if (error) {
      console.error("Could not delete note:", error);
      setSaveMessage("Could not delete note.");
      return;
    }

    setNotes((currentNotes) => {
      const remainingNotes = currentNotes.filter((item) => item.id !== note.id);
      cacheNotes(remainingNotes);
      return remainingNotes;
    });
    setSelectedNoteIndex(null);
    setEditingNoteIndex(null);
    setShowNoteForm(false);
    setSaveMessage("Note deleted");
  }

  function cancelNoteEdit() {
    setNoteForm(emptyNote);
    setEditingNoteIndex(null);
    setShowNoteForm(false);
  }

  function closeSelectedNote() {
    setSelectedNoteIndex(null);
  }


  if (generalDocumentTarget) {
    return (
      <GeneralRecordDocuments
        session={session}
        target={generalDocumentTarget}
        onClose={() => {
          const kind = generalDocumentTarget?.kind;
          setGeneralDocumentTarget(null);

          if (kind === "doctor") {
            setSelectedDoctorIndex(null);
            setEditingDoctorIndex(null);
            setShowDoctorForm(false);
          }

          if (kind === "appointment") {
            setSelectedAppointment(null);
            setEditingAppointmentIndex(null);
            setAppointmentView("menu");
          }

          if (kind === "surgery") {
            setEditingSurgeryIndex(null);
            setShowSurgeryForm(false);
          }
        }}
        onSavedMessage={setSaveMessage}
      />
    );
  }

if (authLoading) {
  return (
    <main className="app">
      <h1>My Medical Records</h1>
      <p>Loading...</p>
    </main>
  );
}

if (!session) {
  return (
    <main className="app">
      <h1>My Medical Records</h1>

      <div className="form-card">
        <h2>Sign In</h2>

        <form onSubmit={handleLogin}>
          <label>
            Email
            <input
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              required
            />
          </label>

          <button className="save-button" type="submit">
            Sign In
          </button>
        </form>

        {loginError && (
          <div className="save-message">
            {loginError}
          </div>
        )}
      </div>
    </main>
  );
}
  if (activeSection?.name === "Personal Information") {
    return (
      <main className="app">
        <div className="navigation-buttons">
          <button className="back-button" onClick={() => setActiveSection(null)}>← Back</button>
          <button className="home-button" onClick={goHome}>Main Menu</button>
        </div>

        <h1>Personal Information</h1>

        <div className="form-card">
          <label>
            Full Name
            <input
              name="fullName"
              value={personalInfo.fullName}
              onChange={handlePersonalChange}
            />
          </label>

          <label>
            Date of Birth
            <input
              name="dateOfBirth"
              value={personalInfo.dateOfBirth}
              onChange={handlePersonalChange}
              type="date"
            />
          </label>

          <label>
            Address
            <input
              name="address"
              value={personalInfo.address}
              onChange={handlePersonalChange}
            />
          </label>

          <div className="form-row">
            <label>
              City
              <input
                name="city"
                value={personalInfo.city}
                onChange={handlePersonalChange}
              />
            </label>

            <label>
              State
              <input
                name="state"
                value={personalInfo.state}
                onChange={handlePersonalChange}
              />
            </label>

            <label>
              ZIP Code
              <input
                name="zipCode"
                value={personalInfo.zipCode}
                onChange={handlePersonalChange}
              />
            </label>
          </div>

          <label>
            Phone Number
            <input
              name="phoneNumber"
              value={personalInfo.phoneNumber}
              onChange={handlePersonalChange}
            />
          </label>

          <label>
            Email Address
            <input
              name="emailAddress"
              value={personalInfo.emailAddress}
              onChange={handlePersonalChange}
            />
          </label>

          <label>
            Emergency Contact Name
            <input
              name="emergencyContactName"
              value={personalInfo.emergencyContactName}
              onChange={handlePersonalChange}
            />
          </label>

          <label>
            Emergency Contact Phone Number
            <input
              name="emergencyContactPhone"
              value={personalInfo.emergencyContactPhone}
              onChange={handlePersonalChange}
            />
          </label>

          <label>
            Blood Type
            <input
              name="bloodType"
              value={personalInfo.bloodType}
              onChange={handlePersonalChange}
            />
          </label>

          <label>
            Allergies
            <textarea
              name="allergies"
              value={personalInfo.allergies}
              onChange={handlePersonalChange}
              rows="4"
            />
          </label>

          <button className="save-button" onClick={savePersonalInfo}>
            Save
          </button>

          <button
            className="document-button"
            type="button"
            onClick={() => setGeneralDocumentTarget({
              kind: "personal",
              id: "information",
              heading: "Personal Information Documents",
              label: personalInfo.fullName || "Personal Information",
            })}
          >
            Review Documents
          </button>

          {saveMessage && <div className="save-message">{saveMessage}</div>}
        </div>
      </main>
    );
  }

  if (activeSection?.name === "Insurance Information") {
    if (showInsuranceDocument) {
      const previewType = selectedInsuranceDocument?.mimeType || "";
      const previewName = selectedInsuranceDocument?.name || "";
      const previewIsPdf = previewType === "application/pdf" || previewName.toLowerCase().endsWith(".pdf");

      if (insuranceDocumentMode === "view" && insuranceDocumentPreviewUrl) {
        return (
          <main className="app document-fullscreen-viewer">
            <h1>Saved Documents</h1>
            <p className="document-policy-name">
              {selectedInsuranceDocument?.displayName || selectedInsuranceDocument?.name || "Document"}
            </p>

            <div className="form-card document-card">
              <div className="document-preview">
                {previewIsPdf ? (
                  <iframe
                    src={insuranceDocumentPreviewUrl}
                    title="Insurance document"
                  />
                ) : (
                  <img
                    src={insuranceDocumentPreviewUrl}
                    alt="Insurance document"
                  />
                )}
              </div>

              <div className="document-action-buttons document-view-actions">
                <button
                  className="save-button"
                  onClick={closeInsuranceDocumentView}
                >
                  OK
                </button>
              </div>
            </div>
          </main>
        );
      }

      return (
        <main className="app">
          <div className="navigation-buttons">
            <button className="back-button" onClick={closeInsuranceDocument}>← Back</button>
            <button className="home-button" onClick={goHome}>Main Menu</button>
          </div>

          <h1>Saved Documents</h1>
          <p className="document-policy-name">
            {documentPolicy?.insuranceCompany || "Insurance"}
          </p>

          <div className="form-card document-card">
            {!selectedInsuranceDocument && insuranceDocumentMode !== "edit" && (savedInsuranceDocuments.length === 0 || addingNewInsuranceDocument) && (
              <>
                <div className="document-source-buttons">
                  <label className="document-source-button">
                    Take Photo
                    <input
                      className="document-file-input"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={selectInsuranceDocumentFile}
                    />
                  </label>

                  <label className="document-source-button">
                    Choose File
                    <input
                      className="document-file-input"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={selectInsuranceDocumentFile}
                    />
                  </label>
                </div>

                {insuranceDocumentFile && (
                  <div className="document-selected-file">
                    <span>Selected file:</span>
                    <strong>{insuranceDocumentFile.name}</strong>
                    <label className="document-name-label">
                      Document Name
                      <input
                        type="text"
                        value={insuranceDocumentName}
                        onChange={(event) => setInsuranceDocumentName(event.target.value)}
                        placeholder="Enter a name for this document"
                        disabled={insuranceDocumentBusy}
                      />
                    </label>

                    <div className="document-action-buttons">
                      <button
                        className="edit-button"
                        onClick={previewInsuranceDocument}
                        disabled={insuranceDocumentBusy}
                      >
                        Preview
                      </button>

                      <button
                        className="save-button"
                        onClick={saveInsuranceDocument}
                        disabled={insuranceDocumentBusy}
                      >
                        Save
                      </button>

                      <button
                        className="delete-button"
                        onClick={deleteInsuranceDocument}
                        disabled={insuranceDocumentBusy}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {savedInsuranceDocuments.length > 0 && insuranceDocumentMode !== "edit" && (
              <div className="saved-documents-section">
                {!addingNewInsuranceDocument && <button className="document-source-button" type="button" onClick={beginNewInsuranceDocument} disabled={insuranceDocumentBusy}>+ Add Another Document</button>}
                <h2>Saved Documents</h2>
                <div className="saved-documents-list">
                  {savedInsuranceDocuments.map((document) => (
                    <button
                      type="button"
                      key={document.path}
                      className={`saved-document-item ${
                        selectedInsuranceDocument?.path === document.path ? "selected" : ""
                      }`}
                      onClick={() => selectSavedInsuranceDocument(document)}
                      disabled={insuranceDocumentBusy}
                    >
                      {document.displayName || document.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedInsuranceDocument && insuranceDocumentMode === "manage" && (
              <div className="document-action-buttons saved-document-actions">
                <button
                  className="edit-button"
                  onClick={viewInsuranceDocument}
                  disabled={insuranceDocumentBusy}
                >
                  View
                </button>

                <button
                  className="save-button"
                  onClick={beginInsuranceDocumentEdit}
                  disabled={insuranceDocumentBusy}
                >
                  Edit
                </button>

                <button
                  className="delete-button"
                  onClick={deleteInsuranceDocument}
                  disabled={insuranceDocumentBusy}
                >
                  Delete
                </button>
              </div>
            )}

            {insuranceDocumentMode === "edit" && selectedInsuranceDocument && (
              <div className="document-edit-panel">
                <h2>Edit Document</h2>
                <label className="document-name-label">
                  Document Name
                  <input
                    type="text"
                    value={insuranceDocumentEditName}
                    onChange={(event) => setInsuranceDocumentEditName(event.target.value)}
                    disabled={insuranceDocumentBusy}
                  />
                </label>

                <div className="document-action-buttons">
                  <button
                    className="save-button"
                    onClick={saveInsuranceDocumentEdit}
                    disabled={insuranceDocumentBusy}
                  >
                    Save
                  </button>

                  <button
                    className="cancel-button"
                    onClick={() => setInsuranceDocumentMode("manage")}
                    disabled={insuranceDocumentBusy}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!insuranceDocumentBusy && savedInsuranceDocuments.length === 0 && !insuranceDocumentFile && (
              <p className="document-help-text">No saved documents yet.</p>
            )}

            {insuranceDocumentBusy && <p>Working...</p>}
          </div>
        </main>
      );
    }

    return (
      <main className="app">
        <div className="navigation-buttons">
          <button className="back-button" onClick={() => setActiveSection(null)}>← Back</button>
          <button className="home-button" onClick={goHome}>Main Menu</button>
        </div>

        <h1>Insurance Information</h1>

        {!showInsuranceForm && (
          <button className="add-button" onClick={addInsurance}>
            + Add Insurance
          </button>
        )}

        {!showInsuranceForm && selectedInsuranceIndex === null && (
          <div className="insurance-buttons">
            {insurancePolicies.map((policy, index) => (
              <div className="record-with-document" key={policy.id || index}>
                <button
                  type="button"
                  className="insurance-company-button"
                  onClick={() => setSelectedInsuranceIndex(index)}
                >
                  {policy.insuranceCompany || `Insurance ${index + 1}`}
                </button>
              </div>
            ))}
          </div>
        )}

        {!showInsuranceForm && selectedInsuranceIndex !== null && insurancePolicies[selectedInsuranceIndex] && (() => {
          const policy = insurancePolicies[selectedInsuranceIndex];
          const index = selectedInsuranceIndex;

          return (
            <div className="insurance-card">
              <button
                type="button"
                className="back-button insurance-list-back"
                onClick={() => setSelectedInsuranceIndex(null)}
              >
                ← Insurance List
              </button>

              <h2>{policy.insuranceCompany || `Insurance ${index + 1}`}</h2>

              {policy.planName && <p><strong>Plan:</strong> {policy.planName}</p>}
              {policy.memberId && <p><strong>Member ID:</strong> {policy.memberId}</p>}
              {policy.groupNumber && <p><strong>Group Number:</strong> {policy.groupNumber}</p>}
              {policy.policyholderName && <p><strong>Policyholder:</strong> {policy.policyholderName}</p>}
              {policy.policyholderDob && (
                <p><strong>Policyholder Date of Birth:</strong> {policy.policyholderDob}</p>
              )}
              {policy.notes && <p><strong>Notes:</strong> {policy.notes}</p>}

              <div className="card-actions">
                <button className="edit-button" onClick={() => editInsurance(index)}>
                  Edit
                </button>

                <button className="document-button" onClick={() => openInsuranceDocument(policy)}>
                  Review Documents
                </button>

                <button
                  className="delete-button"
                  onClick={async () => {
                    await deleteInsurance(index);
                    setSelectedInsuranceIndex(null);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })()}

        {showInsuranceForm && (
          <div className="form-card">
            <label>
              Insurance Company
              <input
                name="insuranceCompany"
                value={insuranceForm.insuranceCompany}
                onChange={handleInsuranceChange}
              />
            </label>

            <label>
              Plan Name
              <input
                name="planName"
                value={insuranceForm.planName}
                onChange={handleInsuranceChange}
              />
            </label>

            <label>
              Member ID
              <input
                name="memberId"
                value={insuranceForm.memberId}
                onChange={handleInsuranceChange}
              />
            </label>

            <label>
              Group Number
              <input
                name="groupNumber"
                value={insuranceForm.groupNumber}
                onChange={handleInsuranceChange}
              />
            </label>

            <label>
              Policyholder Name
              <input
                name="policyholderName"
                value={insuranceForm.policyholderName}
                onChange={handleInsuranceChange}
              />
            </label>

            <label>
              Policyholder Date of Birth
              <input
                name="policyholderDob"
                value={insuranceForm.policyholderDob}
                onChange={handleInsuranceChange}
                type="date"
              />
            </label>

            <label>
              Notes
              <textarea
                name="notes"
                value={insuranceForm.notes}
                onChange={handleInsuranceChange}
                rows="4"
              />
            </label>

            <button className="save-button" onClick={saveInsurance}>
              Save Insurance
            </button>

            <button className="cancel-button" onClick={cancelInsuranceEdit}>
              Cancel
            </button>
          </div>
        )}
      </main>
    );
  }

  if (activeSection?.name === "Doctors") {
    const selectedDoctor = selectedDoctorIndex !== null ? doctors[selectedDoctorIndex] : null;

    return (
      <main className="app">
        <div className="navigation-buttons">
          <button
            className="back-button"
            onClick={() => {
              if (showDoctorForm) {
                cancelDoctorEdit();
              } else if (selectedDoctorIndex !== null) {
                setSelectedDoctorIndex(null);
              } else {
                setActiveSection(null);
              }
            }}
          >
            ← Back
          </button>
          <button className="home-button" onClick={goHome}>Main Menu</button>
        </div>

        <h1>Doctors</h1>

        {!showDoctorForm && selectedDoctorIndex === null && (
          <>
            <button className="add-button doctors-add-button" onClick={addDoctor}>
              + Add Doctor
            </button>

            <div className="doctor-buttons">
              {doctors.map((doctor, index) => (
                <div className="record-with-document" key={doctor.id || index}>
                  <button
                    className="doctor-summary-button"
                    onClick={() => setSelectedDoctorIndex(index)}
                  >
                    <span className="doctor-summary-name">
                      {doctor.doctorName || `Doctor ${index + 1}`}
                    </span>
                    <span>{doctor.specialty || "Specialty not entered"}</span>
                    <span>{doctor.phoneNumber || "Phone number not entered"}</span>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {!showDoctorForm && selectedDoctor && (
          <div className="doctor-card doctor-detail-card">
            <h2>{selectedDoctor.doctorName || `Doctor ${selectedDoctorIndex + 1}`}</h2>

            {selectedDoctor.specialty && (
              <p><strong>Specialty:</strong> {selectedDoctor.specialty}</p>
            )}
            {selectedDoctor.officeAddress && (
              <p><strong>Office Address:</strong> {selectedDoctor.officeAddress}</p>
            )}
            {(selectedDoctor.city || selectedDoctor.state || selectedDoctor.zipCode) && (
              <p>
                <strong>City/State/ZIP:</strong>{" "}
                {[selectedDoctor.city, selectedDoctor.state, selectedDoctor.zipCode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            )}
            {selectedDoctor.phoneNumber && (
              <p><strong>Phone Number:</strong> {selectedDoctor.phoneNumber}</p>
            )}

            <button
              className="document-button"
              type="button"
              onClick={() => setGeneralDocumentTarget({
                kind: "doctor",
                id: selectedDoctor.id || selectedDoctorIndex,
                heading: "Doctor Documents",
                label: selectedDoctor.doctorName || `Doctor ${selectedDoctorIndex + 1}`,
              })}
            >
              Review Documents
            </button>

            <div className="card-actions">
              <button className="edit-button" onClick={() => editDoctor(selectedDoctorIndex)}>
                Edit
              </button>
              <button className="delete-button" onClick={() => deleteDoctor(selectedDoctorIndex)}>
                Delete
              </button>
            </div>
          </div>
        )}

        {showDoctorForm && (
          <div className="form-card">
            <label>
              Doctor Name
              <input name="doctorName" value={doctorForm.doctorName} onChange={handleDoctorChange} />
            </label>
            <label>
              Specialty
              <input name="specialty" value={doctorForm.specialty} onChange={handleDoctorChange} />
            </label>
            <label>
              Office Address
              <input name="officeAddress" value={doctorForm.officeAddress} onChange={handleDoctorChange} />
            </label>
            <div className="form-row">
              <label>
                City
                <input name="city" value={doctorForm.city} onChange={handleDoctorChange} />
              </label>
              <label>
                State
                <input name="state" value={doctorForm.state} onChange={handleDoctorChange} />
              </label>
              <label>
                ZIP Code
                <input name="zipCode" value={doctorForm.zipCode} onChange={handleDoctorChange} />
              </label>
            </div>
            <label>
              Phone Number
              <input name="phoneNumber" value={doctorForm.phoneNumber} onChange={handleDoctorChange} />
            </label>

            <button className="save-button" onClick={saveDoctor}>Save Doctor</button>
            <button className="cancel-button" onClick={cancelDoctorEdit}>Cancel</button>
          </div>
        )}
      </main>
    );
  }

  if (activeSection?.name === "Surgeries") {
    return (
      <main className="app">
        <div className="navigation-buttons">
          <button className="back-button" onClick={() => setActiveSection(null)}>← Back</button>
          <button className="home-button" onClick={goHome}>Main Menu</button>
        </div>

        <h1>Surgeries</h1>

        {!showSurgeryForm && selectedSurgeryIndex === null && (
          <button
            className="add-button surgeries-add-button"
            onClick={addSurgery}
          >
            + Add Surgery
          </button>
        )}

        {!showSurgeryForm && selectedSurgeryIndex === null &&
          surgeries.map((surgery, index) => (
            <div
              className="surgery-card clickable"
              key={surgery.id || index}
              onClick={() => setSelectedSurgeryIndex(index)}
            >
              <h2>{surgery.procedureName || `Surgery ${index + 1}`}</h2>
              {surgery.surgeryDate && <p><strong>Date:</strong> {surgery.surgeryDate}</p>}
              {surgery.surgeon && <p><strong>Surgeon:</strong> {surgery.surgeon}</p>}
            </div>
          ))}

        {!showSurgeryForm && selectedSurgeryIndex !== null && surgeries[selectedSurgeryIndex] && (() => {
          const surgery = surgeries[selectedSurgeryIndex];
          const index = selectedSurgeryIndex;
          return (
            <div className="surgery-card surgery-detail-card">
              <button
                type="button"
                className="back-button"
                onClick={() => setSelectedSurgeryIndex(null)}
              >
                ← Surgery List
              </button>
              <h2>{surgery.procedureName || `Surgery ${index + 1}`}</h2>
              {surgery.surgeryDate && <p><strong>Date:</strong> {surgery.surgeryDate}</p>}
              {surgery.surgeon && <p><strong>Surgeon:</strong> {surgery.surgeon}</p>}
              {surgery.facility && <p><strong>Hospital / Facility:</strong> {surgery.facility}</p>}
              {(surgery.city || surgery.state) && (
                <p><strong>Location:</strong>{" "}{[surgery.city, surgery.state].filter(Boolean).join(", ")}</p>
              )}
              {surgery.notes && <p><strong>Notes:</strong> {surgery.notes}</p>}

              <button
                className="document-button"
                type="button"
                onClick={() => setGeneralDocumentTarget({
                  kind: "surgery",
                  id: surgery.id || index,
                  heading: "Surgery Documents",
                  label: surgery.procedureName || `Surgery ${index + 1}`,
                })}
              >
                Review Documents
              </button>

              <div className="card-actions">
                <button className="edit-button" onClick={() => editSurgery(index)}>Edit</button>
                <button className="delete-button" onClick={() => deleteSurgery(index)}>Delete</button>
              </div>
            </div>
          );
        })()}

        {showSurgeryForm && (
          <div className="form-card">
            <label>
              Surgery / Procedure Name
              <input
                name="procedureName"
                value={surgeryForm.procedureName}
                onChange={handleSurgeryChange}
              />
            </label>

            <label>
              Date of Surgery
              <input
                name="surgeryDate"
                value={surgeryForm.surgeryDate}
                onChange={handleSurgeryChange}
                type="date"
              />
            </label>

            <label>
              Surgeon
              <input
                name="surgeon"
                value={surgeryForm.surgeon}
                onChange={handleSurgeryChange}
              />
            </label>

            <label>
              Hospital / Facility
              <input
                name="facility"
                value={surgeryForm.facility}
                onChange={handleSurgeryChange}
              />
            </label>

            <div className="form-row">
              <label>
                City
                <input
                  name="city"
                  value={surgeryForm.city}
                  onChange={handleSurgeryChange}
                />
              </label>

              <label>
                State
                <input
                  name="state"
                  value={surgeryForm.state}
                  onChange={handleSurgeryChange}
                />
              </label>
            </div>

            <label>
              Notes
              <textarea
                name="notes"
                value={surgeryForm.notes}
                onChange={handleSurgeryChange}
                rows="4"
              />
            </label>

            <button className="save-button" onClick={saveSurgery}>
              Save Surgery
            </button>

            <button className="cancel-button" onClick={cancelSurgeryEdit}>
              Cancel
            </button>
          </div>
        )}
      </main>
    );
  }

  if (activeSection?.name === "Lab / Procedures") {
    if (showLabDocument) {
      const previewType = selectedLabDocument?.mimeType || "";
      const previewName = selectedLabDocument?.name || "";
      const previewIsPdf = previewType === "application/pdf" || previewName.toLowerCase().endsWith(".pdf");

      if (labDocumentMode === "view" && labDocumentPreviewUrl) {
        return (
          <main className="app document-fullscreen-viewer">
            <h1>Lab / Procedure Document</h1>
            <p className="document-policy-name">
              {selectedLabDocument?.displayName || selectedLabDocument?.name || "Document"}
            </p>

            <div className="form-card document-card">
              <div className="document-preview">
                {previewIsPdf ? (
                  <iframe src={labDocumentPreviewUrl} title="Lab document" />
                ) : (
                  <img src={labDocumentPreviewUrl} alt="Lab document" />
                )}
              </div>

              <div className="document-action-buttons document-view-actions">
                <button className="save-button" onClick={closeSavedLabDocumentView}>
                  OK
                </button>
              </div>
            </div>
          </main>
        );
      }

      return (
        <main className="app">
          <div className="navigation-buttons">
          <button className="back-button" type="button" onClick={closeLabDocument}>← Back</button>
          <button className="home-button" type="button" onClick={goHome}>Main Menu</button>
        </div>
          <h1>Saved Documents</h1>
          <p className="document-policy-name">{documentLab?.labName || "Lab / Procedure Record"}</p>

          <div className="form-card document-card">
            {!selectedLabDocument && labDocumentMode !== "edit" && (savedLabDocuments.length === 0 || addingNewLabDocument) && (
              <>
                <div className="document-source-buttons">
                  <label className="document-source-button">Take Photo
                    <input className="document-file-input" type="file" accept="image/*" capture="environment" onChange={selectLabDocumentFile} />
                  </label>
                  <label className="document-source-button">Choose File
                    <input className="document-file-input" type="file" accept="image/*,application/pdf" onChange={selectLabDocumentFile} />
                  </label>
                </div>

                {labDocumentFile && (
                  <div className="document-selected-file">
                    <span>Selected file:</span><strong>{labDocumentFile.name}</strong>
                    <label className="document-name-label">Document Name
                      <input type="text" value={labDocumentName} onChange={(event) => setLabDocumentName(event.target.value)} placeholder="Enter a name for this document" disabled={labDocumentBusy} />
                    </label>
                    <div className="document-action-buttons">
                      <button className="edit-button" onClick={previewLabDocument} disabled={labDocumentBusy}>Preview</button>
                      <button className="save-button" onClick={saveLabDocument} disabled={labDocumentBusy}>Save</button>
                      <button className="delete-button" onClick={deleteLabDocument} disabled={labDocumentBusy}>Delete</button>
                    </div>
                  </div>
                )}
              </>
            )}

            {savedLabDocuments.length > 0 && labDocumentMode !== "edit" && (
              <div className="saved-documents-section">
                {!addingNewLabDocument && <button className="document-source-button" type="button" onClick={beginNewLabDocument} disabled={labDocumentBusy}>+ Add Another Document</button>}
                <h2>Saved Documents</h2>
                <div className="saved-documents-list">
                  {savedLabDocuments.map((document) => (
                    <button type="button" key={document.path} className={`saved-document-item ${selectedLabDocument?.path === document.path ? "selected" : ""}`} onClick={() => selectSavedLabDocument(document)} disabled={labDocumentBusy}>
                      {document.displayName || document.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selectedLabDocument && labDocumentMode === "manage" && (
              <div className="document-action-buttons saved-document-actions">
                <button className="edit-button" onClick={viewSavedLabDocument} disabled={labDocumentBusy}>View</button>
                <button className="save-button" onClick={beginLabDocumentEdit} disabled={labDocumentBusy}>Edit</button>
                <button className="delete-button" onClick={deleteLabDocument} disabled={labDocumentBusy}>Delete</button>
              </div>
            )}

            {labDocumentMode === "edit" && selectedLabDocument && (
              <div className="document-edit-panel">
                <h2>Edit Document</h2>
                <label className="document-name-label">Document Name
                  <input type="text" value={labDocumentEditName} onChange={(event) => setLabDocumentEditName(event.target.value)} disabled={labDocumentBusy} />
                </label>
                <div className="document-action-buttons">
                  <button className="save-button" onClick={saveLabDocumentEdit} disabled={labDocumentBusy}>Save</button>
                  <button className="cancel-button" onClick={() => setLabDocumentMode("manage")} disabled={labDocumentBusy}>Cancel</button>
                </div>
              </div>
            )}

            {!labDocumentBusy && savedLabDocuments.length === 0 && !labDocumentFile && (
              <p className="document-help-text">No saved documents yet.</p>
            )}
            {labDocumentBusy && <p>Working...</p>}
          </div>
        </main>
      );
    }

  return (
    <main className="app">
      <div className="navigation-buttons">
        <button className="back-button" type="button" onClick={() => {
          if (showLabMoveChoices && selectedLabId !== null) {
            setShowLabMoveChoices(false);
          } else if (selectedLabId !== null) {
            setSelectedLabId(null);
            setShowLabMoveChoices(false);
          } else if (selectedLabCategory && !showLabForm) {
            setSelectedLabCategory("");
          } else {
            setActiveSection(null);
          }
        }}>← Back</button>
        <button className="home-button" type="button" onClick={goHome}>Main Menu</button>
      </div>

      <h1>Lab / Procedures</h1>

      {!showLabForm && selectedLabId === null && (
        <>
          {!selectedLabCategory && (
            <div className="lab-category-menu">
              <button className="lab-category-button add-button" type="button" onClick={() => setSelectedLabCategory("blood_work")}>Blood Work</button>
              <button className="lab-category-button edit-button" type="button" onClick={() => setSelectedLabCategory("radiology")}>Radiology</button>
              <button className="lab-category-button document-button" type="button" onClick={() => setSelectedLabCategory("other")}>Other</button>
            </div>
          )}


          <h2>
            {selectedLabCategory === "blood_work" ? "Blood Work" :
             selectedLabCategory === "radiology" ? "Radiology" :
             selectedLabCategory === "other" ? "Other" : "Current Lab / Procedure Records"}
          </h2>

          <button className="add-button labs-add-button" type="button" onClick={addLabResult}>
            + Add Record
          </button>
        </>
      )}

      {!showLabForm && selectedLabId === null &&
        labResults.filter((lab) => (selectedLabCategory ? lab.category === selectedLabCategory : !lab.category)).length === 0 && (
          <div className="empty-message">
            {selectedLabCategory ? "No records have been added to this category yet." : "No uncategorized lab / procedure records."}
          </div>
        )}

      {!showLabForm && selectedLabId === null &&
        labResults
          .filter((lab) => (selectedLabCategory ? lab.category === selectedLabCategory : !lab.category))
          .map((lab) => (
            <div className="lab-card clickable" key={lab.id} onClick={() => { setSelectedLabId(lab.id); setShowLabMoveChoices(false); }}>
              <h2>{lab.labName}</h2>
              <p><strong>Date of Test:</strong> {lab.testDate}</p>
              {!selectedLabCategory && (
                <p><strong>Category:</strong> {
                  lab.category === "blood_work" ? "Blood Work" :
                  lab.category === "radiology" ? "Radiology" :
                  lab.category === "other" ? "Other" : "Uncategorized"
                }</p>
              )}
            </div>
          ))}

      {!showLabForm && selectedLabId !== null && (() => {
        const lab = labResults.find((item) => item.id === selectedLabId);
        if (!lab) return null;
        return (
          <div className="lab-card lab-detail-card">
            {showLabMoveChoices ? (
              <div className="lab-move-screen">
                <h2>Where do you want to move this record?</h2>
                <div className="lab-move-buttons">
                  <button className="lab-move-button add-button" type="button" onClick={() => moveLabResult(lab, "blood_work")}>Blood Work</button>
                  <button className="lab-move-button edit-button" type="button" onClick={() => moveLabResult(lab, "radiology")}>Radiology</button>
                  <button className="lab-move-button document-button" type="button" onClick={() => moveLabResult(lab, "other")}>Other</button>
                  <button className="lab-move-button cancel-button" type="button" onClick={() => setShowLabMoveChoices(false)}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <h2>{lab.labName}</h2>
                <p><strong>Date of Test:</strong> {lab.testDate}</p>

                <div className="lab-record-actions">
                  <button className="document-button" type="button" onClick={() => openLabDocument(lab)}>
                    Review Documents
                  </button>
                  <button className="edit-button" type="button" onClick={() => editLabResult(lab)}>
                    Edit
                  </button>
                  <button className="save-button" type="button" onClick={() => setShowLabMoveChoices(true)}>
                    Move
                  </button>
                  <button className="delete-button" type="button" onClick={() => deleteLabResult(lab.id)}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        );
      })()}

      {showLabForm && (
        <div className="form-card">
          <h2>
            {editingLabId ? "Edit Lab / Procedure Record" :
             selectedLabCategory === "blood_work" ? "New Blood Work Record" :
             selectedLabCategory === "radiology" ? "New Radiology Record" :
             selectedLabCategory === "other" ? "New Other Record" : "New Lab / Procedure Record"}
          </h2>
          <label>
            Date of Test
            <input name="testDate" value={labForm.testDate} onChange={handleLabChange} type="text" placeholder="YYYY-MM-DD or YYYY-MM" />
          </label>

          <label>
            Lab / Procedure Name
            <input name="labName" value={labForm.labName} onChange={handleLabChange} type="text" />
          </label>

          {!editingLabId && (
            <>
              {!(pendingDocumentFile && pendingDocumentKind === "lab") && (
                <label className="document-source-button">
                  Add Document
                  <input
                    className="document-file-input"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(event) => selectPendingDocument(event, "lab")}
                  />
                </label>
              )}

              {pendingDocumentFile && pendingDocumentKind === "lab" && (
                <div className="document-selected-file">
                  <span>Selected file:</span>
                  <strong>{pendingDocumentFile.name}</strong>
                  <label className="document-name-label">
                    Document Name
                    <input
                      type="text"
                      value={pendingDocumentName}
                      onChange={(event) => setPendingDocumentName(event.target.value)}
                      placeholder="Enter a name for this document"
                    />
                  </label>
                  <button
                    className="edit-button"
                    type="button"
                    onClick={() => viewPendingDocument("lab")}
                  >
                    View Document
                  </button>
                </div>
              )}
            </>
          )}

          {editingLabId && (
            <button className="document-button" type="button" onClick={() => {
              const lab = labResults.find((item) => item.id === editingLabId);
              if (lab) openLabDocument(lab);
            }}>
              Review Documents
            </button>
          )}

          {!editingLabId && showLabSaveChoices ? (
            <div className="lab-move-screen">
              <h2>Where do you want to save this record?</h2>
              <div className="lab-move-buttons">
                <button className="lab-move-button add-button" type="button" onClick={() => saveLabResult("blood_work")}>Blood Work</button>
                <button className="lab-move-button edit-button" type="button" onClick={() => saveLabResult("radiology")}>Radiology</button>
                <button className="lab-move-button document-button" type="button" onClick={() => saveLabResult("other")}>Other</button>
                <button className="lab-move-button cancel-button" type="button" onClick={() => setShowLabSaveChoices(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              className="save-button"
              type="button"
              onClick={() => {
                if (editingLabId) {
                  saveLabResult();
                } else {
                  if (!labForm.testDate || !labForm.labName) {
                    window.alert("Please enter the date and lab / procedure name.");
                    return;
                  }
                  setShowLabSaveChoices(true);
                }
              }}
            >
              Save Record
            </button>
          )}
          {!showLabSaveChoices && <button className="cancel-button" type="button" onClick={cancelLabEdit}>Cancel</button>}
        </div>
      )}

      {saveMessage && (
        <div className="save-message">
          {saveMessage}
        </div>
      )}
    </main>
  );
}
  
if (activeSection?.name === "Appointments") {
  const todayString = new Date().toLocaleDateString("en-CA");
  const upcomingAppointments = appointments
    .filter((appointment) => appointment.date && appointment.date >= todayString)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || "").localeCompare(b.time || ""));
  const pastAppointments = appointments
    .filter((appointment) => appointment.date && appointment.date < todayString)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.time || "").localeCompare(a.time || ""));

  const appointmentDetails = selectedAppointment && (
    <div className="selected-appointment">
      <h3>Appointment Details</h3>
      <p><strong>Date:</strong> {formatDate(selectedAppointment.date)}</p>
      <p><strong>Time:</strong> {formatTime(selectedAppointment.time)}</p>
      {selectedAppointment.doctor && <p><strong>Doctor / Provider:</strong> {selectedAppointment.doctor}</p>}
      {selectedAppointment.specialty && <p><strong>Specialty:</strong> {selectedAppointment.specialty}</p>}
      {selectedAppointment.location && <p><strong>Location:</strong> {selectedAppointment.location}</p>}
      {selectedAppointment.reason && <p><strong>Reason for Visit:</strong> {selectedAppointment.reason}</p>}
      {selectedAppointment.notes && <p><strong>Notes:</strong> {selectedAppointment.notes}</p>}
      <button
        className="document-button"
        type="button"
        onClick={() => setGeneralDocumentTarget({
          kind: "appointment",
          id: selectedAppointment.id || `${selectedAppointment.date}-${selectedAppointment.time}`,
          heading: "Appointment Documents",
          label: `${formatDate(selectedAppointment.date)}${selectedAppointment.doctor ? ` - ${selectedAppointment.doctor}` : ""}`,
        })}
      >
        Review Documents
      </button>
      <button onClick={() => {
        setAppointmentForm(selectedAppointment);
        setEditingAppointmentIndex(appointments.findIndex((appointment) => appointment.id === selectedAppointment.id));
        setSelectedAppointment(null);
        clearPendingDocument(); setAppointmentView("new");
      }}>Edit</button>
      <button onClick={() => deleteAppointment(selectedAppointment)}>Delete</button>
      <button onClick={closeSelectedAppointment}>Close</button>
    </div>
  );

  const renderAppointmentList = (items, emptyMessage) => (
    <div className="appointment-list">
      {appointmentDetails}
      {items.length === 0 ? (
        <p className="empty">{emptyMessage}</p>
      ) : items.map((appointment) => (
        <div
          key={appointment.id || `${appointment.date}-${appointment.time}-${appointment.doctor}`}
          className="appointment-card clickable"
          onClick={() => setSelectedAppointment(appointment)}
        >
          <p><strong>{formatDate(appointment.date)}</strong> &nbsp; {formatTime(appointment.time)}</p>
          <p>{appointment.doctor}</p>
          <p>{appointment.specialty}</p>
        </div>
      ))}
    </div>
  );

  if (appointmentView === "menu") {
    return (
      <main className="app">
        <div className="navigation-buttons">
          <button className="back-button" onClick={() => setActiveSection(null)}>← Back</button>
          <button className="home-button" onClick={goHome}>Main Menu</button>
        </div>
        <h1>Appointments</h1>
        <div className="appointment-menu">
          <button className="appointment-menu-button appointment-new" onClick={() => {
            closeSelectedAppointment();
            setAppointmentView("new");
          }}>New Appointment</button>
          <button className="appointment-menu-button appointment-upcoming" onClick={() => {
            closeSelectedAppointment();
            setAppointmentView("upcoming");
          }}>Upcoming Appointments</button>
          <button className="appointment-menu-button appointment-past" onClick={() => {
            closeSelectedAppointment();
            setAppointmentView("past");
          }}>Past Appointments</button>
        </div>
      </main>
    );
  }

  if (appointmentView === "new") {
    return (
      <main className="app">
        <div className="navigation-buttons">
          <button className="back-button" onClick={() => { closeSelectedAppointment(); setAppointmentView("menu"); }}>← Back</button>
          <button className="home-button" onClick={goHome}>Main Menu</button>
        </div>
        <h1>{editingAppointmentIndex !== null ? "Edit Appointment" : "New Appointment"}</h1>
        <div className="form-grid">
          <label>Appointment Date</label>
          <input type="date" value={appointmentForm.date} onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })} />
          <label>Appointment Time</label>
          <input type="time" value={appointmentForm.time} onChange={(e) => setAppointmentForm({ ...appointmentForm, time: e.target.value })} />
          <label>Doctor / Provider</label>
          <input type="text" value={appointmentForm.doctor} onChange={(e) => setAppointmentForm({ ...appointmentForm, doctor: e.target.value })} />
          <label>Specialty</label>
          <input type="text" value={appointmentForm.specialty} onChange={(e) => setAppointmentForm({ ...appointmentForm, specialty: e.target.value })} />
          <label>Location</label>
          <input type="text" value={appointmentForm.location} onChange={(e) => setAppointmentForm({ ...appointmentForm, location: e.target.value })} />
          <label>Reason for Visit</label>
          <input type="text" value={appointmentForm.reason} onChange={(e) => setAppointmentForm({ ...appointmentForm, reason: e.target.value })} />
          <label>Notes</label>
          <textarea rows="4" value={appointmentForm.notes} onChange={(e) => setAppointmentForm({ ...appointmentForm, notes: e.target.value })} />
        </div>
        <button onClick={saveAppointment}>
          {editingAppointmentIndex !== null ? "Update Appointment" : "Add Appointment"}
        </button>
        {saveMessage && <div className="save-message">{saveMessage}</div>}
      </main>
    );
  }

  return (
    <main className="app">
      <div className="navigation-buttons">
        <button className="back-button" onClick={() => { closeSelectedAppointment(); setAppointmentView("menu"); }}>← Back</button>
        <button className="home-button" onClick={goHome}>Main Menu</button>
      </div>
      <h1>{appointmentView === "upcoming" ? "Upcoming Appointments" : "Past Appointments"}</h1>
      {appointmentView === "upcoming"
        ? renderAppointmentList(upcomingAppointments, "No upcoming appointments.")
        : renderAppointmentList(pastAppointments, "No past appointments.")}
    </main>
  );
}
if (activeSection?.name === "Miscellaneous Info") {
  if (showNoteDocument) {
    const previewType = selectedNoteDocument?.mimeType || "";
    const previewName = selectedNoteDocument?.name || "";
    const previewIsPdf = previewType === "application/pdf" || previewName.toLowerCase().endsWith(".pdf");

    if (noteDocumentMode === "view" && noteDocumentPreviewUrl) {
      return (
        <main className="app document-fullscreen-viewer">
          <h1>Note Document</h1>
          <p className="document-policy-name">
            {selectedNoteDocument?.displayName || selectedNoteDocument?.name || "Document"}
          </p>

          <div className="form-card document-card">
            <div className="document-preview">
              {previewIsPdf ? (
                <iframe src={noteDocumentPreviewUrl} title="Note document" />
              ) : (
                <img src={noteDocumentPreviewUrl} alt="Note document" />
              )}
            </div>

            <div className="document-action-buttons document-view-actions">
              <button className="save-button" onClick={closeSavedNoteDocumentView}>
                OK
              </button>
            </div>
          </div>
        </main>
      );
    }

    return (
      <main className="app">
        <div className="navigation-buttons">
          <button className="back-button" type="button" onClick={closeNoteDocument}>← Back</button>
          <button className="home-button" type="button" onClick={goHome}>Main Menu</button>
        </div>
        <h1>Saved Documents</h1>
        <p className="document-policy-name">{documentNote?.title || "Note"}</p>

        <div className="form-card document-card">
          {!selectedNoteDocument && noteDocumentMode !== "edit" && (savedNoteDocuments.length === 0 || addingNewNoteDocument) && (
            <>
              <div className="document-source-buttons">
                <label className="document-source-button">Take Photo
                  <input className="document-file-input" type="file" accept="image/*" capture="environment" onChange={selectNoteDocumentFile} />
                </label>
                <label className="document-source-button">Choose File
                  <input className="document-file-input" type="file" accept="image/*,application/pdf" onChange={selectNoteDocumentFile} />
                </label>
              </div>

              {noteDocumentFile && (
                <div className="document-selected-file">
                  <span>Selected file:</span><strong>{noteDocumentFile.name}</strong>
                  <label className="document-name-label">Document Name
                    <input type="text" value={noteDocumentName} onChange={(event) => setNoteDocumentName(event.target.value)} placeholder="Enter a name for this document" disabled={noteDocumentBusy} />
                  </label>
                  <div className="document-action-buttons">
                    <button className="edit-button" onClick={previewNoteDocument} disabled={noteDocumentBusy}>Preview</button>
                    <button className="save-button" onClick={saveNoteDocument} disabled={noteDocumentBusy}>Save</button>
                    <button className="delete-button" onClick={deleteNoteDocument} disabled={noteDocumentBusy}>Delete</button>
                  </div>
                </div>
              )}
            </>
          )}

          {savedNoteDocuments.length > 0 && noteDocumentMode !== "edit" && (
            <div className="saved-documents-section">
              {!addingNewNoteDocument && <button className="document-source-button" type="button" onClick={beginNewNoteDocument} disabled={noteDocumentBusy}>+ Add Another Document</button>}
              <h2>Saved Documents</h2>
              <div className="saved-documents-list">
                {savedNoteDocuments.map((document) => (
                  <button type="button" key={document.path} className={`saved-document-item ${selectedNoteDocument?.path === document.path ? "selected" : ""}`} onClick={() => selectSavedNoteDocument(document)} disabled={noteDocumentBusy}>
                    {document.displayName || document.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedNoteDocument && noteDocumentMode === "manage" && (
            <div className="document-action-buttons saved-document-actions">
              <button className="edit-button" onClick={viewSavedNoteDocument} disabled={noteDocumentBusy}>View</button>
              <button className="save-button" onClick={beginNoteDocumentEdit} disabled={noteDocumentBusy}>Edit</button>
              <button className="delete-button" onClick={deleteNoteDocument} disabled={noteDocumentBusy}>Delete</button>
            </div>
          )}

          {noteDocumentMode === "edit" && selectedNoteDocument && (
            <div className="document-edit-panel">
              <h2>Edit Document</h2>
              <label className="document-name-label">Document Name
                <input type="text" value={noteDocumentEditName} onChange={(event) => setNoteDocumentEditName(event.target.value)} disabled={noteDocumentBusy} />
              </label>
              <div className="document-action-buttons">
                <button className="save-button" onClick={saveNoteDocumentEdit} disabled={noteDocumentBusy}>Save</button>
                <button className="cancel-button" onClick={() => setNoteDocumentMode("manage")} disabled={noteDocumentBusy}>Cancel</button>
              </div>
            </div>
          )}

          {!noteDocumentBusy && savedNoteDocuments.length === 0 && !noteDocumentFile && (
            <p className="document-help-text">No saved documents yet.</p>
          )}
          {noteDocumentBusy && <p>Working...</p>}
        </div>
      </main>
    );
  }

  const sortedNotes = notes
    .map((note, index) => ({ note, index }))
    .sort((a, b) => {
      const dateComparison = (b.note.date || "").localeCompare(a.note.date || "");
      if (dateComparison !== 0) return dateComparison;
      return b.index - a.index;
    });

  const selectedNote =
    selectedNoteIndex !== null ? notes[selectedNoteIndex] : null;

  return (
    <main className="app">
      <div className="navigation-buttons">
        <button className="back-button" onClick={() => setActiveSection(null)}>← Back</button>
        <button className="home-button" onClick={goHome}>Main Menu</button>
      </div>

      <h1>Miscellaneous Info</h1>

      {!showNoteForm && !selectedNote && (
        <button className="add-button" type="button" onClick={addNote}>
          + Add Note
        </button>
      )}

      {!showNoteForm && !selectedNote && notes.length === 0 && (
        <div className="empty-message">
          No notes have been added yet.
        </div>
      )}

      {!showNoteForm && !selectedNote && (
        <div className="notes-grid">
          {sortedNotes.map(({ note, index }) => (
            <div
              className="note-card clickable"
              key={`${note.date}-${note.title}-${index}`}
              onClick={() => setSelectedNoteIndex(index)}
            >
              <p>
                <strong>{formatDate(note.date)}</strong>
              </p>
              <h2>{note.title}</h2>
            </div>
          ))}
        </div>
      )}

      {!showNoteForm && selectedNote && (
        <div className="form-card">
          <h2>Note Details</h2>
          <p>
            <strong>Date:</strong> {formatDate(selectedNote.date)}
          </p>
          <p>
            <strong>Title:</strong> {selectedNote.title}
          </p>
          <p style={{ whiteSpace: "pre-wrap" }}>
            <strong>Note:</strong> {selectedNote.note}
          </p>

          <button
            className="document-button"
            type="button"
            onClick={() => openNoteDocument(selectedNote)}
          >
            Review Documents
          </button>

          <div className="card-actions">
            <button
              className="edit-button"
              type="button"
              onClick={() => editNote(selectedNoteIndex)}
            >
              Edit
            </button>

            <button
              className="delete-button"
              type="button"
              onClick={() => deleteNote(selectedNoteIndex)}
            >
              Delete
            </button>

            <button
              className="cancel-button"
              type="button"
              onClick={closeSelectedNote}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showNoteForm && (
        <div className="form-card">
          <label>
            Date
            <input
              name="date"
              type="date"
              value={noteForm.date}
              onChange={handleNoteChange}
            />
          </label>

          <label>
            Title
            <input
              name="title"
              type="text"
              value={noteForm.title}
              onChange={handleNoteChange}
              placeholder="Short description"
            />
          </label>

          <label>
            Note
            <textarea
              name="note"
              value={noteForm.note}
              onChange={handleNoteChange}
              rows="8"
              placeholder="Enter your note here (optional when adding a document)"
            />
          </label>

          {!editingNoteIndex && (
            <>
              {!(pendingDocumentFile && pendingDocumentKind === "note") && (
                <label className="document-source-button">
                  Add Document
                  <input
                    className="document-file-input"
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(event) => selectPendingDocument(event, "note")}
                  />
                </label>
              )}

              {pendingDocumentFile && pendingDocumentKind === "note" && (
                <div className="document-selected-file">
                  <span>Selected file:</span>
                  <strong>{pendingDocumentFile.name}</strong>
                  <label className="document-name-label">
                    Document Name
                    <input
                      type="text"
                      value={pendingDocumentName}
                      onChange={(event) => setPendingDocumentName(event.target.value)}
                      placeholder="Enter a name for this document"
                    />
                  </label>
                  <button
                    className="edit-button"
                    type="button"
                    onClick={() => viewPendingDocument("note")}
                  >
                    View Document
                  </button>
                </div>
              )}
            </>
          )}

          <button className="save-button" type="button" onClick={saveNote}>
            {editingNoteIndex !== null ? "Update Note" : "Save Note"}
          </button>

          <button className="cancel-button" type="button" onClick={cancelNoteEdit}>
            Cancel
          </button>
        </div>
      )}

      {saveMessage && <div className="save-message">{saveMessage}</div>}
    </main>
  );
}

if (activeSection) {
return (

      <main className="app">
        <div className="navigation-buttons">
          <button className="back-button" onClick={() => setActiveSection(null)}>← Back</button>
          <button className="home-button" onClick={goHome}>Main Menu</button>
        </div>

        <h1>{activeSection.name}</h1>

        <div className={`blank-section ${activeSection.className}`} />
      </main>
    );
  }
return (
  <main className="app">
    <h1>My Medical Records</h1>
    <div className="sections">
      {sections.map((section) => (
        <button  key={section.name}
        className={section.className}
        onClick={() => {
          if (section.name === "Lab / Procedures") {
            setShowLabForm(false);
            setShowLabSaveChoices(false);
            setShowLabMoveChoices(false);
            setSelectedLabId(null);
            setSelectedLabCategory("");
            setEditingLabId(null);
            setLabForm(emptyLabResult);
            clearPendingDocument();
          }
          setActiveSection(section);
        }}
       >
        {section.name}
       </button>
       ))}
        
    </div>

    <button className="cancel-button" type="button" onClick={handleSignOut}>
      Sign Out
    </button>

  </main>
  );
}
  ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
