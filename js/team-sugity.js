import { db } from "./config.js";
import { get, ref } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const teamTable = document.getElementById("teamTable").getElementsByTagName("tbody")[0];

function loadTeamJobs(teamName) {
  get(ref(db, "outboundJobs"))
    .then(snapshot => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        teamTable.innerHTML = "";

        Object.values(data).forEach(job => {
          if ((job.team || "").toLowerCase() === teamName.toLowerCase()) {
            const row = document.createElement("tr");
            row.innerHTML = `
              <td>${job.jobNo}</td>
              <td>${job.deliveryDate}</td>
              <td>${job.deliveryNote}</td>
              <td>${job.remark}</td>
              <td>${job.status}</td>
              <td>${Number(job.qty).toLocaleString()}</td>
              <td>${job.jobType || ""}</td> <!-- ✅ Tambahan -->
            `;

            teamTable.appendChild(row);
          }
        });
      }
    })
    .catch(error => {
      console.error("Gagal memuat data:", error);
      alert("Gagal memuat data dari Firebase.");
    });
}

// Load untuk team Sugity
loadTeamJobs("Sugity");
