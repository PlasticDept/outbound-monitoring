// team-sugity.js
import { db } from "./config.js";
import Chart from "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.esm.js";

const teamTable = document.getElementById("teamTable").getElementsByTagName("tbody")[0];
const currentTeam = "Sugity";
const picName = localStorage.getItem("pic") || "";

// Buat container untuk info PIC, total, dan chart
const infoContainer = document.createElement("div");
infoContainer.id = "infoContainer";
infoContainer.style.margin = "20px 0";
infoContainer.style.fontStyle = "italic";
infoContainer.style.color = "#2c3e50";
infoContainer.style.display = "flex";
infoContainer.style.justifyContent = "space-between";
infoContainer.style.alignItems = "center";

const infoTextContainer = document.createElement("div");
const chartContainer = document.createElement("div");
chartContainer.style.width = "180px";
chartContainer.style.height = "180px";

const canvas = document.createElement("canvas");
canvas.id = "progressChart";
canvas.width = 180;
canvas.height = 180;
chartContainer.appendChild(canvas);

const picIndicator = document.createElement("div");
const jobCountIndicator = document.createElement("div");
const qtyTotalIndicator = document.createElement("div");

picIndicator.textContent = picName ? `👤 PIC: ${picName}` : "";

infoTextContainer.appendChild(picIndicator);
infoTextContainer.appendChild(jobCountIndicator);
infoTextContainer.appendChild(qtyTotalIndicator);

infoContainer.appendChild(infoTextContainer);
infoContainer.appendChild(chartContainer);

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

function renderChart(packedCount, totalJobs) {
  const ctx = document.getElementById("progressChart").getContext("2d");
  const percentage = totalJobs === 0 ? 0 : Math.round((packedCount / totalJobs) * 100);

  if (window.progressChartInstance) window.progressChartInstance.destroy();

  window.progressChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Packed/Loaded", "Remaining"],
      datasets: [{
        data: [packedCount, totalJobs - packedCount],
        backgroundColor: ["#2ecc71", "#bdc3c7"],
        borderWidth: 1
      }]
    },
    options: {
      cutout: "70%",
      plugins: {
        tooltip: { enabled: false },
        legend: { display: false },
        
        // Plugin custom untuk menampilkan teks di tengah
        beforeDraw: chart => {
          const { width, height, ctx } = chart;
          ctx.restore();
          const fontSize = (height / 100).toFixed(2);
          ctx.font = `${fontSize}em sans-serif`;
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#2c3e50";

          const text = `${percentage}%`;
          const textX = Math.round((width - ctx.measureText(text).width) / 2);
          const textY = height / 2;

          ctx.fillText(text, textX, textY);
          ctx.save();
        }
      }
    }
  });
}

function loadTeamJobs() {
  onValue(ref(db, "outboundJobs"), snapshot => {
    const data = snapshot.val();
    teamTable.innerHTML = "";
    let totalJobs = 0;
    let totalQty = 0;
    let packedCount = 0;

    if (data) {
      Object.values(data).forEach(job => {
        if ((job.team || '').toLowerCase() === currentTeam.toLowerCase()) {
          totalJobs++;
          totalQty += Number(job.qty) || 0;

          if (["packed", "loaded"].includes((job.status || '').toLowerCase())) {
            packedCount++;
          }

          const row = document.createElement("tr");
          row.innerHTML = `
            <td>${job.jobNo}</td>
            <td>${job.deliveryDate}</td>
            <td>${job.deliveryNote}</td>
            <td>${job.remark}</td>
            <td></td>
            <td>${Number(job.qty).toLocaleString()}</td>
            <td>${job.jobType ? `<span class="job-type ${job.jobType}">${job.jobType}</span>` : ""}</td>
          `;
          const statusCell = row.querySelector("td:nth-child(5)");
          statusCell.appendChild(createStatusLabel(job.status));
          teamTable.appendChild(row);
        }
      });
    }

    jobCountIndicator.textContent = `📦 Total Outbound Job Target: ${totalJobs}`;
    qtyTotalIndicator.textContent = `🔢 Total Qty Target: ${totalQty.toLocaleString("en-US")} Kg`;
    renderChart(packedCount, totalJobs);
  });
}

loadTeamJobs();
