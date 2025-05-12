// sortir.js
import { db } from "./config.js";
import {
  ref,
  set,
  get,
  update,
  child,
  onValue
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Ambil elemen DOM
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const jobTable = document.getElementById("jobTable").getElementsByTagName("tbody")[0];
const bulkAddBtn = document.getElementById("bulkAddBtn");
const modal = document.getElementById("addModal");
const closeModal = document.getElementById("closeModal");
const confirmAdd = document.getElementById("confirmAdd");
const selectAllCheckbox = document.getElementById("selectAll");
const sortStatusBtn = document.getElementById("sortStatusBtn");
const statusDropdown = document.getElementById("statusDropdown");
const statusOptions = document.getElementById("statusOptions");
const sortDateBtn = document.getElementById("sortDateBtn");
const dateDropdown = document.getElementById("dateDropdown");
const dateOptions = document.getElementById("dateOptions");
const sortTeamBtn = document.getElementById("sortTeamBtn");
const teamDropdown = document.getElementById("teamDropdown");
const teamOptions = document.getElementById("teamOptions");

let selectedSingleJob = null;

// Membaca dan parsing file Excel
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

// Format tanggal ke "dd-MMM-yyyy"
function formatToCustomDate(date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short" });
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Memformat nilai tanggal dari Excel
function formatDate(input) {
  if (!input) return "";

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

  return input;
}

// Menyimpan data dari Excel ke Firebase
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
      qty: job["Plan Qty"] || job["Qty"] || "",
      team: "",
      jobType: ""
    };

    const jobRef = ref(db, "outboundJobs/" + jobNo);
    set(jobRef, jobData);
  });

  alert("Data berhasil diunggah ke Firebase.");
  loadJobsFromFirebase();
}

// Memuat dan menampilkan data dari Firebase
function loadJobsFromFirebase() {
  const jobsRef = ref(db, "outboundJobs");
  onValue(jobsRef, (snapshot) => {
    const data = snapshot.val();
    jobTable.innerHTML = "";

    if (data) {
      const uniqueDates = new Set();

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

        uniqueDates.add(job.deliveryDate);
      });

      populateDateOptions(uniqueDates);
    }
  });
}

// Mengisi dropdown tanggal
function populateDateOptions(dates) {
  dateOptions.innerHTML = '<option value="all">-- Show All --</option>';
  Array.from(dates).sort().forEach(date => {
    const option = document.createElement("option");
    option.value = date;
    option.textContent = date;
    dateOptions.appendChild(option);
  });
}

// Mendapatkan job yang dipilih dari checkbox
function getSelectedJobs() {
  const checkboxes = document.querySelectorAll("tbody input[type='checkbox']:checked");
  return Array.from(checkboxes).map(cb => cb.getAttribute("data-jobno"));
}

// Menampilkan modal
function showModal() {
  modal.style.display = "block";
}

// Menyembunyikan modal
function hideModal() {
  modal.style.display = "none";
}

// Filter berdasarkan status
function filterJobsByStatus(status) {
  const rows = jobTable.querySelectorAll("tr");
  rows.forEach(row => {
    const statusCell = row.cells[5];
    if (!statusCell) return;
    const jobStatus = statusCell.textContent.trim();
    row.style.display = (status === "all" || jobStatus === status) ? "" : "none";
  });
}

// Filter berdasarkan tanggal
function filterJobsByDate(date) {
  const rows = jobTable.querySelectorAll("tr");
  rows.forEach(row => {
    const dateCell = row.cells[2];
    if (!dateCell) return;
    const jobDate = dateCell.textContent.trim();
    row.style.display = (date === "all" || jobDate === date) ? "" : "none";
  });
}

// Fungsi untuk filter berdasarkan Team
function filterJobsByTeam(team) {
  const rows = jobTable.querySelectorAll("tr");

  rows.forEach((row) => {
    const teamCell = row.cells[7];
    if (!teamCell) return;

    const jobTeam = teamCell.textContent.trim();
    const isBlank = jobTeam === "" || jobTeam.toLowerCase() === "none";

    const match =
      team === "all" ||
      (team === "none" && isBlank) ||
      jobTeam === team;

    row.style.display = match ? "" : "none";
  });
}

// Event listeners
uploadBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (file) {
    parseExcel(file);
  } else {
    alert("Pilih file Excel terlebih dahulu.");
  }
});

bulkAddBtn.addEventListener("click", () => {
  const selectedJobs = getSelectedJobs();
  if (selectedJobs.length === 0) {
    alert("Pilih minimal satu job terlebih dahulu.");
    return;
  }
  showModal();
});

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

confirmAdd.addEventListener("click", () => {
  const team = document.getElementById("teamSelect").value;
  const jobType = document.getElementById("jobTypeSelect").value;
  let jobsToUpdate = selectedSingleJob ? [selectedSingleJob] : getSelectedJobs();

  if (jobsToUpdate.length === 0) {
    alert("Tidak ada job yang dipilih.");
    return;
  }

  jobsToUpdate.forEach(jobNo => {
    const jobRef = ref(db, "outboundJobs/" + jobNo);
    update(jobRef, { team, jobType });
  });

  alert(`Job berhasil ditambahkan ke team: ${team}`);
  selectedSingleJob = null;
  hideModal();
});

selectAllCheckbox.addEventListener("change", (e) => {
  const checkboxes = document.querySelectorAll("tbody input[type='checkbox']");
  checkboxes.forEach(cb => cb.checked = e.target.checked);
});

closeModal.addEventListener("click", hideModal);
window.addEventListener("click", (e) => { if (e.target === modal) hideModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideModal(); });

sortStatusBtn.addEventListener("click", () => {
  statusDropdown.style.display = statusDropdown.style.display === "block" ? "none" : "block";
});

statusOptions.addEventListener("change", () => {
  filterJobsByStatus(statusOptions.value);
  statusDropdown.style.display = "none";
});

sortDateBtn.addEventListener("click", () => {
  dateDropdown.style.display = dateDropdown.style.display === "block" ? "none" : "block";
});

dateOptions.addEventListener("change", () => {
  filterJobsByDate(dateOptions.value);
  dateDropdown.style.display = "none";
});

sortTeamBtn.addEventListener("click", () => {
  teamDropdown.style.display = teamDropdown.style.display === "block" ? "none" : "block";
});

teamOptions.addEventListener("change", () => {
  const selectedTeam = teamOptions.value;
  filterJobsByTeam(selectedTeam);
  teamDropdown.style.display = "none";
});

// Load data pertama kali saat halaman siap
loadJobsFromFirebase();
