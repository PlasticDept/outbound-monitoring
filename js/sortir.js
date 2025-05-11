// sortir.js

import { db } from "./config.js";
import {
  ref,
  set
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const jobTable = document.getElementById("jobTable");

/**
 * Fungsi membaca file Excel dan parsing ke JSON
 */
function parseExcel(file) {
  const reader = new FileReader();

  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);

      if (json.length === 0) {
        alert("File Excel kosong atau tidak sesuai format.");
        return;
      }

      syncJobsToFirebase(json);
    } catch (error) {
      console.error("Error parsing file:", error);
      alert("Terjadi kesalahan saat membaca file. Pastikan format Excel benar.");
    }
  };

  reader.readAsArrayBuffer(file);
}

/**
 * Fungsi sinkronisasi data ke Firebase Realtime Database
 */
function syncJobsToFirebase(jobs) {
  let successCount = 0;
  let failedCount = 0;

  jobs.forEach((job, index) => {
    const jobNo = job["Job No"];
    if (!jobNo) {
      failedCount++;
      return;
    }

    const jobData = {
      jobNo: job["Job No"] || "",
      deliveryDate: job["Delivery Date"] || "",
      deliveryNote: job["Delivery Note"] || "",
      remark: job["Remark"] || "",
      status: job["Status"] || "",
      qty: job["Qty"] || "",
      team: "" // Akan diisi saat assign ke team
    };

    const jobRef = ref(db, "outboundJobs/" + jobNo);

    set(jobRef, jobData)
      .then(() => {
        successCount++;
        if (index === jobs.length - 1) {
          alert(`Upload selesai: ${successCount} berhasil, ${failedCount} gagal.`);
        }
      })
      .catch((error) => {
        console.error("Upload error:", error);
        failedCount++;
        if (index === jobs.length - 1) {
          alert(`Upload selesai dengan error: ${successCount} berhasil, ${failedCount} gagal.`);
        }
      });
  });
}

/**
 * Event listener tombol upload
 */
uploadBtn.addEventListener("click", () => {
  const file = fileInput.files[0];

  if (!file) {
    alert("Silakan pilih file Excel terlebih dahulu.");
    return;
  }

  parseExcel(file);
});
