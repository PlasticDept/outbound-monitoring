// team-sugity.js
import { db } from "./config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const teamTable = document.getElementById("teamTable").getElementsByTagName("tbody")[0];
const currentTeam = "Sugity";
const picName = localStorage.getItem("pic") || "";

// Tampilkan nama PIC jika tersedia
const picIndicator = document.createElement("div");
picIndicator.id = "picIndicator";
picIndicator.style.margin = "10px 0";
picIndicator.style.fontStyle = "italic";
picIndicator.style.color = "#2c3e50";
picIndicator.textContent = picName ? `👤 PIC: ${picName}` : "";

document.querySelector(".container").insertBefore(picIndicator, document.getElementById("teamTable"));

function createTableRow(job) {
  const row = document.createElement("tr");

  const statusClass = {
    NewJob: "status-newjob",
    PartialPicked: "status-partialpicked",
    Downloaded: "status-downloaded",
    Packed: "status-packed",
    Loaded: "status-loaded"
  }[job.status] || "";

  const statusHTML = `<span class="status-label ${statusClass}">${job.status}</span>`;

  row.innerHTML = `
    <td>${job.jobNo}</td>
    <td>${job.deliveryDate}</td>
    <td>${job.deliveryNote}</td>
    <td>${job.remark}</td>
    <td>${statusHTML}</td>
    <td>${Number(job.qty).toLocaleString()}</td>
  `;

  return row;
}

function loadTeamJobs() {
  onValue(ref(db, "outboundJobs"), snapshot => {
    const data = snapshot.val();
    teamTable.innerHTML = "";

    if (data) {
      Object.values(data).forEach(job => {
        if (job.team === "Sugity") {
          const row = createTableRow(job);
          teamTable.appendChild(row);
        }
      });
    }
  });
}

loadTeamJobs();
