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
  { name: "Lab Results", className: "blue" },
  { name: "Appointments", className: "indigo" },
  { name: "Miscellaneous Notes", className: "violet" },
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
  reportFile: null,
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
function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [activeSection, setActiveSection] = useState(null);
  const [saveMessage, setSaveMessage] = useState("");

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

  const [labResults, setLabResults] = useState([]);
  const [labForm, setLabForm] = useState(emptyLabResult);
  const [editingLabId, setEditingLabId] = useState(null);
  const [showLabForm, setShowLabForm] = useState(false);
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

  function safeDate(value) {
    return value || null;
  }

  function safeTime(value) {
    return value || null;
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
      testDate: row.test_date || "",
      labName: row.lab_name || "",
      fileName: row.file_name || "Lab Report",
      fileType: row.file_type || "",
      storagePath: row.storage_path || "",
      reportFile: null,
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

    const { error } = await query;
    if (error) {
      console.error("Could not save appointment:", error);
      setSaveMessage("Could not save appointment.");
      return;
    }

    setAppointmentForm({ date: "", time: "", doctor: "", specialty: "", location: "", reason: "", notes: "" });
    setEditingAppointmentIndex(null);
    setSelectedAppointment(null);
    setSaveMessage("Saved");
    await loadAppointments(userId);
  }

  function handleInsuranceChange(event) {
    const { name, value } = event.target;
    setInsuranceForm((current) => ({ ...current, [name]: value }));
  }

  function addInsurance() {
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

    const { error } = await query;
    if (error) {
      console.error("Could not save insurance:", error);
      setSaveMessage("Could not save insurance.");
      return;
    }

    setInsuranceForm(emptyInsurance);
    setEditingInsuranceIndex(null);
    setSelectedInsuranceIndex(null);
    setShowInsuranceForm(false);
    setSaveMessage("Insurance saved");
    await loadInsurance(userId);
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
      if (!current) return storedDocuments[0] || null;
      return storedDocuments.find((item) => item.path === current.path) || storedDocuments[0] || null;
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
    setSavedInsuranceDocuments([]);
    setSelectedInsuranceDocument(null);
    setInsuranceDocumentPreviewUrl("");
    setInsuranceDocumentMode("manage");
    setInsuranceDocumentEditName("");
    setDocumentPolicy(null);
    setShowInsuranceDocument(false);
    setInsuranceDocumentBusy(false);
    setSaveMessage("Document saved");
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
    setDoctorForm(emptyDoctor);
    setEditingDoctorIndex(null);
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

    const { error } = await query;
    if (error) {
      console.error("Could not save doctor:", error);
      setSaveMessage("Could not save doctor.");
      return;
    }

    setDoctorForm(emptyDoctor);
    setEditingDoctorIndex(null);
    setShowDoctorForm(false);
    setSaveMessage("Doctor saved");
    await loadDoctors(userId);
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
    setSurgeryForm(emptySurgery);
    setEditingSurgeryIndex(null);
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

    const { error } = await query;
    if (error) {
      console.error("Could not save surgery:", error);
      setSaveMessage("Could not save surgery.");
      return;
    }

    setSurgeryForm(emptySurgery);
    setEditingSurgeryIndex(null);
    setShowSurgeryForm(false);
    setSaveMessage("Surgery saved");
    await loadSurgeries(userId);
  }

  function editSurgery(index) {
    setSurgeryForm(surgeries[index]);
    setEditingSurgeryIndex(index);
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
    setShowSurgeryForm(false);
    setSaveMessage("Surgery deleted");
  }

  function cancelSurgeryEdit() {
    setSurgeryForm(emptySurgery);
    setEditingSurgeryIndex(null);
    setShowSurgeryForm(false);
  }

  function handleLabChange(event) {
    const { name, value } = event.target;
    setLabForm((current) => ({ ...current, [name]: value }));
  }

  function handleLabFileChange(event) {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    setLabForm((current) => ({ ...current, reportFile: file }));
  }

  function addLabResult() {
    setLabForm(emptyLabResult);
    setEditingLabId(null);
    setShowLabForm(true);
  }

  async function saveLabResult() {
    const userId = session?.user?.id;
    if (!userId) return;

    if (!labForm.testDate || !labForm.labName) {
      window.alert("Please enter the date of test and lab name.");
      return;
    }

    if (!labForm.reportFile) {
      window.alert("Please attach the lab report.");
      return;
    }

    const originalName = labForm.reportFile.name || "lab-report";
    const cleanName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `${userId}/${Date.now()}-${cleanName}`;

    const { error: uploadError } = await supabase.storage
      .from("lab-results")
      .upload(storagePath, labForm.reportFile, {
        contentType: labForm.reportFile.type || undefined,
        upsert: false,
      });

    if (uploadError) {
      console.error("Could not upload lab report:", uploadError);
      window.alert("The lab report could not be uploaded. Make sure the lab-results storage bucket has been created.");
      return;
    }

    const payload = {
      user_id: userId,
      test_date: safeDate(labForm.testDate),
      lab_name: labForm.labName || null,
      file_name: originalName,
      file_type: labForm.reportFile.type || null,
      storage_path: storagePath,
    };

    const existing = editingLabId ? labResults.find((lab) => lab.id === editingLabId) : null;
    let query;
    if (editingLabId) {
      query = supabase.from("lab_results").update(payload).eq("id", editingLabId);
    } else {
      query = supabase.from("lab_results").insert(payload);
    }

    const { error: databaseError } = await query;
    if (databaseError) {
      console.error("Could not save lab result:", databaseError);
      await supabase.storage.from("lab-results").remove([storagePath]);
      window.alert("The lab result could not be saved.");
      return;
    }

    if (existing?.storagePath) {
      await supabase.storage.from("lab-results").remove([existing.storagePath]);
    }

    setLabForm(emptyLabResult);
    setEditingLabId(null);
    setShowLabForm(false);
    setSaveMessage("Lab result saved");
    await loadLabResults(userId);
  }

  function editLabResult(lab) {
    setLabForm({
      testDate: lab.testDate,
      labName: lab.labName,
      reportFile: null,
    });
    setEditingLabId(lab.id);
    setShowLabForm(true);
  }

  async function deleteLabResult(id) {
    if (!window.confirm("Are you sure you want to delete this lab result and its attached report?")) return;

    const lab = labResults.find((item) => item.id === id);
    const { error } = await supabase.from("lab_results").delete().eq("id", id);
    if (error) {
      console.error("Could not delete lab result:", error);
      window.alert("The lab result could not be deleted.");
      return;
    }

    if (lab?.storagePath) {
      await supabase.storage.from("lab-results").remove([lab.storagePath]);
    }

    setLabResults((currentResults) => currentResults.filter((item) => item.id !== id));
    setEditingLabId(null);
    setShowLabForm(false);
    setSaveMessage("Lab result deleted");
  }

  function cancelLabEdit() {
    setLabForm(emptyLabResult);
    setEditingLabId(null);
    setShowLabForm(false);
  }

  async function viewLabReport(lab) {
    if (lab.storagePath) {      
      const { data, error } = await supabase.storage
        .from("lab-results")
        .createSignedUrl(lab.storagePath, 60);

      if (error || !data?.signedUrl) {
        console.error("Could not open lab report:", error);
        window.alert("The lab report could not be opened.");
        return;
      }

     window.location.href = data.signedUrl;
      return;
    }

    if (lab.reportFile) {
      const url = URL.createObjectURL(lab.reportFile);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    }

    window.alert("No report is attached.");
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
      if (!current) return storedDocuments[0] || null;
      return storedDocuments.find((item) => item.path === current.path) || storedDocuments[0] || null;
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
    closeLabDocument();
    setSaveMessage("Document saved");
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
      if (!current) return storedDocuments[0] || null;
      return storedDocuments.find((item) => item.path === current.path) || storedDocuments[0] || null;
    });
    return storedDocuments;
  }

  async function openNoteDocument(note) {
    const userId = session?.user?.id;
    if (!userId || !note?.id) return;
    setDocumentNote(note); setNoteDocumentFile(null); setNoteDocumentName(""); setSavedNoteDocuments([]);
    setSelectedNoteDocument(null); setNoteDocumentPreviewUrl(""); setNoteDocumentMode("manage"); setNoteDocumentEditName("");
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
  }

  function selectNoteDocumentFile(event) {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    if (noteDocumentPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(noteDocumentPreviewUrl);
    setNoteDocumentFile(file);
    const originalName = file.name || "document"; const lastDot = originalName.lastIndexOf(".");
    setNoteDocumentName(lastDot > 0 ? originalName.slice(0, lastDot) : originalName);
    setSelectedNoteDocument(null); setNoteDocumentPreviewUrl("");
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
    closeNoteDocument(); setSaveMessage("Document saved");
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
    setNoteForm(emptyNote);
    setEditingNoteIndex(null);
    setSelectedNoteIndex(null);
    setShowNoteForm(true);
  }

  async function saveNote() {
    const userId = session?.user?.id;
    if (!userId) return;

    if (!noteForm.date || !noteForm.title.trim() || !noteForm.note.trim()) {
      window.alert("Please enter a date, title, and note.");
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

    const { error } = await query;
    if (error) {
      console.error("Could not save note:", error);
      setSaveMessage("Could not save note.");
      return;
    }

    setNoteForm(emptyNote);
    setEditingNoteIndex(null);
    setShowNoteForm(false);
    setSelectedNoteIndex(null);
    setSaveMessage("Note saved");
    await loadNotes(userId);
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
        <button className="back-button" onClick={() => setActiveSection(null)}>
          ← Back
        </button>

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
            <h1>Insurance Document</h1>
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
          <button className="back-button" onClick={closeInsuranceDocument}>
            ← Back
          </button>

          <h1>Insurance Document</h1>
          <p className="document-policy-name">
            {documentPolicy?.insuranceCompany || "Insurance"}
          </p>

          <div className="form-card document-card">
            {!selectedInsuranceDocument && insuranceDocumentMode !== "edit" && (
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
                    className="back-button"
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
        <button className="back-button" onClick={() => setActiveSection(null)}>
          ← Back
        </button>

        <h1>Insurance Information</h1>

        {!showInsuranceForm && (
          <button className="add-button" onClick={addInsurance}>
            + Add Insurance
          </button>
        )}

        {!showInsuranceForm && selectedInsuranceIndex === null && (
          <div className="insurance-buttons">
            {insurancePolicies.map((policy, index) => (
              <button
                type="button"
                className="insurance-company-button"
                key={policy.id || index}
                onClick={() => setSelectedInsuranceIndex(index)}
              >
                {policy.insuranceCompany || `Insurance ${index + 1}`}
              </button>
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
                  Document
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
    return (
      <main className="app">
        <button className="back-button" onClick={() => setActiveSection(null)}>
          ← Back
        </button>

        <h1>Doctors</h1>

        {!showDoctorForm && (
          <button className="add-button doctors-add-button" onClick={addDoctor}>
            + Add Doctor
          </button>
        )}

        {!showDoctorForm &&
          doctors.map((doctor, index) => (
            <div className="doctor-card" key={index}>
              <h2>{doctor.doctorName || `Doctor ${index + 1}`}</h2>

              {doctor.specialty && (
                <p><strong>Specialty:</strong> {doctor.specialty}</p>
              )}

              {doctor.officeAddress && (
                <p><strong>Office Address:</strong> {doctor.officeAddress}</p>
              )}

              {(doctor.city || doctor.state || doctor.zipCode) && (
                <p>
                  <strong>City/State/ZIP:</strong>{" "}
                  {[doctor.city, doctor.state, doctor.zipCode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}

              {doctor.phoneNumber && (
                <p><strong>Phone Number:</strong> {doctor.phoneNumber}</p>
              )}

              <div className="card-actions">
                <button
                  className="edit-button"
                  onClick={() => editDoctor(index)}
                >
                  Edit
                </button>

                <button
                  className="delete-button"
                  onClick={() => deleteDoctor(index)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

        {showDoctorForm && (
          <div className="form-card">
            <label>
              Doctor Name
              <input
                name="doctorName"
                value={doctorForm.doctorName}
                onChange={handleDoctorChange}
              />
            </label>

            <label>
              Specialty
              <input
                name="specialty"
                value={doctorForm.specialty}
                onChange={handleDoctorChange}
              />
            </label>

            <label>
              Office Address
              <input
                name="officeAddress"
                value={doctorForm.officeAddress}
                onChange={handleDoctorChange}
              />
            </label>

            <div className="form-row">
              <label>
                City
                <input
                  name="city"
                  value={doctorForm.city}
                  onChange={handleDoctorChange}
                />
              </label>

              <label>
                State
                <input
                  name="state"
                  value={doctorForm.state}
                  onChange={handleDoctorChange}
                />
              </label>

              <label>
                ZIP Code
                <input
                  name="zipCode"
                  value={doctorForm.zipCode}
                  onChange={handleDoctorChange}
                />
              </label>
            </div>

            <label>
              Phone Number
              <input
                name="phoneNumber"
                value={doctorForm.phoneNumber}
                onChange={handleDoctorChange}
              />
            </label>

            <button className="save-button" onClick={saveDoctor}>
              Save Doctor
            </button>

            <button className="cancel-button" onClick={cancelDoctorEdit}>
              Cancel
            </button>
          </div>
        )}
      </main>
    );
  }

  if (activeSection?.name === "Surgeries") {
    return (
      <main className="app">
        <button className="back-button" onClick={() => setActiveSection(null)}>
          ← Back
        </button>

        <h1>Surgeries</h1>

        {!showSurgeryForm && (
          <button
            className="add-button surgeries-add-button"
            onClick={addSurgery}
          >
            + Add Surgery
          </button>
        )}

        {!showSurgeryForm &&
          surgeries.map((surgery, index) => (
            <div className="surgery-card" key={index}>
              <h2>{surgery.procedureName || `Surgery ${index + 1}`}</h2>

              {surgery.surgeryDate && (
                <p><strong>Date:</strong> {surgery.surgeryDate}</p>
              )}

              {surgery.surgeon && (
                <p><strong>Surgeon:</strong> {surgery.surgeon}</p>
              )}

              {surgery.facility && (
                <p><strong>Hospital / Facility:</strong> {surgery.facility}</p>
              )}

              {(surgery.city || surgery.state) && (
                <p>
                  <strong>Location:</strong>{" "}
                  {[surgery.city, surgery.state]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}

              {surgery.notes && (
                <p><strong>Notes:</strong> {surgery.notes}</p>
              )}

              <div className="card-actions">
                <button
                  className="edit-button"
                  onClick={() => editSurgery(index)}
                >
                  Edit
                </button>

                <button
                  className="delete-button"
                  onClick={() => deleteSurgery(index)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

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

  if (activeSection?.name === "Lab Results") {
    if (showLabDocument) {
      const previewType = selectedLabDocument?.mimeType || "";
      const previewName = selectedLabDocument?.name || "";
      const previewIsPdf = previewType === "application/pdf" || previewName.toLowerCase().endsWith(".pdf");

      if (labDocumentMode === "view" && labDocumentPreviewUrl) {
        return (
          <main className="app document-fullscreen-viewer">
            <h1>Lab Document</h1>
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
          <button className="back-button" type="button" onClick={closeLabDocument}>← Back</button>
          <h1>Lab Document</h1>
          <p className="document-policy-name">{documentLab?.labName || "Lab Result"}</p>

          <div className="form-card document-card">
            {!selectedLabDocument && labDocumentMode !== "edit" && (
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
                  <button className="back-button" onClick={() => setLabDocumentMode("manage")} disabled={labDocumentBusy}>Cancel</button>
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
      <button
        className="back-button"
        type="button"
        onClick={() => setActiveSection(null)}
      >
        ← Back
      </button>

      <h1>Lab Results</h1>

      {!showLabForm && (
        <button
          className="add-button labs-add-button"
          type="button"
          onClick={addLabResult}
        >
          + Add Lab Result
        </button>
      )}

      {!showLabForm && labResults.length === 0 && (
        <div className="empty-message">
          No lab results have been added yet.
        </div>
      )}

      {!showLabForm &&
        labResults.map((lab) => (
          <div className="lab-card" key={lab.id}>
            <h2>{lab.labName}</h2>

            <p>
              <strong>Date of Test:</strong> {lab.testDate}
            </p>

            <p>
              <strong>Report:</strong>{" "}
              {lab.fileName || "Attached Lab Report"}
            </p>

            <button
              className="view-report-button"
              type="button"
              onClick={() => viewLabReport(lab)}
            >
              View Report
            </button>

            <button
              className="document-button"
              type="button"
              onClick={() => openLabDocument(lab)}
            >
              Document
            </button>

            <div className="card-actions">
              <button
                className="edit-button"
                type="button"
                onClick={() => editLabResult(lab)}
              >
                Edit / Replace Report
              </button>

              <button
                className="delete-button"
                type="button"
                onClick={() => deleteLabResult(lab.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}

      {showLabForm && (
        <div className="form-card">
          <label>
            Date of Test
            <input
              name="testDate"
              value={labForm.testDate}
              onChange={handleLabChange}
              type="date"
            />
          </label>

          <label>
            Lab Name
            <input
              name="labName"
              value={labForm.labName}
              onChange={handleLabChange}
              type="text"
            />
          </label>

          <label>
            Lab Report
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={handleLabFileChange}
            />
          </label>

          {labForm.reportFile && (
            <div className="selected-file">
              Selected: {labForm.reportFile.name || "Attached report"}
            </div>
          )}

          <button
            className="save-button"
            type="button"
            onClick={saveLabResult}
          >
            Save Lab Result
          </button>

          <button
            className="cancel-button"
            type="button"
            onClick={cancelLabEdit}
          >
            Cancel
          </button>
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
      <button onClick={() => {
        setAppointmentForm(selectedAppointment);
        setEditingAppointmentIndex(appointments.findIndex((appointment) => appointment.id === selectedAppointment.id));
        setSelectedAppointment(null);
        setAppointmentView("new");
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
        <button onClick={() => setActiveSection(null)}>← Back</button>
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
        <button onClick={() => { closeSelectedAppointment(); setAppointmentView("menu"); }}>← Back</button>
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
      <button onClick={() => { closeSelectedAppointment(); setAppointmentView("menu"); }}>← Back</button>
      <h1>{appointmentView === "upcoming" ? "Upcoming Appointments" : "Past Appointments"}</h1>
      {appointmentView === "upcoming"
        ? renderAppointmentList(upcomingAppointments, "No upcoming appointments.")
        : renderAppointmentList(pastAppointments, "No past appointments.")}
    </main>
  );
}
if (activeSection?.name === "Miscellaneous Notes") {
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
        <button className="back-button" type="button" onClick={closeNoteDocument}>← Back</button>
        <h1>Note Document</h1>
        <p className="document-policy-name">{documentNote?.title || "Note"}</p>

        <div className="form-card document-card">
          {!selectedNoteDocument && noteDocumentMode !== "edit" && (
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
                <button className="back-button" onClick={() => setNoteDocumentMode("manage")} disabled={noteDocumentBusy}>Cancel</button>
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
      <button className="back-button" onClick={() => setActiveSection(null)}>
        ← Back
      </button>

      <h1>Miscellaneous Notes</h1>

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
            Document
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
              placeholder="Enter your note here"
            />
          </label>

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
        <button className="back-button" onClick={() => setActiveSection(null)}>
          ← Back
        </button>

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
        onClick={() => setActiveSection(section)}
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
