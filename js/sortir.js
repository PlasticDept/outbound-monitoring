import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, onValue, set } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

const jobTableBody = document.querySelector("#jobTable tbody");
const addSelectedBtn = document.getElementById("addSelectedBtn");

function loadJobs() {
  const jobRef = ref(db, "jobs/");
  onValue(jobRef, (snapshot) => {
    const data = snapshot.val();
    jobTableBody.innerHTML = "";
    for (let id in data) {
      const job = data[id];
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><input type="checkbox" class="job-checkbox" data-id="${id}"></td>
        <td>${id}</td>
        <td>${job.team}</td>
        <td>${job.status}</td>
        <td>${job.tanggal}</td>
        <td><button class="add-btn" data-id="${id}">Add</button></td>
      `;
      jobTableBody.appendChild(row);
    }

    // Add per row
    document.querySelectorAll(".add-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const jobId = btn.dataset.id;
        sendJobToTeam(jobId);
      });
    });
  });
}

function sendJobToTeam(jobId) {
  const targetRef = ref(db, `targets/Reguler/${jobId}`);
  set(targetRef, { jobId, status: "Assigned" });
  alert(`Job ${jobId} added to Reguler Team.`);
}

addSelectedBtn.addEventListener("click", () => {
  const selected = document.querySelectorAll(".job-checkbox:checked");
  selected.forEach(input => {
    const jobId = input.dataset.id;
    sendJobToTeam(jobId);
  });
});

// Sorting buttons (placeholder)
document.getElementById("sortStatusBtn").addEventListener("click", () => alert("Sort by Status clicked"));
document.getElementById("sortDateBtn").addEventListener("click", () => alert("Sort by Date clicked"));
document.getElementById("sortTeamBtn").addEventListener("click", () => alert("Sort by Team clicked"));

// Select All Checkbox
document.getElementById("checkAll").addEventListener("change", function() {
  const checkboxes = document.querySelectorAll(".job-checkbox");
  checkboxes.forEach(cb => cb.checked = this.checked);
});

loadJobs();
