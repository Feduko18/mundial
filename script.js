/* Sistema de torneos anuales con sistema de ascensos.
   Admin password: "admin123"
   Guarda datos en localStorage.
*/

/* Sistema de torneos anuales con sistema de ascensos.
   Admin password: "admin123"
   Guarda datos en localStorage.
*/
/* Sistema de torneos anuales con sistema de ascensos - Versión Estática
   Admin password: "admin123"
   Los datos se cargan desde data.js y se exportan para actualizar el repositorio
*/

const ADMIN_PASS = 'admin123';
const MIN_YEAR = 2025;

// Jugadores predeterminados (incluyendo Fandiño)
const DEFAULT_PLAYERS = [
'Cajote', 'Fandiño', 'Fede', 'Ger', 'Girbal', 'Juanse', 'Lauti', 'Palat', 'Pela', 'Salvati', 'Samo', 'Visco', 'Ziegler'
];

let isAdmin = false;
let currentYear = new Date().getFullYear();
if (currentYear < MIN_YEAR) currentYear = MIN_YEAR;

// Cargar estado desde datos estáticos
let state = window.torneoData;

// Si no hay datos, crear estado inicial con jugadores
if (!state || !state.years || !state.years[2025] || Object.keys(state.years[2025].players).length === 0) {
  state = {
    currentYear: 2025,
    years: {
      2025: {
        players: {},
        matches: [],
        champions: []
      }
    }
  };
  
  // Agregar jugadores predeterminados
  const yearData = state.years[2025];
  DEFAULT_PLAYERS.forEach(playerName => {
    yearData.players[playerName] = createNewPlayer(playerName);
  });
  
  console.log("Jugadores creados manualmente:", Object.keys(yearData.players));
}

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
    renderAll();
    alert(`Datos del ${currentYear} reseteados (solo en esta sesión)`);
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
function getCurrentYearData() {
  if (!state.years[currentYear]) {
    state.years[currentYear] = {
      players: {},
      matches: [],
      champions: []
    };
    
    // Agregar jugadores predeterminados al nuevo año
    const yearData = state.years[currentYear];
    DEFAULT_PLAYERS.forEach(playerName => {
      yearData.players[playerName] = createNewPlayer(playerName);
    });
  }
  return state.years[currentYear];
}

// ---------- Jugadores ----------
function createNewPlayer(name) {
  return {
    name: name,
    pj: 0, pg: 0, pp: 0, pts: 0,
    mundialMG: 0,
    currentPhase: 'groups1',
    bestPhase: 'groups1'
  };
}

function addPlayer() {
  const name = playerNameInput.value.trim();
  if (!name) return alert('Nombre del jugador vacío');

  const yearData = getCurrentYearData();
  if (yearData.players[name]) return alert('El jugador ya existe este año');

  // Crear jugador para el año actual
  yearData.players[name] = createNewPlayer(name);
  
  playerNameInput.value = '';
  renderAll();
  alert(`Jugador "${name}" agregado al ${currentYear} (cambios locales)`);
}

// ---------- Funciones auxiliares de fases ----------
function getNextPhase(currentPhase) {
  const phases = ['groups1', 'groups2', 'round16', 'quarters', 'semis', 'final'];
  const currentIndex = phases.indexOf(currentPhase);
  return phases[currentIndex + 1] || null;
}

function getPhaseValue(phase) {
  const values = {
    'groups1': 1,
    'groups2': 2,
    'round16': 3,
    'quarters': 4,
    'semis': 5,
    'final': 6
  };
  return values[phase] || 0;
}

function getPhaseFromValue(value) {
  const phases = {
    1: 'groups1',
    2: 'groups2',
    3: 'round16',
    4: 'quarters',
    5: 'semis',
    6: 'final'
  };
  return phases[value] || 'groups1';
}

function getPhaseName(phase) {
  const names = {
    'groups1': 'Fase de Grupos 1',
    'groups2': 'Fase de Grupos 2',
    'round16': 'Octavos',
    'quarters': 'Cuartos',
    'semis': 'Semifinal',
    'final': 'Final'
  };
  return names[phase] || phase;
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

  // Determinar la fase del partido (la fase más avanzada entre los jugadores) solo para el historial
  const phases = allPlayers.map(playerName => {
    const player = yearData.players[playerName];
    return getPhaseValue(player.currentPhase);
  });
  const maxPhaseValue = Math.max(...phases);
  const matchPhase = getPhaseFromValue(maxPhaseValue);

  console.log('Fase del partido (historial):', matchPhase, 'de jugadores:', allPlayers);

  // Actualizar estadísticas básicas de todos los jugadores
  allPlayers.forEach(playerName => {
    const player = yearData.players[playerName];
    player.pj++;
  });

  // Para el equipo ganador - CADA JUGADOR AVANZA INDIVIDUALMENTE
  const winningPlayers = winningTeam === 1 ? team1Players : team2Players;
  winningPlayers.forEach(playerName => {
    const player = yearData.players[playerName];
    player.pg++;
    player.pts += 3;

    // INCREMENTAR MG si está en fase eliminatoria (a partir de round16)
    if (getPhaseValue(player.currentPhase) >= getPhaseValue('round16')) {
      player.mundialMG++;
    }

    // AVANZAR DE FASE INDIVIDUALMENTE (siempre que no sea la final)
    const nextPhase = getNextPhase(player.currentPhase);
    if (nextPhase) {
      player.currentPhase = nextPhase;
      console.log(`${playerName} avanza de ${player.currentPhase} a ${nextPhase}`);
      
      // Actualizar mejor fase si es mejor que la actual
      if (getPhaseValue(nextPhase) > getPhaseValue(player.bestPhase)) {
        player.bestPhase = nextPhase;
      }
    } else if (player.currentPhase === 'final') {
      // Si es la final y ganó, es campeón y vuelve a Grupos 1
      if (!yearData.champions) yearData.champions = [];
      yearData.champions.push(playerName);
      player.mundialMG++; // Sumar MG por ganar la final
      player.currentPhase = 'groups1'; // Volver a Grupos 1
      console.log(`${playerName} es CAMPEÓN del ${currentYear} y vuelve a Grupos 1`);
    }
  });

  // Para el equipo perdedor - CADA JUGADOR VUELVE A GRUPOS 1 si está en Grupos 2 o superior
  const losingPlayers = winningTeam === 1 ? team2Players : team1Players;
  losingPlayers.forEach(playerName => {
    const player = yearData.players[playerName];
    player.pp++;
    
    // Volver a fase de grupos 1 si pierde en Grupos 2 o cualquier fase superior
    if (getPhaseValue(player.currentPhase) >= getPhaseValue('groups2')) {
      player.currentPhase = 'groups1';
      console.log(`${playerName} vuelve a Grupos 1 por perder en ${player.currentPhase}`);
    }
  });

  // Guardar partido
  yearData.matches.push({
    team1: team1Players,
    team2: team2Players,
    winner: winningTeam,
    phase: matchPhase,
    date: new Date().toISOString()
  });

  renderAll();
  
  const winnerText = winningTeam === 1 ? 'Equipo 1' : 'Equipo 2';
  const phaseNames = {
    groups1: 'Fase de Grupos 1',
    groups2: 'Fase de Grupos 2', 
    round16: 'Octavos de Final',
    quarters: 'Cuartos de Final',
    semis: 'Semifinales',
    final: 'Final'
  };
  
  let message = `Partido de ${phaseNames[matchPhase]} registrado\n`;
  message += `Ganó: ${winnerText}\n\n`;

  if (matchPhase === 'final') {
    const newChampions = winningTeam === 1 ? team1Players : team2Players;
    message += `🏆 ${newChampions.join(', ')} SON CAMPEONES!\n`;
    message += `✅ Suman 1 MG y vuelven a Grupos 1\n`;
  } else {
    message += `✅ Ganadores: Avanzan individualmente de fase\n`;
  }

  message += `❌ Perdedores: Si estaban en Grupos 2 o superior, vuelven a Grupos 1\n\n`;
  message += `⚠️ Cambios locales - Exportá data.js para hacerlos permanentes`;

  alert(message);
}

// ---------- Exportar/Importar ----------
function exportData() {
  const dataJS = `// data.js - Datos estáticos del torneo
window.torneoData = ${JSON.stringify(state, null, 2)};`;
  
  const blob = new Blob([dataJS], { type: 'application/javascript' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'data.js';
  a.click();
  
  alert('data.js generado. Reemplazá el archivo en tu repositorio y hacé commit para actualizar la web.');
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
      
      if (confirm('¿Reemplazar todos los datos actuales con los importados?\n\n¡Esto sobrescribirá todos los datos actuales en esta sesión!')) {
        state = importedState;
        renderAll();
        alert('Datos importados correctamente (solo en esta sesión)');
      }
    } catch (error) {
      alert('Error al importar datos: Archivo corrupto o formato incorrecto');
    }
  };
  
  reader.readAsText(file);
  // Limpiar solo el input de importación
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
  players.sort((a, b) => b.mundialMG - a.mundialMG || b.pts - a.pts || b.pg - a.pg || a.pp - b.pp || a.name.localeCompare(b.name));

  // Actualizar título con cantidad de jugadores
  document.querySelector('.standingsCard h2').innerHTML = 
    `Tabla de Posiciones - Mundial ${currentYear} <span class="player-count">(${players.length} jugadores)</span>`;

  players.forEach((player, index) => {
    const tr = document.createElement('tr');
    
    tr.innerHTML = `
      <td>${index + 1}</td>
      <td>${player.name} ${yearData.champions && yearData.champions.includes(player.name) ? '<span class="champion-badge">🏆</span>' : ''}</td>
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
      groups1: 'Fase de Grupos 1',
      groups2: 'Fase de Grupos 2',
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
    if (yearData.champions && yearData.champions.length > 0) {
      // Para cada campeón del año, crear una tarjeta
      yearData.champions.forEach(championName => {
        const champion = yearData.players[championName];
        const div = document.createElement('div');
        div.className = 'winner-card gold';
        div.innerHTML = `
          <div class="winner-year">${year}</div>
          <div class="winner-name">🏆 ${champion.name}</div>
          <div class="winner-stats">${champion.pg} PG • ${champion.pts} Pts • ${champion.mundialMG} MG</div>
        `;
        winnersList.appendChild(div);
      });
    }
  });
  
  if (winnersList.children.length === 0) {
    winnersList.innerHTML = '<div style="text-align: center; color: var(--muted); padding: 20px;">No hay campeones registrados</div>';
  }
};