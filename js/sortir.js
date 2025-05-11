// sortir.js
import { db } from "./config.js";
import { ref, set, get, update, child, onValue } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const jobTable = document.getElementById("jobTable").getElementsByTagName('tbody')[0];
const bulkAddBtn = document.getElementById("bulkAddBtn");
const modal = document.getElementById("selectionModal");
const closeModalBtn = document.getElementById("closeModal");
const submitSelectionBtn = document.getElementById("submitSelection");

const teamSelect = document.getElementById("teamSelect");
const jobTypeSelect = document.getElementById("jobTypeSelect");
const selectAllCheckbox = document.getElementById("selectAll");

function showAlert(message) {
  alert(message);
}

function formatDate(input) {
  if (!input) return "";
  const date = new Date(input);
  const options = { day: '2-digit', month: 'short', year: 'numeric' };
  return date.toLocaleDateString('en-GB', options).replace(/ /g, '-');
}

function parseExcel(file) {
  showAlert("Memulai proses upload...");
  const reader = new FileReader();

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(worksheet);
    syncJobsToFirebase(json);
  };

  reader.readAsArrayBuffer(file);
}

function syncJobsToFirebase(jobs) {
  const updates = {};

  jobs.forEach(job => {
    const jobNo = job["Job No"];
    if (!jobNo) return;

    const jobData = {
      jobNo: job["Job No"] || "",
      deliveryDate: formatDate(job["Delivery Date"]),
      deliveryNote: job["Delivery Note"] || "",
      remark: job["Remark"] || "",
      status: job["Status"] || "",
      qty: job["Plan Qty"] || "",
      team: ""
    };

    updates["outboundJobs/" + jobNo] = jobData;
  });

  update(ref(db), updates)
    .then(() => showAlert("Data berhasil diupload dan diperbarui."))
    .catch((error) => console.error("Upload error: ", error));
}

uploadBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (file) {
    parseExcel(file);
  } else {
    showAlert("Silakan pilih file terlebih dahulu.");
  }
});

function renderJobs(jobs) {
  jobTable.innerHTML = "";
  jobs.forEach(job => {
    const row = jobTable.insertRow();

    const checkboxCell = row.insertCell(0);
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.classList.add("rowCheckbox");
    checkbox.dataset.jobNo = job.jobNo;
    checkboxCell.appendChild(checkbox);

    row.insertCell(1).textContent = job.jobNo;
    row.insertCell(2).textContent = job.deliveryDate;
    row.insertCell(3).textContent = job.deliveryNote;
    row.insertCell(4).textContent = job.remark;
    row.insertCell(5).textContent = job.status;
    row.insertCell(6).textContent = job.qty;
    row.insertCell(7).textContent = job.team;

    const actionCell = row.insertCell(8);
    const addBtn = document.createElement("button");
    addBtn.textContent = "Add";
    addBtn.classList.add("action-btn");
    actionCell.appendChild(addBtn);
  });
}

function loadJobs() {
  const jobsRef = ref(db, "outboundJobs");
  onValue(jobsRef, (snapshot) => {
    const data = snapshot.val();
    const jobs = data ? Object.values(data) : [];
    renderJobs(jobs);
  });
}

bulkAddBtn.addEventListener("click", () => {
  modal.style.display = "block";
});

closeModalBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

submitSelectionBtn.addEventListener("click", () => {
  const selectedTeam = teamSelect.value;
  const selectedJobType = jobTypeSelect.value;

  const selectedCheckboxes = document.querySelectorAll(".rowCheckbox:checked");

  selectedCheckboxes.forEach(cb => {
    const jobNo = cb.dataset.jobNo;
    const jobRef = ref(db, "outboundJobs/" + jobNo);

    update(jobRef, {
      team: selectedTeam,
      jobType: selectedJobType
    });
  });

  modal.style.display = "none";
  showAlert("Job berhasil ditambahkan ke " + selectedTeam);
});

selectAllCheckbox.addEventListener("change", function () {
  const checkboxes = document.querySelectorAll(".rowCheckbox");
  checkboxes.forEach(cb => cb.checked = this.checked);
});

loadJobs();
