// sortir.js
import { db } from "./config.js";
import {ref, set, get, update, onValue, remove} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

/* =========================
    FUNGSI UTILITY/HELPER
========================= */
// Notifikasi di atas header
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
  if (typeof value === "object") return ""; // Hindari stringify object
  if (typeof value === "function") return "";
  return value ?? "";
}

// Format tanggal ke "dd-MMM-yyyy"
function formatToCustomDate(date) {
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = date.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const year = date.getUTCFullYear();
  return `${day}-${month}-${year}`;
}

// Memformat nilai tanggal dari Excel
function formatDate(input) {
  if (!input) return "";

  if (typeof input === "number") {
    const date = new Date(Math.round((input - 25569) * 86400 * 1000)); // Convert from Excel serial date
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
    <td>
      <button class="add-single" data-jobno="${job.jobNo}">Assign</button>
      <button class="unassign-single" data-jobno="${job.jobNo}">Unassign</button>
    </td>
  `;
  return row;
}

// Fungsi menyimpan target ke Firebase
function savePlanTargetToFirebase(team, value) {
  set(ref(db, `planTargets/${team.toLowerCase()}`), value)
    .then(() => alert(`Target plan untuk team ${team} telah disimpan: ${value} kg.`))
    .catch((err) => alert("Gagal menyimpan plan target: " + err.message));
}

// Fungsi mengatur target plan dari input
function handleSetPlanTarget() {
  const team = planTeamSelector.value;
  const target = parseInt(planTargetInput.value);

  if (isNaN(target) || target <= 0) {
    alert("Masukkan nilai target yang valid.");
    return;
  }

  savePlanTargetToFirebase(team, target);
  planTargetInput.value = "";
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

// Fungsi untuk hapus semua job di database
function clearAllJobs() {
  if (confirm("Apakah kamu yakin ingin menghapus SEMUA job dari database?")) {
    remove(ref(db, "outboundJobs"))
      .then(() => {
        showNotification("✅ Semua job berhasil dihapus.");
        loadJobsFromFirebase(); // Refresh tampilan tabel
      })
      .catch((err) => {
        console.error(err);
        showNotification("❌ Gagal menghapus job!", true);
      });
  }
}

// Fungsi sortir tabel berdasarkan kolom
window.sortTableBy = function (key) {
  const tbody = document.querySelector("#jobTable tbody");
  if (!tbody) {
    console.warn("Tbody belum tersedia saat sort dijalankan.");
    return;
  }

  const rows = Array.from(tbody.querySelectorAll("tr"));

  const jobsOnScreen = rows.map(row => {
    const cells = row.querySelectorAll("td");
    return {
      element: row,
      jobNo: cells[1]?.textContent.trim(),
      deliveryDate: cells[2]?.textContent.trim(),
      deliveryNote: cells[3]?.textContent.trim(),
      remark: cells[4]?.textContent.trim(),
      status: cells[5]?.textContent.trim(),
      qty: parseInt(cells[6]?.textContent.replace(/,/g, "") || "0"),
      team: cells[7]?.textContent.trim()
    };
  });

  if (window.sortTableBy.lastKey === key) {
    window.sortTableBy.asc = !window.sortTableBy.asc;
  } else {
    window.sortTableBy.asc = true;
  }
  window.sortTableBy.lastKey = key;

  jobsOnScreen.sort((a, b) => {
    const valA = a[key]?.toUpperCase?.() || "";
    const valB = b[key]?.toUpperCase?.() || "";
    if (valA < valB) return window.sortTableBy.asc ? -1 : 1;
    if (valA > valB) return window.sortTableBy.asc ? 1 : -1;
    return 0;
  });

  tbody.innerHTML = "";
  jobsOnScreen.forEach(job => tbody.appendChild(job.element));
};

// Membaca dan parsing file Excel
function parseExcel(file) {
  const reader = new FileReader();
  showNotification("Memulai proses upload file...");

  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);

      if (!Array.isArray(json) || json.length === 0) {
        showNotification("File Excel kosong atau tidak terbaca.", true);
        fileInput.value = "";
        return;
      }

      const requiredKeys = ["Job No", "Delivery Date"];
      const firstRow = Object.keys(json[0]);
      const missingHeaders = requiredKeys.filter(key => !firstRow.includes(key));

      if (missingHeaders.length > 0) {
        showNotification(`File tidak bisa diproses pastikan baris pertama harus ${missingHeaders.join(", ")}`, true);
        fileInput.value = "";
        return;
      }

      syncJobsToFirebase(json);
    } catch (err) {
      console.error("Gagal parsing Excel:", err);
      showNotification("Terjadi kesalahan saat membaca file Excel.", true);
    }
    fileInput.value = "";
  };

  reader.readAsArrayBuffer(file);
}

// Menyimpan data dari Excel ke Firebase (per job, aman)
function syncJobsToFirebase(jobs) {
  let uploadCount = 0;
  let errorCount = 0;

  jobs.forEach(job => {
    const jobNo = sanitizeValue(job["Job No"]);
    if (!jobNo || /[.#$\[\]]/.test(jobNo)) {
      console.warn("Lewatkan jobNo invalid:", jobNo);
      return;
    }

    const formattedDate = formatDate(job["Delivery Date"]);
    const jobRef = ref(db, "outboundJobs/" + jobNo);

    get(jobRef).then(existingSnap => {
      const existing = existingSnap.exists() ? existingSnap.val() : {};

      const jobData = {
        jobNo,
        deliveryDate: sanitizeValue(formattedDate),
        deliveryNote: sanitizeValue(job["Delivery Note"]),
        remark: sanitizeValue(job["Remark"]),
        status: sanitizeValue(job["Status"]),
        qty: sanitizeValue(job["Plan Qty"] || job["Qty"]),
        team: existing.team || "",
        jobType: existing.jobType || ""
      };

      return set(jobRef, jobData);
    })
    .then(() => {
      uploadCount++;
      if (uploadCount + errorCount === jobs.length) {
        showNotification("Upload selesai. Berhasil: " + uploadCount + ", Gagal: " + errorCount);
        loadJobsFromFirebase();
      }
    })
    .catch(error => {
      errorCount++;
      console.error("Error update job:", jobNo, error);
      if (uploadCount + errorCount === jobs.length) {
        showNotification("Upload selesai. Berhasil: " + uploadCount + ", Gagal: " + errorCount, true);
      }
    });
  });
}

// Load data dari Firebase
function loadJobsFromFirebase() {
  const debugDiv = document.getElementById("debugLog");
  jobTable.innerHTML = "";
  allJobsData = [];

  get(ref(db, "outboundJobs"))
    .then(snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.val();
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
    })
    .catch(error => {
      console.error("Gagal mengambil data:", error);
      showNotification("Gagal mengambil data dari Firebase.", true);
    });
}

// MULTI FILTER - berdasarkan status, tanggal, dan team
function applyMultiFilter() {
  const selectedStatus = statusOptions.value;
  const selectedDate = dateOptions.value;
  const selectedTeam = teamOptions.value;

  jobTable.innerHTML = "";
  filteredJobs = [];

  allJobsData.forEach(job => {
    const matchStatus = selectedStatus === "all" || job.status === selectedStatus;
    const matchDate = selectedDate === "all" || job.deliveryDate === selectedDate;
    const isBlankTeam = !job.team || job.team.toLowerCase() === "none";
    const matchTeam = selectedTeam === "all" || (selectedTeam === "none" && isBlankTeam) || job.team === selectedTeam;

    if (matchStatus && matchDate && matchTeam) {
      jobTable.appendChild(createTableRow(job));
      filteredJobs.push(job);
    }
  });
}

function refreshDataWithoutReset() {
  get(ref(db, "outboundJobs")).then(snapshot => {
    const data = snapshot.val();
    jobTable.innerHTML = "";
    allJobsData = [];

    if (data) {
      const uniqueDates = new Set();
      const uniqueTeams = new Set();

      Object.values(data).forEach(job => {
        allJobsData.push(job);
        uniqueDates.add(job.deliveryDate);
        uniqueTeams.add(job.team || "");
      });

      applyMultiFilter();
      updateFilterIndicator();
    }
  });
}

function updateFilterIndicator() {
  const status = statusOptions.value;
  const date = dateOptions.value;
  const team = teamOptions.value;

  const filters = [];

  if (status !== "all") filters.push(`Status: ${status}`);
  if (date !== "all") filters.push(`Date: ${date}`);
  if (team !== "all") {
    filters.push(`Team: ${team === "none" ? "None/blank" : team}`);
  }

  const filterIndicator = document.getElementById("filterIndicator");
  if (filters.length > 0) {
    filterIndicator.textContent = "Filtered by: " + filters.join(" | ");
  } else {
    filterIndicator.textContent = "";
  }
}

function closeAllDropdowns() {
  statusDropdown.style.display = "none";
  dateDropdown.style.display = "none";
  teamDropdown.style.display = "none";
}

// Navigasi
window.navigateTo = function(page) {
  window.location.href = page;
};

/* =========================
    INISIALISASI & EVENT LISTENER
========================= */

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
const planTargetInput = document.getElementById("planTargetInput");
const planTeamSelector = document.getElementById("planTeamSelector");
const setPlanTargetBtn = document.getElementById("setPlanTargetBtn");

let selectedSingleJob = null;
let allJobsData = [];
let filteredJobs = [];
let currentSort = { key: null, asc: true };
let isStatusOpen = false;
let isDateOpen = false;
let isTeamOpen = false;

// Event listener untuk tombol set plan target
setPlanTargetBtn?.addEventListener("click", handleSetPlanTarget);

// Event utama
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
  // Handler Assign Job
  if (e.target.classList.contains("add-single")) {
    const anyChecked = document.querySelector("tbody input[type='checkbox']:checked");
    if (anyChecked) return showNotification("Kosongkan centang terlebih dahulu.", true);
    selectedSingleJob = e.target.getAttribute("data-jobno");
    showModal();
  }
  // Handler Unassign Job
  if (e.target.classList.contains("unassign-single")) {
    const jobNo = e.target.getAttribute("data-jobno");

    const jobRef = ref(db, "outboundJobs/" + jobNo);
    get(jobRef).then(snapshot => {
      if (!snapshot.exists()) {
        return showNotification("❌ Job tidak ditemukan di database.", true);
      }

      const jobData = snapshot.val();
      if (!jobData.team) {
        return showNotification("⚠️ Job ini belum di-assign ke team manapun.", true);
      }

      if (confirm("Apakah kamu yakin ingin membatalkan assignment job ini?")) {
        update(jobRef, {
          team: "",
          jobType: ""
        })
        .then(() => {
          showNotification("✅ Job berhasil di-unassign.");
          refreshDataWithoutReset();
        })
        .catch(err => {
          console.error(err);
          showNotification("❌ Gagal menghapus assignment job.", true);
        });
      }
    });
  }
});

confirmAdd.addEventListener("click", async () => {
  const team = document.getElementById("teamSelect").value;
  const jobType = document.getElementById("jobTypeSelect").value;
  const jobsToUpdate = selectedSingleJob ? [selectedSingleJob] : getSelectedJobs();
  const loadingIndicator = document.getElementById("loadingIndicator");

  if (jobsToUpdate.length === 0) return showNotification("Tidak ada job yang dipilih.", true);

  // Tampilkan loading
  loadingIndicator.style.display = "block";
  confirmAdd.disabled = true;

  try {
    await Promise.all(
      jobsToUpdate.map(jobNo =>
        update(ref(db, "outboundJobs/" + jobNo), { team, jobType })
      )
    );

    showNotification(`Job berhasil ditambahkan ke team: ${team}`);
    selectedSingleJob = null;

    // Setelah sukses
    hideModal();
    refreshDataWithoutReset();
  } catch (error) {
    showNotification("Gagal menyimpan data ke Firebase.", true);
    console.error(error);
  } finally {
    loadingIndicator.style.display = "none";
    confirmAdd.disabled = false;
  }
});

selectAllCheckbox.addEventListener("change", (e) => {
  document.querySelectorAll("tbody input[type='checkbox']")
    .forEach(cb => cb.checked = e.target.checked);
});

closeModal.addEventListener("click", hideModal);
window.addEventListener("click", (e) => { if (e.target === modal) hideModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") hideModal(); });

// TOMBOL DROPDOWN FILTER
sortStatusBtn.addEventListener("click", () => {
  const isCurrentlyOpen = statusDropdown.style.display === "block";
  closeAllDropdowns();
  if (!isCurrentlyOpen) {
    statusDropdown.style.display = "block";
  }
});

sortDateBtn.addEventListener("click", () => {
  const isCurrentlyOpen = dateDropdown.style.display === "block";
  closeAllDropdowns();
  if (!isCurrentlyOpen) {
    dateDropdown.style.display = "block";
  }
});

sortTeamBtn.addEventListener("click", () => {
  const isCurrentlyOpen = teamDropdown.style.display === "block";
  closeAllDropdowns();
  if (!isCurrentlyOpen) {
    teamDropdown.style.display = "block";
  }
});

// FILTER saat dropdown berubah
statusOptions.addEventListener("change", () => {
  applyMultiFilter();
  updateFilterIndicator();
  statusDropdown.style.display = "none";
});
dateOptions.addEventListener("change", () => {
  applyMultiFilter();
  updateFilterIndicator();
  dateDropdown.style.display = "none";
});
teamOptions.addEventListener("change", () => {
  applyMultiFilter();
  updateFilterIndicator();
  teamDropdown.style.display = "none";
});

// Load pertama kali saat halaman dimuat
loadJobsFromFirebase();

// Event listener tombol
document.getElementById("clearDatabaseBtn").addEventListener("click", clearAllJobs);

// Tambahkan event listener logout di bagian paling bawah
const logoutBtn = document.getElementById("logoutBtn");
logoutBtn?.addEventListener("click", () => {
  if (confirm("Apakah kamu yakin ingin logout?")) {
    localStorage.clear();
    window.location.href = "index.html";
  }
});
