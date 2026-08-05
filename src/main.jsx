import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./App.css";
import "./styles.css";
const sections = [
  { name: "Personal Information", className: "red" },
  { name: "Insurance Information", className: "orange" },
  { name: "Doctors", className: "yellow" },
  { name: "Surgeries", className: "green" },
  { name: "Lab Results", className: "blue" },
  { name: "Upcoming Appointments", className: "indigo" },
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
  useEffect(() => {
    if (!saveMessage) return;

    const timer = setTimeout(() => {
      setSaveMessage("");
    }, 2000);

    return () => clearTimeout(timer);
  }, [saveMessage]);
useEffect(() => {
  async function loadLabResults() {
    try {
      const savedLabs = await getAllLabResults();

      savedLabs.sort((a, b) =>
        (b.testDate || "").localeCompare(a.testDate || "")
      );

      setLabResults(savedLabs);
    } catch (error) {
      console.error("Could not load lab results:", error);
    }
  }

  loadLabResults();
}, []);
  function handlePersonalChange(event) {
    const { name, value } = event.target;

    setPersonalInfo((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function savePersonalInfo() {
    localStorage.setItem(
      "medicalRecordsPersonalInfo",
      JSON.stringify(personalInfo)
    );

    setSaveMessage("Saved");
  }
function deleteAppointment(appointmentToDelete) {
  if (!window.confirm("Delete this appointment?")) {
  return;
}
  const updatedAppointments = appointments.filter(
    (appointment) => appointment !== appointmentToDelete
  );

  setAppointments(updatedAppointments);

  localStorage.setItem(
    "medicalRecordsAppointments",
    JSON.stringify(updatedAppointments)
  );

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

  setSaveMessage("Appointment deleted");
}
  function saveAppointment() {    
  const updatedAppointments =
  editingAppointmentIndex !== null
    ? appointments.map((appointment, index) =>
        index === editingAppointmentIndex ? appointmentForm : appointment
      )
    : [...appointments, appointmentForm];

  setAppointments(updatedAppointments);

  localStorage.setItem(
    "medicalRecordsAppointments",
    JSON.stringify(updatedAppointments)    
  );
setAppointmentForm({
  date: "",
  time: "",
  doctor: "",
  specialty: "",
  location: "",
  reason: "",
  notes: "",
});
  setEditingAppointmentIndex(null);

  setSaveMessage("Saved");
}

  function handleInsuranceChange(event) {
    const { name, value } = event.target;

    setInsuranceForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function saveInsurancePolicies(updatedPolicies) {
    setInsurancePolicies(updatedPolicies);

    localStorage.setItem(
      "medicalRecordsInsurance",
      JSON.stringify(updatedPolicies)
    );
  }

  function addInsurance() {
    setInsuranceForm(emptyInsurance);
    setEditingInsuranceIndex(null);
    setShowInsuranceForm(true);
  }

  function saveInsurance() {
    let updatedPolicies;

    if (editingInsuranceIndex === null) {
      updatedPolicies = [...insurancePolicies, insuranceForm];
    } else {
      updatedPolicies = insurancePolicies.map((policy, index) =>
        index === editingInsuranceIndex ? insuranceForm : policy
      );
    }

    saveInsurancePolicies(updatedPolicies);
    setInsuranceForm(emptyInsurance);
    setEditingInsuranceIndex(null);
    setShowInsuranceForm(false);
    setSaveMessage("Insurance saved");
  }

  function editInsurance(index) {
    setInsuranceForm(insurancePolicies[index]);
    setEditingInsuranceIndex(index);
    setShowInsuranceForm(true);
  }

  function deleteInsurance(index) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this insurance policy?"
    );

    if (!confirmed) return;

    const updatedPolicies = insurancePolicies.filter(
      (_, policyIndex) => policyIndex !== index
    );

    saveInsurancePolicies(updatedPolicies);
  }

  function cancelInsuranceEdit() {
    setInsuranceForm(emptyInsurance);
    setEditingInsuranceIndex(null);
    setShowInsuranceForm(false);
  }

  function handleDoctorChange(event) {
    const { name, value } = event.target;

    setDoctorForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function saveDoctors(updatedDoctors) {
    setDoctors(updatedDoctors);

    localStorage.setItem(
      "medicalRecordsDoctors",
      JSON.stringify(updatedDoctors)
    );
  }

  function addDoctor() {
    setDoctorForm(emptyDoctor);
    setEditingDoctorIndex(null);
    setShowDoctorForm(true);
  }

  function saveDoctor() {
    let updatedDoctors;

    if (editingDoctorIndex === null) {
      updatedDoctors = [...doctors, doctorForm];
    } else {
      updatedDoctors = doctors.map((doctor, index) =>
        index === editingDoctorIndex ? doctorForm : doctor
      );
    }

    saveDoctors(updatedDoctors);
    setDoctorForm(emptyDoctor);
    setEditingDoctorIndex(null);
    setShowDoctorForm(false);
    setSaveMessage("Doctor saved");
  }

  function editDoctor(index) {
    setDoctorForm(doctors[index]);
    setEditingDoctorIndex(index);
    setShowDoctorForm(true);
  }

  function deleteDoctor(index) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this doctor?"
    );

    if (!confirmed) return;

    const updatedDoctors = doctors.filter(
      (_, doctorIndex) => doctorIndex !== index
    );

    saveDoctors(updatedDoctors);
  }

  function cancelDoctorEdit() {
    setDoctorForm(emptyDoctor);
    setEditingDoctorIndex(null);
    setShowDoctorForm(false);
  }

  function handleSurgeryChange(event) {
    const { name, value } = event.target;

    setSurgeryForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function saveSurgeries(updatedSurgeries) {
    setSurgeries(updatedSurgeries);

    localStorage.setItem(
      "medicalRecordsSurgeries",
      JSON.stringify(updatedSurgeries)
    );
  }

  function addSurgery() {
    setSurgeryForm(emptySurgery);
    setEditingSurgeryIndex(null);
    setShowSurgeryForm(true);
  }

  function saveSurgery() {
    let updatedSurgeries;

    if (editingSurgeryIndex === null) {
      updatedSurgeries = [...surgeries, surgeryForm];
    } else {
      updatedSurgeries = surgeries.map((surgery, index) =>
        index === editingSurgeryIndex ? surgeryForm : surgery
      );
    }

    saveSurgeries(updatedSurgeries);
    setSurgeryForm(emptySurgery);
    setEditingSurgeryIndex(null);
    setShowSurgeryForm(false);
    setSaveMessage("Surgery saved");
  }

  function editSurgery(index) {
    setSurgeryForm(surgeries[index]);
    setEditingSurgeryIndex(index);
    setShowSurgeryForm(true);
  }

  function deleteSurgery(index) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this surgery?"
    );

    if (!confirmed) return;

    const updatedSurgeries = surgeries.filter(
      (_, surgeryIndex) => surgeryIndex !== index
    );

    saveSurgeries(updatedSurgeries);
  }

  function cancelSurgeryEdit() {
    setSurgeryForm(emptySurgery);
    setEditingSurgeryIndex(null);
    setShowSurgeryForm(false);
  }
function handleLabChange(event) {
  const { name, value } = event.target;

  setLabForm((current) => ({
    ...current,
    [name]: value,
  }));
}

function handleLabFileChange(event) {
  const file = event.target.files?.[0] || null;

  if (!file) return;

  setLabForm((current) => ({
    ...current,
    reportFile: file,
  }));
}

function addLabResult() {
  setLabForm(emptyLabResult);
  setEditingLabId(null);
  setShowLabForm(true);
}

async function saveLabResult() {
  if (!labForm.testDate || !labForm.labName) {
    window.alert("Please enter the date of test and lab name.");
    return;
  }

  if (!labForm.reportFile) {
    window.alert("Please attach the lab report.");
    return;
  }

  try {
    const record = {
      testDate: labForm.testDate,
      labName: labForm.labName,
      reportFile: labForm.reportFile,
      fileName: labForm.reportFile.name || "Lab Report",
      fileType: labForm.reportFile.type || "",
    };

    if (editingLabId !== null) {
      record.id = editingLabId;
    }

    await saveLabResultToDatabase(record);

    const updatedLabs = await getAllLabResults();

    updatedLabs.sort((a, b) =>
      (b.testDate || "").localeCompare(a.testDate || "")
    );

    setLabResults(updatedLabs);
    setLabForm(emptyLabResult);
    setEditingLabId(null);
    setShowLabForm(false);
    setSaveMessage("Lab result saved");
  } catch (error) {
    console.error(error);
    window.alert("The lab result could not be saved.");
  }
}

function editLabResult(lab) {
  setLabForm({
    testDate: lab.testDate,
    labName: lab.labName,
    reportFile: lab.reportFile,
  });

  setEditingLabId(lab.id);
  setShowLabForm(true);
}

async function deleteLabResult(id) {
  const confirmed = window.confirm(
    "Are you sure you want to delete this lab result and its attached report?"
  );

  if (!confirmed) return;

  try {
    await deleteLabResultFromDatabase(id);

    setLabResults((current) =>
      current.filter((lab) => lab.id !== id)
    );
  } catch (error) {
    console.error(error);
    window.alert("The lab result could not be deleted.");
  }
}

function cancelLabEdit() {
  setLabForm(emptyLabResult);
  setEditingLabId(null);
  setShowLabForm(false);
}

function viewLabReport(lab) {
  if (!lab.reportFile) {
    window.alert("No report is attached.");
    return;
  }

  const url = URL.createObjectURL(lab.reportFile);
  window.open(url, "_blank");

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60000);
}
  function handleNoteChange(event) {
    const { name, value } = event.target;

    setNoteForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function saveNotes(updatedNotes) {
    setNotes(updatedNotes);
    localStorage.setItem("medicalRecordsNotes", JSON.stringify(updatedNotes));
  }

  function addNote() {
    setNoteForm(emptyNote);
    setEditingNoteIndex(null);
    setSelectedNoteIndex(null);
    setShowNoteForm(true);
  }

  function saveNote() {
    if (!noteForm.date || !noteForm.title.trim() || !noteForm.note.trim()) {
      window.alert("Please enter a date, title, and note.");
      return;
    }

    const noteToSave = {
      ...noteForm,
      title: noteForm.title.trim(),
      note: noteForm.note.trim(),
    };

    const updatedNotes =
      editingNoteIndex === null
        ? [...notes, noteToSave]
        : notes.map((note, index) =>
            index === editingNoteIndex ? noteToSave : note
          );

    saveNotes(updatedNotes);
    setNoteForm(emptyNote);
    setEditingNoteIndex(null);
    setShowNoteForm(false);
    setSaveMessage("Note saved");
  }

  function editNote(index) {
    setNoteForm(notes[index]);
    setEditingNoteIndex(index);
    setSelectedNoteIndex(null);
    setShowNoteForm(true);
  }

  function deleteNote(index) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this note?"
    );

    if (!confirmed) return;

    const updatedNotes = notes.filter((_, noteIndex) => noteIndex !== index);
    saveNotes(updatedNotes);

    if (editingNoteIndex === index) {
      setNoteForm(emptyNote);
      setEditingNoteIndex(null);
      setShowNoteForm(false);
    }

    setSelectedNoteIndex(null);
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

        {!showInsuranceForm &&
          insurancePolicies.map((policy, index) => (
            <div className="insurance-card" key={index}>
              <h2>{policy.insuranceCompany || `Insurance ${index + 1}`}</h2>

              {policy.planName && (
                <p><strong>Plan:</strong> {policy.planName}</p>
              )}

              {policy.memberId && (
                <p><strong>Member ID:</strong> {policy.memberId}</p>
              )}

              {policy.groupNumber && (
                <p><strong>Group Number:</strong> {policy.groupNumber}</p>
              )}

              {policy.policyholderName && (
                <p><strong>Policyholder:</strong> {policy.policyholderName}</p>
              )}

              {policy.policyholderDob && (
                <p>
                  <strong>Policyholder Date of Birth:</strong>{" "}
                  {policy.policyholderDob}
                </p>
              )}

              {policy.notes && (
                <p><strong>Notes:</strong> {policy.notes}</p>
              )}

              <div className="card-actions">
                <button
                  className="edit-button"
                  onClick={() => editInsurance(index)}
                >
                  Edit
                </button>

                <button
                  className="delete-button"
                  onClick={() => deleteInsurance(index)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

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
  
if (activeSection?.name === "Upcoming Appointments") {
  return (
    
      <main className="app">
      <button onClick={() => setActiveSection(null)}>← Back</button>
      <h1>Upcoming Appointments</h1>
      <div className="form-grid">
      <label>Appointment Date</label>
      <input
  type="date"
  value={appointmentForm.date}
  onChange={(e) =>
    setAppointmentForm({
      ...appointmentForm,
      date: e.target.value,
    })
  }
/>
      <label>Appointment Time</label>
      <input
  type="time"
  value={appointmentForm.time}
  onChange={(e) =>
    setAppointmentForm({
      ...appointmentForm,
      time: e.target.value,
    })
  }
/>
      <label>Doctor / Provider</label>
      <input
  type="text"
  value={appointmentForm.doctor}
  onChange={(e) =>
    setAppointmentForm({
      ...appointmentForm,
      doctor: e.target.value,
    })
  }
/>
      <label>Specialty</label>
      <input
  type="text"
  value={appointmentForm.specialty}
  onChange={(e) =>
    setAppointmentForm({
      ...appointmentForm,
      specialty: e.target.value,
    })
  }
/>
      <label>Location</label>
      <input
  type="text"
  value={appointmentForm.location}
  onChange={(e) =>
    setAppointmentForm({
      ...appointmentForm,
      location: e.target.value,
    })
  }
/>
      <label>Reason for Visit</label>
      <input
  type="text"
  value={appointmentForm.reason}
  onChange={(e) =>
    setAppointmentForm({
      ...appointmentForm,
      reason: e.target.value,
    })
  }
/>
      <label>Notes</label>
      <textarea
  rows="4"
  value={appointmentForm.notes}
  onChange={(e) =>
    setAppointmentForm({
      ...appointmentForm,
      notes: e.target.value,
    })
  }
/>
      </div>
      <div className="appointments-columns">
      {appointments.length > 0 && (        
  <div className="appointment-list">
    <h2>Upcoming Appointments</h2>
{selectedAppointment && (
  <div className="selected-appointment">
    <h3>Appointment Details</h3>

   <p><strong>Date:</strong> {formatDate(selectedAppointment.date)}</p>
    <p><strong>Time:</strong> {formatTime(selectedAppointment.time)}</p>

    {selectedAppointment.doctor && (
      <p><strong>Doctor / Provider:</strong> {selectedAppointment.doctor}</p>
    )}

    {selectedAppointment.specialty && (
      <p><strong>Specialty:</strong> {selectedAppointment.specialty}</p>
    )}

    {selectedAppointment.location && (
      <p><strong>Location:</strong> {selectedAppointment.location}</p>
    )}

    {selectedAppointment.reason && (
      <p><strong>Reason for Visit:</strong> {selectedAppointment.reason}</p>
    )}

    {selectedAppointment.notes && (
      <p><strong>Notes:</strong> {selectedAppointment.notes}</p>
    )}
<button
  onClick={() => {
  setAppointmentForm(selectedAppointment);
  setEditingAppointmentIndex(
    appointments.findIndex((appointment) => appointment === selectedAppointment)
  );
}}
>
  Edit
</button>
<button onClick={() => deleteAppointment(selectedAppointment)}>
  Delete
</button>
<button onClick={closeSelectedAppointment}>Close</button>
</div>
)}
{appointments
  .filter((appointment) => {
  if (!appointment.date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const appointmentDate = new Date(`${appointment.date}T00:00:00`);

  return appointmentDate >= today;
})
 .sort((a, b) => {
  const dateComparison = a.date.localeCompare(b.date);

  if (dateComparison !== 0) {
    return dateComparison;
  }

  return (a.time || "").localeCompare(b.time || "");
})
  .map((appointment, index) => (
    <div
      key={index}
      className="appointment-card clickable"
      onClick={() => setSelectedAppointment(appointment)}
    >
       <p><strong>{formatDate(appointment.date)}</strong> &nbsp; {formatTime(appointment.time)}</p>
<p>{appointment.doctor}</p>
<p>{appointment.specialty}</p>
      </div>
    ))}
  </div>
)}
     {appointments.some((appointment) => {
  if (!appointment.date) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const appointmentDate = new Date(`${appointment.date}T00:00:00`);

  return appointmentDate < today;
}) && (
  <div className="appointment-list">
    <h2>Past Appointments</h2>
    {appointments
  .filter((appointment) => {
    if (!appointment.date) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const appointmentDate = new Date(`${appointment.date}T00:00:00`);

    return appointmentDate < today;
  })
  .sort((a, b) => {
    const dateComparison = b.date.localeCompare(a.date);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    return (b.time || "").localeCompare(a.time || "");
  })
  .map((appointment, index) => (
    <div
      key={index}
      className="appointment-card clickable"
      onClick={() => setSelectedAppointment(appointment)}
    >
      <p>
        <strong>{formatDate(appointment.date)}</strong>
        &nbsp; {formatTime(appointment.time)}
      </p>
      <p>{appointment.doctor}</p>
      <p>{appointment.specialty}</p>
    </div>
  ))}
  </div>
)}
</div>
  <button onClick={saveAppointment}>
  {editingAppointmentIndex !== null ? "Update Appointment" : "Add Appointment"}
</button>
      </main>
      );
      }
if (activeSection?.name === "Miscellaneous Notes") {
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


  </main>
  );
}
  ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
