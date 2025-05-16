// team-sugity.js
import { db } from "./config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const teamTable = document.getElementById("teamTable").getElementsByTagName("tbody")[0];

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
