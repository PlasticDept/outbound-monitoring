// sortir.js
import { db } from "./config.js";
import {
  ref,
  set,
  get,
  update,
  onValue
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// === Notifikasi di atas header ===
function showNotification(message, isError = false) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.style.display = 'block';
  notification.classList.toggle('error', isError);

  setTimeout(() => {
    notification.style.display = 'none';
  }, 4000);
}

// Fungsi bantu untuk membersihkan nilai dari Excel
function sanitizeValue(value) {
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "function") return "";
  return value ?? "";
}

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
let allJobsData = []; // Simpan semua job untuk multi-filter

// Membaca dan parsing file Excel
function parseExcel(file) {
  const reader = new FileReader();
  showNotification("Memulai proses upload file...");

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    const firstJob = json[0];
    if (firstJob) {
      showNotification(`Contoh delivery date dari Excel:\n${firstJob["Delivery Date"]}`);
    }

    syncJobsToFirebase(json);
    fileInput.value = "";
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

// Menyimpan data dari Excel ke Firebase (overwrite semua data)
function syncJobsToFirebase(jobs) {
  const debugDiv = document.getElementById("debugLog");
  debugDiv.innerHTML = "<strong>Debug Log:</strong><br>";

  let uploadCount = 0;
  let errorCount = 0;

  jobs.forEach(job => {
    const jobNo = sanitizeValue(job["Job No"]);
    if (!jobNo) return;

    const formattedDate = formatDate(job["Delivery Date"]);
    debugDiv.innerHTML += `Job: ${jobNo} | Tanggal: ${formattedDate}<br>`;

    const jobData = {
      jobNo,
      deliveryDate: sanitizeValue(formattedDate),
      deliveryNote: sanitizeValue(job["Delivery Note"]),
      remark: sanitizeValue(job["Remark"]),
      status: sanitizeValue(job["Status"]),
      qty: sanitizeValue(job["Plan Qty"] || job["Qty"]),
      team: "",
      jobType: ""
    };

    set(ref(db, "outboundJobs/" + jobNo), jobData)
      .then(() => {
        uploadCount++;
        if (uploadCount + errorCount === jobs.length) {
          showNotification("Upload selesai. Berhasil: " + uploadCount + ", Gagal: " + errorCount);
          loadJobsFromFirebase();
        }
      })
      .catch((error) => {
        errorCount++;
        console.error("Error update job:", jobNo, error);
        if (uploadCount + errorCount === jobs.length) {
          showNotification("Upload selesai. Berhasil: " + uploadCount + ", Gagal: " + errorCount, true);
        }
      });
  });
}

  set(ref(db, "outboundJobs"), cleanedData)
    .then(() => {
      showNotification("Data berhasil diunggah ke Firebase.");
      loadJobsFromFirebase();
    })
    .catch((error) => {
      console.error("Upload error:", error);
      showNotification("Terjadi kesalahan saat upload ke Firebase.", true);
    });
}

// Load data dari Firebase
function loadJobsFromFirebase() {
  onValue(ref(db, "outboundJobs"), snapshot => {
    const data = snapshot.val();
    jobTable.innerHTML = "";
    allJobsData = [];

    if (data) {
      const uniqueDates = new Set();
      const uniqueTeams = new Set();

      Object.values(data).forEach(job => {
        allJobsData.push(job);
        const row = createTableRow(job);
        jobTable.appendChild(row);
        uniqueDates.add(job.deliveryDate);
        uniqueTeams.add(job.team || "");
      });
      populateDateOptions(uniqueDates);
      populateTeamOptions(uniqueTeams);
    }
  });
}

// Buat baris tabel
function createTableRow(job) {
  const row = document.createElement("tr");
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
  return row;
}

// Isi opsi tanggal di dropdown
function populateDateOptions(dates) {
  dateOptions.innerHTML = '<option value="all">-- Show All --</option>';
  [...dates].sort().forEach(date => {
    const option = document.createElement("option");
    option.value = date;
    option.textContent = date;
    dateOptions.appendChild(option);
  });
}

// Isi opsi team di dropdown
function populateTeamOptions(teams) {
  teamOptions.innerHTML = '<option value="all">-- Show All --</option>';
  const uniqueTeams = new Set(teams);
  uniqueTeams.forEach(team => {
    const value = team.trim() === "" ? "none" : team;
    const label = team.trim() === "" ? "None/blank" : team;
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    teamOptions.appendChild(option);
  });
}

// Ambil job yang dicentang
function getSelectedJobs() {
  const checkboxes = document.querySelectorAll("tbody input[type='checkbox']:checked");
  return Array.from(checkboxes).map(cb => cb.getAttribute("data-jobno"));
}

// Tampilkan / sembunyikan modal
function showModal() { modal.style.display = "block"; }
function hideModal() { modal.style.display = "none"; }

// MULTI FILTER - berdasarkan status, tanggal, dan team
function applyMultiFilter() {
  const selectedStatus = statusOptions.value;
  const selectedDate = dateOptions.value;
  const selectedTeam = teamOptions.value;

  jobTable.innerHTML = "";

  allJobsData.forEach(job => {
    const matchStatus = selectedStatus === "all" || job.status === selectedStatus;
    const matchDate = selectedDate === "all" || job.deliveryDate === selectedDate;
    const isBlankTeam = !job.team || job.team.toLowerCase() === "none";
    const matchTeam = selectedTeam === "all" || (selectedTeam === "none" && isBlankTeam) || job.team === selectedTeam;

    if (matchStatus && matchDate && matchTeam) {
      jobTable.appendChild(createTableRow(job));
    }
  });
}

// Event listeners utama
uploadBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (file) parseExcel(file);
  else showNotification("Pilih file Excel terlebih dahulu.", true);
});

bulkAddBtn.addEventListener("click", () => {
  const selectedJobs = getSelectedJobs();
  if (selectedJobs.length === 0) return showNotification("Pilih minimal satu job.", true);
  showModal();
});

jobTable.addEventListener("click", e => {
  if (e.target.classList.contains("add-single")) {
    const anyChecked = document.querySelector("tbody input[type='checkbox']:checked");
    if (anyChecked) return showNotification("Kosongkan centang terlebih dahulu.", true);
    selectedSingleJob = e.target.getAttribute("data-jobno");
    showModal();
  }
});

confirmAdd.addEventListener("click", () => {
  const team = document.getElementById("teamSelect").value;
  const jobType = document.getElementById("jobTypeSelect").value;
  const jobsToUpdate = selectedSingleJob ? [selectedSingleJob] : getSelectedJobs();

  if (jobsToUpdate.length === 0) return showNotification("Tidak ada job yang dipilih.", true);

  jobsToUpdate.forEach(jobNo => {
    update(ref(db, "outboundJobs/" + jobNo), { team, jobType });
  });

  showNotification(`Job berhasil ditambahkan ke team: ${team}`);
  selectedSingleJob = null;
  hideModal();
});

selectAllCheckbox.addEventListener("change", (e) => {
  document.querySelectorAll("tbody input[type='checkbox']")
    .forEach(cb => cb.checked = e.target.checked);
});

closeModal.addEventListener("click", hideModal);
window.addEventListener("click", (e) => { if (e.target === modal) hideModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideModal(); });

// TOMBOL DROPDOWN SORT
sortStatusBtn.addEventListener("click", () => {
  statusDropdown.style.display = statusDropdown.style.display === "block" ? "none" : "block";
});
sortDateBtn.addEventListener("click", () => {
  dateDropdown.style.display = dateDropdown.style.display === "block" ? "none" : "block";
});
sortTeamBtn.addEventListener("click", () => {
  teamDropdown.style.display = teamDropdown.style.display === "block" ? "none" : "block";
});

// FILTER saat dropdown berubah
statusOptions.addEventListener("change", () => {
  applyMultiFilter();
  statusDropdown.style.display = "none";
});
dateOptions.addEventListener("change", () => {
  applyMultiFilter();
  dateDropdown.style.display = "none";
});
teamOptions.addEventListener("change", () => {
  applyMultiFilter();
  teamDropdown.style.display = "none";
});

// Load pertama kali saat halaman dimuat
loadJobsFromFirebase();
