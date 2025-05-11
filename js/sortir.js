// sortir.js
import { db } from "./config.js";
import { ref, set, get, update, child, onValue } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const jobTable = document.getElementById("jobTable").getElementsByTagName("tbody")[0];
const bulkAddBtn = document.getElementById("bulkAddBtn");
const modal = document.getElementById("addModal");
const closeModal = document.getElementById("closeModal");
const confirmAdd = document.getElementById("confirmAdd");
const selectAllCheckbox = document.getElementById("selectAll");

// Parsing Excel
function parseExcel(file) {
  const reader = new FileReader();
  alert("Memulai proses upload file...");
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json(sheet);
    syncJobsToFirebase(json);
  };
  reader.readAsArrayBuffer(file);
}

// Format Tanggal
function formatDate(dateString) {
  const date = new Date(dateString);
  if (isNaN(date)) return dateString;
  const options = { year: "numeric", month: "2-digit", day: "2-digit" };
  return date.toLocaleDateString("en-CA", options);
}

// Upload ke Firebase
function syncJobsToFirebase(jobs) {
  jobs.forEach((job) => {
    const jobNo = job["Job No"];
    if (!jobNo) return;

    const jobData = {
      jobNo: job["Job No"] || "",
      deliveryDate: formatDate(job["Delivery Date"] || ""),
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

  alert("Data berhasil diupload ke database!");
}

// Load data dari Firebase
function loadJobsFromFirebase() {
  const jobsRef = ref(db, "outboundJobs");
  onValue(jobsRef, (snapshot) => {
    const data = snapshot.val();
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

// Ambil job terpilih
function getSelectedJobs() {
  const checkboxes = document.querySelectorAll("tbody input[type='checkbox']:checked");
  return Array.from(checkboxes).map(cb => cb.getAttribute("data-jobno"));
}

// Tampilkan Modal
function showModal() {
  modal.style.display = "block";
}

// Sembunyikan Modal
function hideModal() {
  modal.style.display = "none";
}

// Event Listeners
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

closeModal.addEventListener("click", hideModal);

confirmAdd.addEventListener("click", () => {
  const selectedJobs = getSelectedJobs();
  const team = document.getElementById("teamSelect").value;
  const jobType = document.getElementById("jobTypeSelect").value;

  selectedJobs.forEach((jobNo) => {
    const jobRef = ref(db, "outboundJobs/" + jobNo);
    update(jobRef, { team, jobType });
  });

  alert(`Job berhasil ditambahkan ke team: ${team}`);
  hideModal();
});

// Select All Checkbox
selectAllCheckbox.addEventListener("change", (e) => {
  const checkboxes = document.querySelectorAll("tbody input[type='checkbox']");
  checkboxes.forEach(cb => cb.checked = e.target.checked);
});

// Klik di luar modal
window.addEventListener("click", (event) => {
  if (event.target === modal) {
    hideModal();
  }
});

// Load data saat halaman siap
loadJobsFromFirebase();
