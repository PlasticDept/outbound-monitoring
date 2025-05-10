// sortir.js

import { db } from "./config.js";
import { ref, set, get, update, child } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const jobTable = document.getElementById("jobTable");

function parseExcel(file) {
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
  jobs.forEach(job => {
    const jobNo = job["Job No"];
    if (!jobNo) return;

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
    set(jobRef, jobData);
  });
}

uploadBtn.addEventListener("click", () => {
  const file = fileInput.files[0];
  if (file) {
    parseExcel(file);
  } else {
    alert("Please choose a file first.");
  }
});
