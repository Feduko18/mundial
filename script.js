/* script.js
   Sistema: Mundial individual por personas, 2 fases por año y Global anual.
   Admin password fija: "admin123".
   Persistencia: localStorage.
*/

// ---------- Config y almacenamiento ----------
const ADMIN_PASS = 'admin123';
const LS_KEY = 'mi_mundial_v1';

// Years: 2025 visible, 2026/2027 ocultos por defecto (fácil activar)
const YEARS = [
  {year:2025, visible:true},
  {year:2026, visible:false},
  {year:2027, visible:false}
];

const DEFAULT_STATE = {
  // estructura: seasons[year][phase] => { players:[], matches:[], bracket: {matches...}, history:[] }
  seasons: {}, // creado dinámicamente
  playersGlobal: {}, // stats permanentes por jugador {name, pj, pg, pp, semis, finalsPlayed, finalsWon, titles, seasonsPlayed:[]}
  history: [] // registros de campeones por season {year, phase, champion, date}
};

// Crea estructura inicial para años/fases
let state = loadState();

function ensureSeason(y) {
  if(!state.seasons[y]) state.seasons[y] = {
    phase1: createEmptyPhase(),
    phase2: createEmptyPhase(),
    global: createEmptyPhase() // global no tiene bracket, se calcula
  };
}
function createEmptyPhase(){ return { players: [], matches: [], bracket: null }; }

function saveState(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
function loadState(){
  const s = localStorage.getItem(LS_KEY);
  if(s) return JSON.parse(s);
  const st = JSON.parse(JSON.stringify(DEFAULT_STATE));
  // crear seasons por YEARS
  for(const y of YEARS) st.seasons[y.year] = createDefaultSeason();
  return st;
}
function createDefaultSeason(){
  return { phase1:createEmptyPhase(), phase2:createEmptyPhase(), global:createEmptyPhase() };
}

// ---------- UI refs ----------
const yearSelect = document.getElementById('yearSelect');
const phaseSelect = document.getElementById('phaseSelect');
const standingsTitle = document.getElementById('standingsTitle');
const standingsTableBody = document.querySelector('#standingsTable tbody');
const playerDetail = document.getElementById('playerDetail');
const bracketDiv = document.getElementById('bracket');
const bracketInfo = document.getElementById('bracketInfo');
const historyList = document.getElementById('historyList');

const loginBtn = document.getElementById('loginBtn');
const loginModal = document.getElementById('loginModal');
const loginSubmit = document.getElementById('loginSubmit');
const loginCancel = document.getElementById('loginCancel');
const adminPass = document.getElementById('adminPass');
const modeBadge = document.getElementById('modeBadge');

const adminPanel = document.getElementById('adminPanel');
const addPlayerBtn = document.getElementById('addPlayerBtn');
const playerNameInput = document.getElementById('playerName');
const generateBracketBtn = document.getElementById('generateBracketBtn');
const resetBracketBtn = document.getElementById('resetBracketBtn');
const finalizeBtn = document.getElementById('finalizeBtn');

const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const importFile = document.getElementById('importFile');
const resetAllBtn = document.getElementById('resetAllBtn');

let isAdmin = false;
let currentYear = 2025;
let currentPhase = 'phase1';

// ---------- Inicialización UI ----------
function initUI(){
  // llenar years
  yearSelect.innerHTML = '';
  for(const y of YEARS){
    const opt = document.createElement('option');
    opt.value = y.year;
    opt.textContent = y.year + (y.visible ? '' : ' (deshabilitado)');
    if(!y.visible) opt.disabled = true;
    yearSelect.appendChild(opt);
  }
  yearSelect.value = currentYear;
  phaseSelect.value = currentPhase;

  // esconder panel admin si no es admin
  setAdminMode(false);

  // listeners
  loginBtn.addEventListener('click', () => loginModal.classList.remove('hidden'));
  loginCancel.addEventListener('click', () => { loginModal.classList.add('hidden'); adminPass.value=''; });
  loginSubmit.addEventListener('click', tryLogin);

  yearSelect.addEventListener('change', (e)=> { currentYear = parseInt(e.target.value); renderAll(); });
  phaseSelect.addEventListener('change', (e)=> { currentPhase = e.target.value; renderAll(); });

  addPlayerBtn.addEventListener('click', addPlayer);
  generateBracketBtn.addEventListener('click', generateBracket);
  resetBracketBtn.addEventListener('click', resetBracket);
  finalizeBtn.addEventListener('click', finalizeTournament);

  exportBtn.addEventListener('click', exportJSON);
  importBtn.addEventListener('click', ()=> importFile.click());
  importFile.addEventListener('change', importJSON);
  resetAllBtn.addEventListener('click', ()=> { if(confirm('Resetear TODO y borrar datos?')) { localStorage.removeItem(LS_KEY); location.reload(); }});

  renderAll();
}
function tryLogin(){
  if(adminPass.value === ADMIN_PASS){
    setAdminMode(true);
    loginModal.classList.add('hidden');
    adminPass.value = '';
    alert('Ingresaste como administrador');
  } else {
    alert('Contraseña incorrecta');
  }
}
function setAdminMode(val){
  isAdmin = val;
  adminPanel.style.display = val ? 'block' : 'none';
  modeBadge.textContent = val ? 'Modo: Admin' : 'Modo: Público';
  loginBtn.textContent = val ? 'Salir admin' : 'Ingresar admin';
  if(!val){
    // si se presiona salir
    loginBtn.addEventListener('click', ()=> { setAdminMode(false); renderAll(); }, {once:true});
  } else {
    loginBtn.addEventListener('click', ()=> { setAdminMode(false); renderAll(); }, {once:true});
  }
}

// ---------- Lógica de players y stats ----------
function addPlayer(){
  const name = playerNameInput.value.trim();
  if(!name){ alert('Nombre vacío'); return; }
  // evitar duplicados global
  const phaseObj = getCurrentPhase();
  if(phaseObj.players.includes(name)){ alert('Jugador ya agregado en esta fase'); playerNameInput.value=''; return; }
  // add to current phase
  phaseObj.players.push(name);
  // ensure global registry
  if(!state.playersGlobal[name]) {
    state.playersGlobal[name] = { name, pj:0, pg:0, pp:0, semis:0, finalsPlayed:0, finalsWon:0, titles:0, seasonsPlayed:[] };
  }
  // mark season as played later when participate in a tournament
  saveState();
  playerNameInput.value='';
  renderAll();
}

// ---------- Bracket (16 players) ----------
function generateBracket(){
  if(!isAdmin){ alert('Solo admin'); return; }
  const phaseObj = getCurrentPhase();
  if(phaseObj.players.length < 16){ alert('Se necesitan 16 jugadores para generar el bracket'); return; }
  // usar los primeros 16 (o mezclar)
  const players = phaseObj.players.slice(0,16);
  // shuffle
  shuffle(players);
  // crear matches octavos (8)
  const matches = [];
  let mid = 0;
  for(let i=0;i<8;i++){
    matches.push({ id: `r1m${i}`, round:1, a:players[mid++], b:players[mid++], winner:null });
  }
  // crear estructura con slots para siguientes rondas (sin asignar aún)
  const bracket = { rounds: {
    1: matches,
    2: Array.from({length:4}).map((_,i)=>({ id:`r2m${i}`, round:2, a:null, b:null, winner:null })),
    3: Array.from({length:2}).map((_,i)=>({ id:`r3m${i}`, round:3, a:null, b:null, winner:null })),
    4: [{ id:'r4m0', round:4, a:null, b:null, winner:null }]
  }};
  phaseObj.bracket = bracket;
  // clear matches list (phaseObj.matches used for historical listing)
  phaseObj.matches = [];
  saveState();
  renderAll();
}

// avanzar ganador (admin hace click en botón)
function setMatchWinner(round, matchId, winnerName){
  if(!isAdmin){ alert('Solo admin'); return; }
  const phaseObj = getCurrentPhase();
  if(!phaseObj.bracket) return;
  const roundMatches = phaseObj.bracket.rounds[round];
  const match = roundMatches.find(m => m.id === matchId);
  if(!match) return;
  match.winner = winnerName;

  // registrar partido en historial de la fase (PJ, PG, PP)
  // Asumimos que cuando se asigna ganador, el partido quedó jugado.
  phaseObj.matches.push({
    round, a: match.a, b: match.b, winner: winnerName, date: new Date().toISOString()
  });

  // actualizar stats globales: ambos aumentan PJ, ganador PG, perdedor PP
  if(match.a) state.playersGlobal[match.a].pj++;
  if(match.b) state.playersGlobal[match.b].pj++;
  if(match.a && match.b){
    const loser = (winnerName === match.a) ? match.b : match.a;
    state.playersGlobal[winnerName].pg++;
    state.playersGlobal[loser].pp++;
  } else {
    // bye case - don't increment pp
    if(match.a && winnerName===match.a) state.playersGlobal[winnerName].pg++;
    if(match.b && winnerName===match.b) state.playersGlobal[winnerName].pg++;
  }

  // si el match es semifinal (round 3) y el jugador participa, marcar semis jugada
  if(round === 3){
    if(match.a) state.playersGlobal[match.a].semis = (state.playersGlobal[match.a].semis||0) + 1;
    if(match.b) state.playersGlobal[match.b].semis = (state.playersGlobal[match.b].semis||0) + 1;
  }
  // si el match es final (round 4), incrementar finalsPlayed y finalsWon si corresponde
  if(round === 4){
    if(match.a) state.playersGlobal[match.a].finalsPlayed = (state.playersGlobal[match.a].finalsPlayed||0) + 1;
    if(match.b) state.playersGlobal[match.b].finalsPlayed = (state.playersGlobal[match.b].finalsPlayed||0) + 1;
    if(winnerName) {
      state.playersGlobal[winnerName].finalsWon = (state.playersGlobal[winnerName].finalsWon||0) + 1;
    }
  }

  // avanzar ganador al siguiente round slot
  if(round < 4){
    const nextRound = round + 1;
    // encontrar primer slot vacío en nextRound
    const nextMatches = phaseObj.bracket.rounds[nextRound];
    // el índice del partido de este round
    const idx = phaseObj.bracket.rounds[round].indexOf(match);
    // target match index para next round = Math.floor(idx/2)
    const target = Math.floor(idx/2);
    const slot = nextMatches[target];
    if(!slot.a) slot.a = winnerName;
    else if(!slot.b) slot.b = winnerName;
  } else {
    // final: campeón decidido. No avanzar.
  }

  saveState();
  renderAll();
}

// finalizar torneo: otorgar título al campeón y registrar historial
function finalizeTournament(){
  if(!isAdmin) { alert('Solo admin'); return; }
  const phaseObj = getCurrentPhase();
  if(!phaseObj.bracket) { alert('No hay torneo activo'); return; }
  const final = phaseObj.bracket.rounds[4][0];
  if(!final || !final.winner){ alert('La final no tiene ganador asignado'); return; }
  const champ = final.winner;
  state.playersGlobal[champ].titles = (state.playersGlobal[champ].titles||0) + 1;
  // marcar season como jugada por el campeón (temporadas jugadas)
  if(!state.playersGlobal[champ].seasonsPlayed.includes(`${currentYear}-${currentPhase}`)){
    state.playersGlobal[champ].seasonsPlayed.push(`${currentYear}-${currentPhase}`);
  }
  // registrar en history
  state.history.push({ year: currentYear, phase: currentPhase, champion: champ, date: new Date().toISOString() });
  // borrar bracket (reseteamos bracket pero mantenemos players list)
  phaseObj.bracket = null;
  saveState();
  alert(`¡Torneo finalizado! Campeón: ${champ}`);
  renderAll();
}

function resetBracket(){
  if(!isAdmin) { alert('Solo admin'); return; }
  const phaseObj = getCurrentPhase();
  if(!phaseObj) return;
  if(confirm('Resetear bracket actual (los resultados se perderán)?')){
    phaseObj.bracket = null;
    phaseObj.matches = [];
    saveState();
    renderAll();
  }
}

// ---------- Utilidades ----------
function getCurrentPhase(){
  ensureSeason(currentYear);
  return state.seasons[currentYear][currentPhase];
}
function shuffle(array){ for(let i=array.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [array[i],array[j]]=[array[j],array[i]]; } }
function exportJSON(){
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='mundial_data.json'; a.click();
  URL.revokeObjectURL(url);
}
function importJSON(e){
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try{
      const data = JSON.parse(reader.result);
      if(confirm('¿Sobrescribir datos actuales con el archivo importado?')) {
        state = data;
        saveState();
        renderAll();
        alert('Importado correctamente');
      }
    } catch(err){ alert('JSON inválido'); }
  };
  reader.readAsText(f);
  importFile.value = '';
}

// ---------- Render / UI helpers ----------
function renderAll(){
  ensureSeason(currentYear);
  renderStandings();
  renderBracket();
  renderHistory();
  bracketInfo.textContent = `${currentYear} • ${phaseLabel(currentPhase)}`;
}
function phaseLabel(p){
  if(p==='phase1') return 'Fase 1 (ene-jun)';
  if(p==='phase2') return 'Fase 2 (jul-dic)';
  if(p==='global') return 'Global anual';
  return p;
}
function renderStandings(){
  const phaseObj = getCurrentPhase();
  // compute stats for this phase: iterate phaseObj.matches
  // reset computed table
  const stats = {};
  // ensure players appear with zeros
  for(const name of phaseObj.players){
    stats[name] = { name, pj:0, pg:0, pp:0, semis:0, finalsPlayed:0, finalsWon:0, titles: state.playersGlobal[name]?.titles || 0 };
  }
  // fill from matches recorded in phase
  for(const m of phaseObj.matches || []){
    if(!m.a || !m.b) continue;
    if(!stats[m.a]) stats[m.a] = { name:m.a, pj:0, pg:0, pp:0, semis:0, finalsPlayed:0, finalsWon:0, titles: state.playersGlobal[m.a]?.titles || 0 };
    if(!stats[m.b]) stats[m.b] = { name:m.b, pj:0, pg:0, pp:0, semis:0, finalsPlayed:0, finalsWon:0, titles: state.playersGlobal[m.b]?.titles || 0 };
    stats[m.a].pj++; stats[m.b].pj++;
    if(m.winner === m.a){ stats[m.a].pg++; stats[m.b].pp++; }
    else if(m.winner === m.b){ stats[m.b].pg++; stats[m.a].pp++; }
    // semis/final counts per round
    if(m.round === 3){
      stats[m.a].semis++; stats[m.b].semis++;
    }
    if(m.round === 4){
      stats[m.a].finalsPlayed++; stats[m.b].finalsPlayed++;
      if(m.winner) stats[m.winner].finalsWon = (stats[m.winner].finalsWon||0) + 1;
    }
  }

  // Convert to array and sort por PG desc -> PJ asc -> name
  const arr = Object.values(stats);
  arr.sort((A,B) => {
    if(B.pg !== A.pg) return B.pg - A.pg;
    if(A.pj !== B.pj) return A.pj - B.pj;
    return A.name.localeCompare(B.name,'es',{sensitivity:'base'});
  });

  // si seleccionaste Global anual, calculamos sumas de phase1+phase2
  if(currentPhase === 'global'){
    // combine phase1 and phase2 stored matches
    const p1 = state.seasons[currentYear].phase1;
    const p2 = state.seasons[currentYear].phase2;
    const map = {};
    function accumulate(phase){
      for(const name of (phase.players||[])){
        if(!map[name]) map[name] = { name, pj:0, pg:0, pp:0, semis:0, finalsPlayed:0, finalsWon:0, titles: state.playersGlobal[name]?.titles || 0 };
      }
      for(const m of (phase.matches||[])){
        if(!m.a || !m.b) continue;
        if(!map[m.a]) map[m.a] = { name:m.a, pj:0, pg:0, pp:0, semis:0, finalsPlayed:0, finalsWon:0, titles: state.playersGlobal[m.a]?.titles || 0 };
        if(!map[m.b]) map[m.b] = { name:m.b, pj:0, pg:0, pp:0, semis:0, finalsPlayed:0, finalsWon:0, titles: state.playersGlobal[m.b]?.titles || 0 };
        map[m.a].pj++; map[m.b].pj++;
        if(m.winner === m.a){ map[m.a].pg++; map[m.b].pp++; }
        else if(m.winner === m.b){ map[m.b].pg++; map[m.a].pp++; }
        if(m.round === 3){ map[m.a].semis++; map[m.b].semis++; }
        if(m.round === 4){
          map[m.a].finalsPlayed++; map[m.b].finalsPlayed++;
          if(m.winner) map[m.winner].finalsWon = (map[m.winner].finalsWon||0)+1;
        }
      }
    }
    accumulate(p1); accumulate(p2);
    const arrg = Object.values(map);
    arrg.sort((A,B)=> {
      if(B.pg!==A.pg) return B.pg-A.pg;
      if(B.sem!==A.sem) return (B.sem||0)-(A.sem||0);
      return A.name.localeCompare(B.name,'es',{sensitivity:'base'});
    });
    renderStandingsTable(arrg);
    standingsTitle.textContent = `Tabla — Global ${currentYear}`;
    return;
  }

  renderStandingsTable(arr);
  standingsTitle.textContent = `Tabla — ${phaseLabel(currentPhase)} ${currentYear}`;
}

function renderStandingsTable(arr){
  standingsTableBody.innerHTML = '';
  arr.forEach((r,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td>
                    <td class="player-name">${escapeHtml(r.name)}</td>
                    <td>${r.pj||0}</td>
                    <td>${r.pg||0}</td>
                    <td>${r.pp||0}</td>
                    <td>${r.semis||0}</td>
                    <td>${r.finalsPlayed||0}</td>
                    <td>${r.finalsWon||0}</td>
                    <td>${r.titles||0}</td>`;
    tr.addEventListener('click', ()=> showPlayerDetail(r.name));
    standingsTableBody.appendChild(tr);
  });
}

function showPlayerDetail(name){
  const global = state.playersGlobal[name] || { name, pj:0, pg:0, pp:0, semis:0, finalsPlayed:0, finalsWon:0, titles:0, seasonsPlayed:[] };
  // calcular estado actual en el bracket/phase
  const phaseObj = getCurrentPhase();
  let status = 'No participa en el torneo actual';
  if(phaseObj && phaseObj.bracket){
    // buscar en bracket rounds la presencia/avance
    let furthest = 0; // 0 no, 1 octavos,2 cuartos,3 semis,4 final,5 champ
    for(let r=1;r<=4;r++){
      const matches = phaseObj.bracket.rounds[r];
      for(const m of matches){
        if(m.a === name || m.b === name){
          furthest = Math.max(furthest, r);
          // if winner equals name in final
          if(r===4 && m.winner === name) furthest = 5;
        }
        if(m.winner === name) furthest = Math.max(furthest, r+1);
      }
    }
    const map = {0:'No participa',1:'En Octavos / Eliminado en Octavos',2:'En Cuartos / Eliminado en Cuartos',3:'En Semifinal',4:'En Final',5:'¡Campeón!'};
    status = map[furthest] || status;
  }
  playerDetail.innerHTML = `
    <h3>${escapeHtml(name)}</h3>
    <p><strong>Estado actual:</strong> ${status}</p>
    <p><strong>Partidos jugados:</strong> ${global.pj||0}</p>
    <p><strong>Ganados:</strong> ${global.pg||0}</p>
    <p><strong>Perdidos:</strong> ${global.pp||0}</p>
    <p><strong>Semifinales jugadas:</strong> ${global.semis||0}</p>
    <p><strong>Finales jugadas:</strong> ${global.finalsPlayed||0}</p>
    <p><strong>Finales ganadas:</strong> ${global.finalsWon||0}</p>
    <p><strong>Títulos mundiales:</strong> ${global.titles||0}</p>
    <p><strong>Temporadas jugadas:</strong> ${(global.seasonsPlayed||[]).join(', ') || '—'}</p>
  `;
}

// render bracket visual simple
function renderBracket(){
  bracketDiv.innerHTML = '';
  const phaseObj = getCurrentPhase();
  if(!phaseObj.bracket){
    bracketDiv.innerHTML = `<p>No hay torneo activo. Jugadores en fase: ${phaseObj.players.length} (mínimo 16 para crear bracket)</p>`;
    return;
  }
  const rounds = phaseObj.bracket.rounds;
  // crear columnas por ronda
  const cols = [];
  for(let r=1;r<=4;r++){
    const col = document.createElement('div');
    col.style.display='flex'; col.style.flexDirection='column'; col.style.gap='8px';
    const title = document.createElement('strong');
    title.textContent = r === 1 ? 'Octavos' : r ===2 ? 'Cuartos' : r===3 ? 'Semifinal' : 'Final';
    col.appendChild(title);
    for(const m of rounds[r]){
      const matchEl = document.createElement('div');
      matchEl.className='match';
      const teams = document.createElement('div'); teams.className='teams';
      const a = document.createElement('div'); a.textContent = m.a || '—';
      const b = document.createElement('div'); b.textContent = m.b || '—';
      teams.appendChild(a); teams.appendChild(b);
      const meta = document.createElement('div'); meta.style.width='100%';
      meta.innerHTML = `<small>ID: ${m.id}</small>`;
      const actions = document.createElement('div'); actions.style.display='flex'; actions.style.gap='6px';
      // mostrar ganador si existe
      const winnerText = document.createElement('div'); winnerText.textContent = m.winner ? `Ganador: ${m.winner}` : '';
      meta.appendChild(winnerText);

      // Si es admin, mostrar botones para asignar ganador (elige A o B)
      if(isAdmin && (m.a || m.b)){
        const btnA = document.createElement('button'); btnA.className='small'; btnA.textContent = m.a ? `Ganador: ${m.a}` : '—';
        btnA.disabled = !m.a;
        btnA.addEventListener('click', ()=> {
          if(!confirm(`Confirmar ganador: ${m.a}?`)) return;
          setMatchWinner(r, m.id, m.a);
        });
        const btnB = document.createElement('button'); btnB.className='small'; btnB.textContent = m.b ? `Ganador: ${m.b}` : '—';
        btnB.disabled = !m.b;
        btnB.addEventListener('click', ()=> {
          if(!confirm(`Confirmar ganador: ${m.b}?`)) return;
          setMatchWinner(r, m.id, m.b);
        });
        actions.appendChild(btnA); actions.appendChild(btnB);
      }

      matchEl.appendChild(teams);
      matchEl.appendChild(meta);
      if(actions.children.length) matchEl.appendChild(actions);
      col.appendChild(matchEl);
    }
    cols.push(col);
  }
  // layout columns
  const wrapper = document.createElement('div'); wrapper.style.display='flex'; wrapper.style.gap='12px';
  cols.forEach(c=> wrapper.appendChild(c));
  bracketDiv.appendChild(wrapper);
}

// render historial
function renderHistory(){
  historyList.innerHTML = '';
  for(const h of state.history.slice().reverse()){
    const li = document.createElement('li');
    const d = new Date(h.date);
    li.textContent = `${h.year} • ${phaseLabel(h.phase)} → Campeón: ${h.champion} (${d.toLocaleString()})`;
    historyList.appendChild(li);
  }
}

// escape util
function escapeHtml(text){ const d=document.createElement('div'); d.textContent = text; return d.innerHTML; }

// init
initUI();
