// sortir.js
import { db } from "./config.js";
import { ref, set, get, update, child, onValue } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Ambil elemen DOM
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const jobTable = document.getElementById("jobTable").getElementsByTagName("tbody")[0];
const bulkAddBtn = document.getElementById("bulkAddBtn");
const modal = document.getElementById("addModal");
const closeModal = document.getElementById("closeModal");
const confirmAdd = document.getElementById("confirmAdd");
const selectAllCheckbox = document.getElementById("selectAll");
const dateOptions = document.getElementById("dateOptions");

// Variabel global
let selectedSingleJob = null;

// Fungsi membaca dan parsing file Excel
function parseExcel(file) {
  const reader = new FileReader();
  alert("Memulai proses upload file...");

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    const firstJob = json[0];
    if (firstJob) {
      alert(`Contoh delivery date dari Excel:\n${firstJob["Delivery Date"]} (type: ${typeof firstJob["Delivery Date"]})`);
    }

    syncJobsToFirebase(json);
  };

  reader.readAsArrayBuffer(file);
}

// Format tanggal
function formatDate(input) {
  if (!input) {
    console.warn("Tanggal kosong atau null:", input);
    return "";
  }

  if (typeof input === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(epoch.getTime() + input * 86400000);
    return formatToCustomDate(date);
  }

  const parsed = new Date(input);
  if (!isNaN(parsed)) {
    return formatToCustomDate(parsed);
  }

  const parts = input.split(/[-/]/);
  if (parts.length >= 2) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = new Date().getFullYear();
    const date = new Date(year, month, day);
    if (!isNaN(date)) {
      return formatToCustomDate(date);
    }
  }

  console.warn("Format tanggal tidak dikenali:", input);
  return input;
}

function formatToCustomDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Simpan ke Firebase
function syncJobsToFirebase(jobs) {
  const debugDiv = document.getElementById("debugLog");
  debugDiv.innerHTML = "<strong>Debug Log:</strong><br>";

  jobs.forEach(job => {
    const jobNo = job["Job No"];
    if (!jobNo) return;

    let rawDate = job["Delivery Date"];
    let formattedDate = formatDate(rawDate);

    debugDiv.innerHTML += `Job: ${jobNo} | Raw Date: ${rawDate} | Formatted: ${formattedDate}<br>`;

    job["Delivery Date"] = formattedDate;

    const jobData = {
      jobNo: job["Job No"] || "",
      deliveryDate: formattedDate,
      deliveryNote: job["Delivery Note"] || "",
      remark: job["Remark"] || "",
      status: job["Status"] || "",
      qty: parseInt(job["Plan Qty"]) || parseInt(job["Qty"]) || 0,
      team: "",
      jobType: ""
    };

    const jobRef = ref(db, "outboundJobs/" + jobNo);
    set(jobRef, jobData);
  });

  alert("Data berhasil diunggah ke Firebase.");
  loadJobsFromFirebase();
}

// Ambil dan tampilkan data dari Firebase
function loadJobsFromFirebase() {
  const jobsRef = ref(db, "outboundJobs");

  onValue(jobsRef, (snapshot) => {
    const data = snapshot.val();
    console.log("Data dari Firebase:", data);
    jobTable.innerHTML = "";

    if (data) {
      Object.values(data).forEach((job) => {
        const row = jobTable.insertRow();
        row.innerHTML = `
          <td><input type="checkbox" data-jobno="${job.jobNo}"></td>
          <td>${job.jobNo}</td>
          <td>${job.deliveryDate}</td>
          <td>${job.deliveryNote}</td>
          <td>${job.remark}</td>
          <td>${job.status}</td>
          <td>${Number(job.qty).toLocaleString()}</td>
          <td>${job.team}</td>
          <td><button class="add-single" data-jobno="${job.jobNo}">Add</button></td>
        `;
      });

      populateDateOptions(Object.values(data));
    }
  });
}

// Buat opsi tanggal unik untuk filter
function populateDateOptions(jobs) {
  const dates = [...new Set(jobs.map(job => job.deliveryDate))].sort();
  dateOptions.innerHTML = `<option value="all">All Dates</option>`;
  dates.forEach(date => {
    const opt = document.createElement("option");
    opt.value = date;
    opt.textContent = date;
    dateOptions.appendChild(opt);
  });
}

// Ambil job yang dipilih
function getSelectedJobs() {
  const checkboxes = document.querySelectorAll("tbody input[type='checkbox']:checked");
  return Array.from(checkboxes).map(cb => cb.getAttribute("data-jobno"));
}

function showModal() {
  modal.style.display = "block";
}

function hideModal() {
  modal.style.display = "none";
}

// Event upload file
uploadBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (file) {
    parseExcel(file);
  } else {
    alert("Pilih file Excel terlebih dahulu.");
  }
});

// Event tombol "Add Selected"
bulkAddBtn.addEventListener("click", () => {
  const selectedJobs = getSelectedJobs();
  if (selectedJobs.length === 0) {
    alert("Pilih minimal satu job terlebih dahulu.");
    return;
  }
  showModal();
});

// Event tombol Add satuan
jobTable.addEventListener("click", (event) => {
  const target = event.target;
  if (target.classList.contains("add-single")) {
    const anyChecked = document.querySelector("tbody input[type='checkbox']:checked");
    if (anyChecked) {
      alert("Harap kosongkan centang sebelum menambahkan job satuan.");
      return;
    }

    const jobNo = target.getAttribute("data-jobno");
    if (jobNo) {
      selectedSingleJob = jobNo;
      showModal();
    }
  }
});

// Konfirmasi modal
confirmAdd.addEventListener("click", () => {
  const team = document.getElementById("teamSelect").value;
  const jobType = document.getElementById("jobTypeSelect").value;

  let jobsToUpdate = [];

  if (selectedSingleJob) {
    jobsToUpdate.push(selectedSingleJob);
  } else {
    jobsToUpdate = getSelectedJobs();
  }

  if (jobsToUpdate.length === 0) {
    alert("Tidak ada job yang dipilih.");
    return;
  }

  jobsToUpdate.forEach((jobNo) => {
    const jobRef = ref(db, "outboundJobs/" + jobNo);
    update(jobRef, { team, jobType });
  });

  alert(`Job berhasil ditambahkan ke team: ${team}`);

  // Reset
  selectedSingleJob = null;
  document.querySelectorAll("tbody input[type='checkbox']").forEach(cb => cb.checked = false);
  hideModal();
});

// Checkbox "select all"
selectAllCheckbox.addEventListener("change", (e) => {
  const checkboxes = document.querySelectorAll("tbody input[type='checkbox']");
  checkboxes.forEach(cb => cb.checked = e.target.checked);
});

// Modal close
closeModal.addEventListener("click", hideModal);
window.addEventListener("click", (event) => {
  if (event.target === modal) {
    hideModal();
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    hideModal();
  }
});

// Load data saat halaman siap
loadJobsFromFirebase();

// Dropdown filter status
const sortStatusBtn = document.getElementById("sortStatusBtn");
const statusDropdown = document.getElementById("statusDropdown");
const statusOptions = document.getElementById("statusOptions");

sortStatusBtn.addEventListener("click", () => {
  statusDropdown.style.display = statusDropdown.style.display === "block" ? "none" : "block";
});

statusOptions.addEventListener("change", () => {
  const selectedStatus = statusOptions.value;
  filterJobsByStatus(selectedStatus);
  statusDropdown.style.display = "none";
});

function filterJobsByStatus(status) {
  const rows = jobTable.querySelectorAll("tr");

  rows.forEach((row) => {
    const statusCell = row.cells[5];
    if (!statusCell) return;
    const jobStatus = statusCell.textContent.trim();
    const match = status === "all" || jobStatus === status;

    row.style.display = match ? "" : "none";
  });
}

function filterJobsByDate(date) {
  const rows = jobTable.querySelectorAll("tr");

  rows.forEach((row) => {
    const dateCell = row.cells[2];
    if (!dateCell) return;
    const jobDate = dateCell.textContent.trim();
    const match = date === "all" || jobDate === date;

    row.style.display = match ? "" : "none";
  });
}
