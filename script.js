/* Sistema de gestión de partidos 5 vs 5.
   Admin password: "admin123"
   Guarda datos en localStorage.
*/

const ADMIN_PASS = 'admin123';
const LS_KEY = 'torneo_5vs5_v1';

let isAdmin = false;
let state = loadState();

// Elementos de UI
const loginBtn = document.getElementById('loginBtn');
const loginModal = document.getElementById('loginModal');
const loginSubmit = document.getElementById('loginSubmit');
const loginCancel = document.getElementById('loginCancel');
const adminPass = document.getElementById('adminPass');
const modeBadge = document.getElementById('modeBadge');

const adminPanel = document.getElementById('adminPanel');
const playerNameInput = document.getElementById('playerName');
const addPlayerBtn = document.getElementById('addPlayerBtn');
const team1WonBtn = document.getElementById('team1WonBtn');
const team2WonBtn = document.getElementById('team2WonBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const resetAllBtn = document.getElementById('resetAllBtn');

const playersTableBody = document.querySelector('#playersTable tbody');
const historyList = document.getElementById('historyList');

initUI();

// ---------- Inicialización ----------
function initUI() {
  setAdminMode(false);

  loginBtn.onclick = () => {
    if (isAdmin) {
      setAdminMode(false);
    } else {
      loginModal.classList.remove('hidden');
    }
  };
  
  loginCancel.onclick = () => { 
    loginModal.classList.add('hidden'); 
    adminPass.value=''; 
  };
  
  loginSubmit.onclick = tryLogin;

  addPlayerBtn.onclick = addPlayer;
  team1WonBtn.onclick = () => recordMatch(1);
  team2WonBtn.onclick = () => recordMatch(2);
  exportBtn.onclick = exportData;
  importBtn.onchange = importData;
  
  resetAllBtn.onclick = () => {
    if (confirm('¿Seguro que querés borrar todos los datos?')) {
      localStorage.removeItem(LS_KEY);
      location.reload();
    }
  };

  renderAll();
}

// ---------- Login ----------
function tryLogin() {
  if (adminPass.value === ADMIN_PASS) {
    setAdminMode(true);
    loginModal.classList.add('hidden');
    adminPass.value = '';
  } else {
    alert('Contraseña incorrecta');
  }
}

function setAdminMode(val) {
  isAdmin = val;
  adminPanel.style.display = val ? 'block' : 'none';
  modeBadge.textContent = val ? 'Modo: Admin' : 'Modo: Público';
  loginBtn.textContent = val ? 'Salir admin' : 'Ingresar admin';
}

// ---------- Estado ----------
function loadState() {
  const s = localStorage.getItem(LS_KEY);
  if (s) return JSON.parse(s);
  
  // Estado inicial
  return { 
    players: {},
    matches: []
  };
}

function saveState() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

// ---------- Jugadores ----------
function addPlayer() {
  const name = playerNameInput.value.trim();
  
  if (!name) return alert('Nombre del jugador vacío');
  if (state.players[name]) return alert('El jugador ya existe');

  // Crear jugador
  state.players[name] = {
    name: name,
    pj: 0, pg: 0, pp: 0, pts: 0
  };
  
  saveState();
  playerNameInput.value = '';
  renderAll();
  alert(`Jugador "${name}" agregado`);
}

// ---------- Registrar partido 5 vs 5 ----------
function recordMatch(winningTeam) {
  if (!isAdmin) return alert('Solo admin puede registrar partidos.');

  // Obtener jugadores seleccionados
  const team1Players = getSelectedPlayers(1);
  const team2Players = getSelectedPlayers(2);

  // Validaciones
  if (team1Players.length !== 5) {
    return alert('Seleccioná exactamente 5 jugadores para el Equipo 1');
  }
  
  if (team2Players.length !== 5) {
    return alert('Seleccioná exactamente 5 jugadores para el Equipo 2');
  }

  // Verificar que no hay jugadores repetidos entre equipos
  const allPlayers = [...team1Players, ...team2Players];
  const uniquePlayers = [...new Set(allPlayers)];
  if (allPlayers.length !== uniquePlayers.length) {
    return alert('No puede haber jugadores repetidos entre los equipos');
  }

  // Actualizar estadísticas de jugadores
  allPlayers.forEach(playerName => {
    state.players[playerName].pj++;
  });

  // Para el equipo ganador
  const winningPlayers = winningTeam === 1 ? team1Players : team2Players;
  winningPlayers.forEach(playerName => {
    state.players[playerName].pg++;
    state.players[playerName].pts += 3;
  });

  // Para el equipo perdedor
  const losingPlayers = winningTeam === 1 ? team2Players : team1Players;
  losingPlayers.forEach(playerName => {
    state.players[playerName].pp++;
  });

  // Guardar partido
  state.matches.push({
    team1: team1Players,
    team2: team2Players,
    winner: winningTeam,
    date: new Date().toISOString()
  });

  saveState();
  renderAll();
  
  const winnerText = winningTeam === 1 ? 'Equipo 1' : 'Equipo 2';
  alert(`Partido registrado: ${winnerText} ganó`);
}

// Obtener jugadores seleccionados para un equipo
function getSelectedPlayers(teamNumber) {
  const selects = document.querySelectorAll(`.team-player[data-team="${teamNumber}"]`);
  const players = [];
  
  selects.forEach(select => {
    if (select.value) {
      players.push(select.value);
    }
  });
  
  return players;
}

// ---------- Exportar/Importar ----------
function exportData() {
  const dataStr = JSON.stringify(state, null, 2);
  const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  const exportFileDefaultName = `torneo_5vs5_${new Date().toISOString().split('T')[0]}.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  
  reader.onload = function(e) {
    try {
      const importedState = JSON.parse(e.target.result);
      
      // Validar estructura básica
      if (!importedState.players || !importedState.matches) {
        throw new Error('Archivo inválido');
      }
      
      if (confirm('¿Reemplazar todos los datos actuales con los importados?')) {
        state = importedState;
        saveState();
        renderAll();
        alert('Datos importados correctamente');
      }
    } catch (error) {
      alert('Error al importar datos: Archivo corrupto o formato incorrecto');
    }
  };
  
  reader.readAsText(file);
  // Resetear input para permitir importar el mismo archivo otra vez
  event.target.value = '';
}

// ---------- Render ----------
function renderAll() {
  renderPlayerSelects();
  renderPlayersTable();
  renderHistory();
}

function renderPlayerSelects() {
  const selects = document.querySelectorAll('.team-player');
  const playerNames = Object.keys(state.players).sort();
  
  selects.forEach(select => {
    select.innerHTML = '<option value="">Seleccionar jugador</option>';
    
    playerNames.forEach(playerName => {
      const option = document.createElement('option');
      option.value = playerName;
      option.textContent = playerName;
      select.appendChild(option);
    });
  });
}

function renderPlayersTable() {
  playersTableBody.innerHTML = '';
  const players = Object.values(state.players);
  
  if (players.length === 0) {
    playersTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">No hay jugadores registrados</td></tr>';
    return;
  }
  
  players.sort((a, b) => b.pts - a.pts || b.pg - a.pg || a.pp - b.pp || a.name.localeCompare(b.name));
  
  players.forEach((player, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${player.name}</td>
      <td>${player.pj}</td>
      <td>${player.pg}</td>
      <td>${player.pp}</td>
      <td><strong>${player.pts}</strong></td>
    `;
    playersTableBody.appendChild(tr);
  });
}

function renderHistory() {
  historyList.innerHTML = '';
  const matches = state.matches.slice().reverse();
  
  if (matches.length === 0) {
    historyList.innerHTML = '<li style="text-align: center; padding: 20px; color: var(--muted);">No hay partidos registrados</li>';
    return;
  }
  
  matches.forEach(match => {
    const li = document.createElement('li');
    const date = new Date(match.date);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const winnerTeam = match.winner === 1 ? match.team1 : match.team2;
    const loserTeam = match.winner === 1 ? match.team2 : match.team1;
    
    li.innerHTML = `
      <div class="match-teams">
        <div>
          <strong>Equipo 1:</strong> ${match.team1.join(', ')}
        </div>
        <div>VS</div>
        <div>
          <strong>Equipo 2:</strong> ${match.team2.join(', ')}
        </div>
      </div>
      <div class="winner">→ Ganó: Equipo ${match.winner}</div>
      <div style="color: var(--muted); font-size: 0.8rem;">${dateStr}</div>
    `;
    historyList.appendChild(li);
  });
}