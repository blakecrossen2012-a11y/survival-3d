// =====================
// NETWORK
// =====================
const socket = new WebSocket("wss://YOUR_SERVER_URL");

// =====================
// UI
// =====================
const hud = document.getElementById("hud");
const chatInput = document.getElementById("chatInput");
const chatLog = document.getElementById("chatLog");

// =====================
// THREE.JS SETUP
// =====================
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 10, 80);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 6, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// =====================
// LIGHTING
// =====================
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.position.set(10, 20, 10);
scene.add(sun);

scene.add(new THREE.AmbientLight(0x888888));

// =====================
// GROUND
// =====================
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(200, 200),
  new THREE.MeshStandardMaterial({ color: 0x2e7d32 })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// =====================
// GAME STATE
// =====================
const players = {};
const zombies = {};
let myHealth = 100;

// =====================
// INPUT
// =====================
const keys = {};
window.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

// Shoot
window.addEventListener("click", () => {
  socket.send(JSON.stringify({ type: "shoot" }));
});

// =====================
// CHAT
// =====================
chatInput.addEventListener("keydown", e => {
  if (e.key === "Enter" && chatInput.value.trim()) {
    const isTeam = chatInput.value.startsWith("/t ");
    socket.send(JSON.stringify({
      type: "chat",
      text: chatInput.value,
      teamOnly: isTeam
    }));
    chatInput.value = "";
  }
});

function addChatLine(text) {
  const div = document.createElement("div");
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

// =====================
// SOCKET HANDLING
// =====================
socket.onmessage = e => {
  const data = JSON.parse(e.data);

  // ----- CHAT -----
  if (data.type === "chat") {
    const tag = data.teamOnly ? "[TEAM]" : "[ALL]";
    addChatLine(`${tag} ${data.from}: ${data.text.replace("/t ", "")}`);
  }

  // ----- WORLD STATE -----
  if (data.type === "state") {
    const playerCount = Object.keys(data.players).length;
    hud.textContent = `HP: ${Math.floor(myHealth)} | Players: ${playerCount}`;

    // Players
    for (const id in data.players) {
      const p = data.players[id];

      if (!players[id]) {
        const color = p.team === "Survivors" ? 0x2196f3 : 0xf44336;
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1, 2, 1),
          new THREE.MeshStandardMaterial({ color })
        );
        scene.add(mesh);
        players[id] = mesh;
      }

      players[id].position.set(p.x, p.y, p.z);
      myHealth = p.hp ?? myHealth;
    }

    // Zombies
    for (const id in data.zombies) {
      const z = data.zombies[id];

      if (!zombies[id]) {
        const mesh = new THREE.Mesh(
          new THREE.BoxGeometry(1, 2, 1),
          new THREE.MeshStandardMaterial({ color: 0x4caf50 })
        );
        scene.add(mesh);
        zombies[id] = mesh;
      }

      zombies[id].position.set(z.x, 1, z.z);
    }

    // Day / Night & Weather
    sun.intensity = data.time < 0.5 ? 1 : 0.2;
    scene.fog.density = data.rain ? 0.08 : 0.02;
  }
};

// =====================
// GAME LOOP
// =====================
function animate() {
  requestAnimationFrame(animate);

  socket.send(JSON.stringify({
    type: "input",
    keys
  }));

  renderer.render(scene, camera);
}

animate();

// =====================
// RESIZE
// =====================
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
