// sortir.js

import { db } from "./config.js";
import { ref, set, get } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const jobTableBody = document.querySelector("#jobTable tbody");

function parseExcel(file) {
  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      syncJobsToFirebase(json);
    } catch (error) {
      alert("Gagal memproses file Excel. Periksa format dan coba lagi.");
      console.error(error);
    }
  };

  reader.readAsArrayBuffer(file);
}

function syncJobsToFirebase(jobs) {
  let total = jobs.length;
  let uploaded = 0;

  alert("Proses upload dimulai...");

  jobs.forEach((job, index) => {
    const jobNo = job["Job No"];
    if (!jobNo) return;

    const jobData = {
      jobNo: job["Job No"] || "",
      deliveryDate: job["Delivery Date"] || "",
      deliveryNote: job["Delivery Note"] || "",
      remark: job["Remark"] || "",
      status: job["Status"] || "",
      qty: job["Plan Qty"] || "", // Ambil dari Plan Qty
      team: "" // Akan diisi saat assign ke team
    };

    const jobRef = ref(db, "outboundJobs/" + jobNo);
    set(jobRef, jobData)
      .then(() => {
        uploaded++;
        if (uploaded === total) {
          alert("Upload dan sinkronisasi berhasil!");
          fetchJobs(); // Refresh tabel setelah upload selesai
        }
      })
      .catch((error) => {
        alert("Terjadi kesalahan saat menyimpan data ke database.");
        console.error("Firebase set error:", error);
      });
  });
}

function fetchJobs() {
  const jobsRef = ref(db, "outboundJobs");
  get(jobsRef).then((snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      renderTable(Object.values(data));
    } else {
      jobTableBody.innerHTML = "<tr><td colspan='9'>Tidak ada data ditemukan.</td></tr>";
    }
  });
}

function renderTable(jobs) {
  jobTableBody.innerHTML = "";
  jobs.forEach((job) => {
    const row = document.createElement("tr");

    row.innerHTML = `
      <td><input type="checkbox" class="selectJob"></td>
      <td>${job.jobNo}</td>
      <td>${job.deliveryDate}</td>
      <td>${job.deliveryNote}</td>
      <td>${job.remark}</td>
      <td>${job.status}</td>
      <td>${job.qty}</td>
      <td>${job.team}</td>
      <td><button class="addBtn">Add</button></td>
    `;

    jobTableBody.appendChild(row);
  });
}

uploadBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (file) {
    parseExcel(file);
  } else {
    alert("Silakan pilih file terlebih dahulu.");
  }
});

// Panggil saat halaman dimuat
fetchJobs();
