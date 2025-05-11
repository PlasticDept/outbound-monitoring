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

// Variabel golbal
let selectedSingleJob = null;

// Fungsi untuk membaca dan parsing file Excel
function parseExcel(file) {
  const reader = new FileReader();
  alert("Memulai proses upload file...");

  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);

    // Tampilkan contoh tanggal pertama sebagai debugging
    const firstJob = json[0];
    if (firstJob) {
      alert(`Contoh delivery date dari Excel:\n${firstJob["Delivery Date"]} (type: ${typeof firstJob["Delivery Date"]})`);
    }

    syncJobsToFirebase(json);
  };

  reader.readAsArrayBuffer(file);
}

// Fungsi format tanggal
function formatDate(input) {
  if (!input) {
    console.warn("Tanggal kosong atau null:", input);
    return "";
  }

  // Jika input berupa angka serial Excel
  if (typeof input === "number") {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(epoch.getTime() + input * 86400000);
    return formatToCustomDate(date);
  }

  // Jika input berupa string yang bisa diparse
  const parsed = new Date(input);
  if (!isNaN(parsed)) {
    return formatToCustomDate(parsed);
  }

  // Jika input berupa format pendek seperti "13/05"
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

// Format akhir menjadi "dd-MMM-yyyy"
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

    // Debug log
    debugDiv.innerHTML += `Job: ${jobNo} | Raw Date: ${rawDate} | Formatted: ${formattedDate}<br>`;

    // Overwrite rawDate with formatted value (just in case)
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
          <td>${job.qty}</td>
          <td>${job.team}</td>
          <td><button class="add-single" data-jobno="${job.jobNo}">Add</button></td>
        `;
      });
    }
  });
}

// Ambil job yang dipilih
function getSelectedJobs() {
  const checkboxes = document.querySelectorAll("tbody input[type='checkbox']:checked");
  return Array.from(checkboxes).map(cb => cb.getAttribute("data-jobno"));
}

// Tampilkan modal
function showModal() {
  modal.style.display = "block";
}

// Sembunyikan modal
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

document.addEventListener("click", function (e) {
  if (e.target.classList.contains("add-single")) {
    const jobNo = e.target.getAttribute("data-jobno");
    selectedSingleJob = jobNo;  // simpan jobNo yang diklik
    showModal();
  }
});

// Event konfirmasi modal
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
  hideModal();
});

// Event checkbox "select all"
selectAllCheckbox.addEventListener("change", (e) => {
  const checkboxes = document.querySelectorAll("tbody input[type='checkbox']");
  checkboxes.forEach(cb => cb.checked = e.target.checked);
});

// Tutup modal jika klik tombol ×
closeModal.addEventListener("click", hideModal);

// Tutup modal jika klik luar area
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

// Load data pertama kali saat halaman siap
loadJobsFromFirebase();

// Delegasi event untuk tombol Add per baris
jobTable.addEventListener("click", (event) => {
  if (event.target.classList.contains("add-single")) {
    const jobNo = event.target.getAttribute("data-jobno");
    if (jobNo) {
      selectedSingleJob = jobNo;
      showModal();
    }
  }
});
