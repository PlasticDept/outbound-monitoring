document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const shift = document.getElementById("shift").value;
  const position = document.getElementById("position").value;
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  // Simulasi password untuk setiap posisi
  const positionPasswords = {
    "OPERATOR": "operator123",
    "TEAM LEADER": "leader123",
    "SPV": "spv123",
    "ASST MANAGER": "asman123",
    "MANAGER": "manager123"
  };

  if (positionPasswords[position] && password === positionPasswords[position]) {
    // Simpan data login ke localStorage
    localStorage.setItem("username", username);
    localStorage.setItem("shift", shift);
    localStorage.setItem("position", position);

    // Redirect ke halaman sortir
    window.location.href = "sort-job.html";
  } else {
    alert("Username atau password salah!");
  }
});
