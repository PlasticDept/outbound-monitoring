// team-sugity.js
import { db } from "./config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const teamTable = document.getElementById("teamTable").getElementsByTagName("tbody")[0];
const currentTeam = "Sugity";
const picName = localStorage.getItem("pic") || "";

// Buat container untuk info PIC dan total
const infoContainer = document.createElement("div");
infoContainer.id = "infoContainer";
infoContainer.style.margin = "10px 0";
infoContainer.style.fontStyle = "italic";
infoContainer.style.color = "#2c3e50";

const picIndicator = document.createElement("div");
const jobCountIndicator = document.createElement("div");
const qtyTotalIndicator = document.createElement("div");

picIndicator.textContent = picName ? `👤 PIC: ${picName}` : "";

infoContainer.appendChild(picIndicator);
infoContainer.appendChild(jobCountIndicator);
infoContainer.appendChild(qtyTotalIndicator);

document.querySelector(".container").insertBefore(infoContainer, document.getElementById("teamTable"));

function createStatusLabel(status) {
  const span = document.createElement("span");
  span.textContent = status;
  span.classList.add("status-label");

  switch (status.toLowerCase()) {
    case "newjob":
      span.style.backgroundColor = "#e74c3c"; // merah
      break;
    case "partialpicked":
      span.style.backgroundColor = "#f39c12"; // oranye
      break;
    case "downloaded":
      span.style.backgroundColor = "#f1c40f"; // kuning
      break;
    case "packed":
    case "loaded":
      span.style.backgroundColor = "#2ecc71"; // hijau
      break;
    default:
      span.style.backgroundColor = "#bdc3c7"; // abu-abu
  }

  span.style.padding = "4px 8px";
  span.style.borderRadius = "6px";
  span.style.color = "white";
  span.style.fontSize = "0.85em";

  return span;
}

function loadTeamJobs() {
  onValue(ref(db, "outboundJobs"), snapshot => {
    const data = snapshot.val();
    teamTable.innerHTML = "";
    let totalJobs = 0;
    let totalQty = 0;

    if (data) {
      Object.values(data).forEach(job => {
        if ((job.team || '').toLowerCase() === currentTeam.toLowerCase()) {
          totalJobs++;
          totalQty += Number(job.qty) || 0;

          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${job.jobNo}</td>
            <td>${job.deliveryDate}</td>
            <td>${job.deliveryNote}</td>
            <td>${job.remark}</td>
            <td></td>
            <td>${Number(job.qty).toLocaleString()}</td>
            <td>${job.jobType || ""}</td>
          `;
          const statusCell = row.querySelector("td:nth-child(5)");
          statusCell.appendChild(createStatusLabel(job.status));
          teamTable.appendChild(row);
        }
      });
    }

    jobCountIndicator.textContent = `📦 Total Outbound Job Target: ${totalJobs}`;
    qtyTotalIndicator.textContent = `🔢 Total Qty Target: ${totalQty.toLocaleString("en-US")} Kg`;
  });
}

loadTeamJobs();
