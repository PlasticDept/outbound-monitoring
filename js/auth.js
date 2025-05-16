// Tampilkan Team & PIC jika Position = OPERATOR
const positionSelect = document.getElementById("position");
const operatorFields = document.getElementById("operatorFields");
const usernameContainer = document.getElementById("usernameContainer");
const usernameInput = document.getElementById("username");

positionSelect.addEventListener("change", () => {
  if (positionSelect.value === "OPERATOR") {
    operatorFields.style.display = "block";
    usernameContainer.style.display = "none";
    usernameInput.required = false;
  } else {
    operatorFields.style.display = "none";
    usernameContainer.style.display = "block";
    usernameInput.required = true;
  }
});

document.getElementById("loginForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const shift = document.getElementById("shift").value;
  const position = document.getElementById("position").value;
  const username =
    position === "OPERATOR"
      ? document.getElementById("picInput").value.trim()
      : document.getElementById("username").value.trim();

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
    localStorage.setItem("shift", shift);
    localStorage.setItem("position", position);

    if (position === "OPERATOR") {
      const team = document.getElementById("teamSelect").value;
      const pic = document.getElementById("picInput").value.trim();

      if (!team || !pic) {
        alert("Lengkapi pilihan Team dan PIC terlebih dahulu.");
        return;
      }

      localStorage.setItem("team", team);
      localStorage.setItem("pic", pic);
      localStorage.setItem("username", pic); // PIC menggantikan username

      if (team === "Sugity") {
        window.location.href = "team-sugity.html";
      } else if (team === "Reguler") {
        window.location.href = "team-reguler.html";
      } else {
        alert("Team tidak valid.");
      }
    } else {
      // Bukan operator → simpan username biasa dan arahkan ke sortir
      localStorage.setItem("username", username);
      window.location.href = "sort-job.html";
    }
  } else {
    alert("Username atau password salah!");
  }
});
