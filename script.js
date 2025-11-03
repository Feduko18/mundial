/* Sistema de torneos anuales con sistema de ascensos.
   Admin password: "admin123"
   Guarda datos en localStorage.
*/

const ADMIN_PASS = 'admin123';
const LS_KEY = 'torneo_ascensos_v3';
const MIN_YEAR = 2025;

// Jugadores predeterminados (incluyendo Fandiño)
const DEFAULT_PLAYERS = [
'Cajote', 'Fandiño', 'Fede', 'Ger', 'Girbal', 'Juanse', 'Lauti', 'Palat', 'Pela', 'Salvati', 'Samo', 'Visco', 'Ziegler'

];

let isAdmin = false;
let currentYear = new Date().getFullYear();
if (currentYear < MIN_YEAR) currentYear = MIN_YEAR;
let state = loadState();

// Elementos de UI
const loginBtn = document.getElementById('loginBtn');
const loginModal = document.getElementById('loginModal');
const loginSubmit = document.getElementById('loginSubmit');
const loginCancel = document.getElementById('loginCancel');
const adminPass = document.getElementById('adminPass');
const modeBadge = document.getElementById('modeBadge');
const currentYearElem = document.getElementById('currentYear');
const prevYearBtn = document.getElementById('prevYearBtn');
const nextYearBtn = document.getElementById('nextYearBtn');
const currentYearBadge = document.getElementById('currentYearBadge');
const currentYearTable = document.getElementById('currentYearTable');
const historyYear = document.getElementById('historyYear');

const adminPanel = document.getElementById('adminPanel');
const playerNameInput = document.getElementById('playerName');
const addPlayerBtn = document.getElementById('addPlayerBtn');
const team1WonBtn = document.getElementById('team1WonBtn');
const team2WonBtn = document.getElementById('team2WonBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const resetYearBtn = document.getElementById('resetYearBtn');

const playersTableBody = document.querySelector('#playersTable tbody');
const historyList = document.getElementById('historyList');
const winnersList = document.getElementById('winnersList');

initUI();

// ---------- Inicialización ----------
function initUI() {
  setAdminMode(false);
  updateYearDisplay();

  // Navegación de años
  prevYearBtn.onclick = () => changeYear(-1);
  nextYearBtn.onclick = () => changeYear(1);

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
  
  resetYearBtn.onclick = () => {
    if (confirm(`¿Seguro que querés resetear todos los datos del ${currentYear}?`)) {
      resetCurrentYear();
    }
  };

  renderAll();
}

// ---------- Gestión de Años ----------
function changeYear(delta) {
  const newYear = currentYear + delta;
  if (newYear >= MIN_YEAR) {
    currentYear = newYear;
    updateYearDisplay();
    renderAll();
  }
}

function updateYearDisplay() {
  currentYearElem.textContent = currentYear;
  currentYearBadge.textContent = currentYear;
  currentYearTable.textContent = currentYear;
  historyYear.textContent = currentYear;
  prevYearBtn.disabled = currentYear <= MIN_YEAR;
}

function resetCurrentYear() {
  if (state.years[currentYear]) {
    delete state.years[currentYear];
    saveState();
    renderAll();
    alert(`Datos del ${currentYear} reseteados`);
  }
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
  
  // Estado inicial con jugadores predeterminados
  const initialState = { 
    years: {
      [MIN_YEAR]: {
        players: {},
        matches: [],
        champion: null
      }
    }
  };
  
  // Agregar jugadores predeterminados al año inicial
  const yearData = initialState.years[MIN_YEAR];
  DEFAULT_PLAYERS.forEach(playerName => {
    yearData.players[playerName] = createNewPlayer(playerName);
  });
  
  return initialState;
}

function saveState() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function getCurrentYearData() {
  if (!state.years[currentYear]) {
    state.years[currentYear] = {
      players: {},
      matches: [],
      champion: null
    };
    
    // Agregar jugadores predeterminados al nuevo año
    const yearData = state.years[currentYear];
    DEFAULT_PLAYERS.forEach(playerName => {
      yearData.players[playerName] = createNewPlayer(playerName);
    });
    
    saveState();
  }
  return state.years[currentYear];
}

// ---------- Jugadores ----------
function createNewPlayer(name) {
  return {
    name: name,
    pj: 0, pg: 0, pp: 0, pts: 0,
    mundialMG: 0,
    currentPhase: 'groups',
    bestPhase: 'groups'
  };
}

function addPlayer() {
  const name = playerNameInput.value.trim();
  if (!name) return alert('Nombre del jugador vacío');

  const yearData = getCurrentYearData();
  if (yearData.players[name]) return alert('El jugador ya existe este año');

  // Crear jugador para el año actual
  yearData.players[name] = createNewPlayer(name);
  
  saveState();
  playerNameInput.value = '';
  renderAll();
  alert(`Jugador "${name}" agregado al ${currentYear}`);
}

// ---------- Registrar partido con sistema de ascensos ----------
function recordMatch(winningTeam) {
  if (!isAdmin) return alert('Solo admin puede registrar partidos.');

  const team1Players = getSelectedPlayers(1);
  const team2Players = getSelectedPlayers(2);

  // Validaciones
  if (team1Players.length !== 5) {
    return alert('Seleccioná exactamente 5 jugadores para el Equipo 1');
  }
  
  if (team2Players.length !== 5) {
    return alert('Seleccioná exactamente 5 jugadores para el Equipo 2');
  }

  const allPlayers = [...team1Players, ...team2Players];
  const uniquePlayers = [...new Set(allPlayers)];
  if (allPlayers.length !== uniquePlayers.length) {
    return alert('No puede haber jugadores repetidos entre los equipos');
  }

  const yearData = getCurrentYearData();

  // Determinar la fase del partido (la fase más avanzada entre los jugadores)
  const phases = allPlayers.map(playerName => {
    const player = yearData.players[playerName];
    return getPhaseValue(player.currentPhase);
  });
  const maxPhaseValue = Math.max(...phases);
  const currentPhase = getPhaseFromValue(maxPhaseValue);

  console.log('Fase del partido:', currentPhase, 'de jugadores:', allPlayers);

  // Actualizar estadísticas básicas de todos los jugadores
  allPlayers.forEach(playerName => {
    const player = yearData.players[playerName];
    player.pj++;
  });

  // Para el equipo ganador
  const winningPlayers = winningTeam === 1 ? team1Players : team2Players;
  winningPlayers.forEach(playerName => {
    const player = yearData.players[playerName];
    player.pg++;
    player.pts += 3;

    // Sistema de ascensos - solo en fases eliminatorias
    if (currentPhase !== 'groups') {
      player.mundialMG++;  // Contar partido ganado en fase eliminatoria
    }

    // AVANZAR DE FASE (siempre que no sea la final)
    const nextPhase = getNextPhase(currentPhase);
    if (nextPhase) {
      player.currentPhase = nextPhase;
      console.log(`${playerName} avanza de ${currentPhase} a ${nextPhase}`);
      
      // Actualizar mejor fase si es mejor que la actual
      if (getPhaseValue(nextPhase) > getPhaseValue(player.bestPhase)) {
        player.bestPhase = nextPhase;
      }
    } else if (currentPhase === 'final') {
      // Si es la final y ganó, es el campeón
      yearData.champion = playerName;
      console.log(`${playerName} es el campeón del ${currentYear}`);
    }
  });

  // Para el equipo perdedor - VOLVER A FASE DE GRUPOS si estaba en eliminatoria
  const losingPlayers = winningTeam === 1 ? team2Players : team1Players;
  losingPlayers.forEach(playerName => {
    const player = yearData.players[playerName];
    player.pp++;
    
    // Volver a fase de grupos si pierde en fase eliminatoria
    if (currentPhase !== 'groups') {
      player.currentPhase = 'groups';
      console.log(`${playerName} vuelve a grupos`);
    }
  });

  // Guardar partido
  yearData.matches.push({
    team1: team1Players,
    team2: team2Players,
    winner: winningTeam,
    phase: currentPhase,
    date: new Date().toISOString()
  });

  saveState();
  renderAll();
  
  const winnerText = winningTeam === 1 ? 'Equipo 1' : 'Equipo 2';
  const phaseNames = {
    groups: 'Fase de Grupos',
    round16: 'Octavos de Final',
    quarters: 'Cuartos de Final',
    semis: 'Semifinales',
    final: 'Final'
  };
  
  let message = `Partido de ${phaseNames[currentPhase]} registrado\n`;
  message += `Ganó: ${winnerText}\n\n`;
  
  if (currentPhase !== 'groups') {
    message += `✅ Ganadores: +1 Mundial MG y avanzan de fase\n`;
    message += `❌ Perdedores: vuelven a Grupos`;
    
    if (currentPhase === 'final') {
      message += `\n\n🏆 ${winningPlayers[0]} es el NUEVO CAMPEÓN!`;
    }
  }
  
  alert(message);
}

// Obtener la siguiente fase
function getNextPhase(currentPhase) {
  const phases = ['groups', 'round16', 'quarters', 'semis', 'final'];
  const currentIndex = phases.indexOf(currentPhase);
  return phases[currentIndex + 1] || null;
}

// Valor numérico de las fases para comparación
function getPhaseValue(phase) {
  const values = {
    'groups': 1,
    'round16': 2,
    'quarters': 3,
    'semis': 4,
    'final': 5
  };
  return values[phase] || 0;
}

// Obtener fase desde valor numérico
function getPhaseFromValue(value) {
  const phases = {
    1: 'groups',
    2: 'round16',
    3: 'quarters',
    4: 'semis',
    5: 'final'
  };
  return phases[value] || 'groups';
}

// ---------- Obtener jugadores seleccionados ----------
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
  const exportFileDefaultName = `torneo_ascensos_${new Date().toISOString().split('T')[0]}.json`;
  
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
      
      if (!importedState.years) {
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
  event.target.value = '';
}

// ---------- Render ----------
function renderAll() {
  renderPlayerSelects();
  renderPlayersTable();
  renderHistory();
  renderWinners();
}

function renderPlayerSelects() {
  const selects = document.querySelectorAll('.team-player');
  const yearData = getCurrentYearData();
  const playerNames = Object.keys(yearData.players).sort();
  
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
  const yearData = getCurrentYearData();
  let players = Object.values(yearData.players);
  
  if (players.length === 0) {
    playersTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">No hay jugadores registrados este año</td></tr>';
    return;
  }

  // Ordenar por Mundial MG (partidos ganados en eliminatorias) y luego por puntos
  players.sort((a, b) => b.mundialMG - a.mundialMG || b.pts - a.pts || b.pg - a.pg || a.pp - b.pp);

  // Actualizar título con cantidad de jugadores
  document.querySelector('.standingsCard h2').innerHTML = 
    `Tabla de Posiciones - Mundial ${currentYear} <span class="player-count">(${players.length} jugadores)</span>`;

  players.forEach((player, index) => {
    const tr = document.createElement('tr');
    
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${player.name} ${yearData.champion === player.name ? '<span class="champion-badge">🏆</span>' : ''}</td>
      <td>${player.pj}</td>
      <td>${player.pg}</td>
      <td>${player.pp}</td>
      <td><strong>${player.pts}</strong></td>
      <td class="mundial-mg-cell"><strong>${player.mundialMG}</strong></td>
      <td>
        <span class="current-phase-badge phase-${player.currentPhase}-badge">
          ${getPhaseName(player.currentPhase)}
        </span>
      </td>
    `;
    
    playersTableBody.appendChild(tr);
  });
}

function getPhaseName(phase) {
  const names = {
    'groups': 'Grupos',
    'round16': 'Octavos',
    'quarters': 'Cuartos',
    'semis': 'Semifinal',
    'final': 'Final'
  };
  return names[phase] || phase;
}

function renderHistory() {
  historyList.innerHTML = '';
  const yearData = getCurrentYearData();

  // Obtener todos los partidos del año actual
  let matches = yearData.matches.slice().reverse();
  
  if (matches.length === 0) {
    historyList.innerHTML = '<li style="text-align: center; padding: 20px; color: var(--muted);">No hay partidos registrados este año</li>';
    return;
  }
  
  matches.forEach(match => {
    const li = document.createElement('li');
    const date = new Date(match.date);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    const phaseNames = {
      groups: 'Grupos',
      round16: 'Octavos',
      quarters: 'Cuartos',
      semis: 'Semifinal',
      final: 'Final'
    };
    
    li.innerHTML = `
      <div style="margin-bottom: 4px;">
        <strong>${phaseNames[match.phase]}</strong> - ${dateStr}
      </div>
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
    `;
    historyList.appendChild(li);
  });
}

function renderWinners() {
  winnersList.innerHTML = '';
  const years = Object.keys(state.years).sort((a, b) => b - a);
  
  years.forEach(year => {
    const yearData = state.years[year];
    if (yearData.champion) {
      const champion = yearData.players[yearData.champion];
      const div = document.createElement('div');
      div.className = 'winner-card gold';
      div.innerHTML = `
        <div class="winner-year">${year}</div>
        <div class="winner-name">🏆 ${champion.name}</div>
        <div class="winner-stats">${champion.pg} PG • ${champion.pts} Pts • ${champion.mundialMG} MG</div>
      `;
      winnersList.appendChild(div);
    }
  });
  
  if (winnersList.children.length === 0) {
    winnersList.innerHTML = '<div style="text-align: center; color: var(--muted); padding: 20px;">No hay campeones registrados</div>';
  }

}
