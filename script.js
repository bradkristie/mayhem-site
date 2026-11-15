// `leagueData` is loaded from `league-data.json` at runtime. This keeps the data separate from the UI code.
let leagueData = null; // currently-selected season data (object with teams[])
let seasons = {};
let currentSeasonKey = null;

async function loadLeagueData(){
  try{
    const res = await fetch('./league-data.json', {cache: 'no-cache'});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    // support both formats: { teams: [...] } and { seasons: { 'YYYY-YYYY': { teams: [...] } } }
    if(json.seasons){
      seasons = json.seasons;
    }else if(json.teams){
      seasons = { '2025-2026': { teams: json.teams } };
    }else{
      seasons = {};
    }
  }catch(err){
    console.error('Failed to load league-data.json:', err);
    seasons = {};
    const tbody = document.querySelector('#standings-table tbody');
    if(tbody) tbody.innerHTML = '<tr><td colspan="10">Unable to load league data. See console for details.</td></tr>';
  }
}

// Derive additional computed stats
function computePts(team){
  return team.w*2 + team.otl; // standard 2 for win, 1 for OT loss
}

function renderStandings(){
  const tbody = document.querySelector('#standings-table tbody');
  tbody.innerHTML = '';
  const teams = leagueData.teams.map(t=>({
    ...t,
    pts: computePts(t),
    gd: t.gf - t.ga
  })).sort((a,b)=>b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
  teams.forEach((t,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${t.name}${t.champion? ' <img src="trophy.png" class="trophy" alt="Champs">':''}</td>
      <td>${t.gp}</td>
      <td>${t.w}</td>
      <td>${t.l}</td>
      <td>${t.otl}</td>
      <td>${t.pts}</td>
      <td>${t.gf}</td>
      <td>${t.ga}</td>
      <td>${t.gd}</td>
    `;
    tbody.appendChild(tr);
  });
}

function flattenPlayers(){
  const list = [];
  (leagueData.teams || []).forEach(team=>{
    (team.players || []).forEach(p=>{
      if(p.goalie) return; // goalies are excluded from skater leaderboards
      list.push({team:team.name, name:p.name, g:p.g, a:p.a, pts:(p.g+p.a), captain:p.captain});
    });
  });
  return list;
}

function renderLeaders(){
  const players = flattenPlayers();
  const byGoals = [...players].sort((a,b)=>b.g - a.g).slice(0,10);
  const byAssists = [...players].sort((a,b)=>b.a - a.a).slice(0,10);
  const byPoints = [...players].sort((a,b)=>b.pts - a.pts).slice(0,10);

  const gEl = document.getElementById('goals-leaders');
  const aEl = document.getElementById('assists-leaders');
  const pEl = document.getElementById('points-leaders');
  gEl.innerHTML = ''; aEl.innerHTML = ''; pEl.innerHTML = '';

  byGoals.forEach(p=>{ const li = document.createElement('li'); li.innerHTML = `${p.name}${p.captain? ' <img src="captain.png" class="captain" alt="Captain">':''} — ${p.team} (${p.g}G ${p.a}A)`; gEl.appendChild(li);});
  byAssists.forEach(p=>{ const li = document.createElement('li'); li.innerHTML = `${p.name}${p.captain? ' <img src="captain.png" class="captain" alt="Captain">':''} — ${p.team} (${p.a}A ${p.g}G)`; aEl.appendChild(li);});
  byPoints.forEach(p=>{ const li = document.createElement('li'); li.innerHTML = `${p.name}${p.captain? ' <img src="captain.png" class="captain" alt="Captain">':''} — ${p.team} (${p.pts} Pts)`; pEl.appendChild(li);});
}

function renderTeams(){
  const grid = document.getElementById('teams-grid');
  grid.innerHTML = '';
  (leagueData.teams || []).forEach(t=>{
    const div = document.createElement('div');
    div.className = 'team-card card';
    div.innerHTML = `
      <h4>${t.name} ${t.champion? '<img src="trophy.png" class="trophy" alt="Champs">':''} <span class="small-muted">(${t.id})</span></h4>
      <p class="small-muted">GP: ${t.gp} • W-L-OTL: ${t.w}-${t.l}-${t.otl} • PTS: ${computePts(t)}</p>
      <p class="small-muted">GF: ${t.gf} • GA: ${t.ga} • GD: ${t.gf - t.ga}</p>
      <details>
        <summary>Player Stats</summary>
        <ul>${[...t.players].sort((a,b)=>(a.goalie?1:0)-(b.goalie?1:0) || (b.g+b.a)-(a.g+a.a)).map(p=>`<li>${p.name}${p.captain? ' <img src="captain.png" class="captain" alt="Captain">':''}${p.goalie? ' <span class="goalie-tag">(G)</span>':` — ${p.g}G ${p.a}A (${p.g+p.a} Pts)`}</li>`).join('')}</ul>
      </details>
    `;
    grid.appendChild(div);
  });
}

function renderSchedule(){
  const section = document.getElementById('schedule');
  if(!section) return;
  const sched = leagueData.schedule;
  // hide the section for seasons that have no schedule
  if(!sched || !sched.weeks || sched.weeks.length === 0){
    section.style.display = 'none';
    return;
  }
  section.style.display = '';
  const noteEl = document.getElementById('schedule-note');
  if(noteEl) noteEl.textContent = sched.note || '';
  const times = sched.times || [];
  const headRow = document.querySelector('#schedule-table thead tr');
  headRow.innerHTML = '<th>Date</th>' + times.map(t=>`<th>${t}</th>`).join('');
  const tbody = document.querySelector('#schedule-table tbody');
  tbody.innerHTML = '';
  sched.weeks.forEach(w=>{
    const tr = document.createElement('tr');
    const cells = (w.games || []).map(g=>{
      if(!g) return '<td></td>';
      if(typeof g === 'string') return `<td>${g}</td>`;
      // game object with a recorded result
      const label = g.winner
        ? g.teams.split(' vs ').map(t=> t === g.winner ? `<strong>${t}</strong>` : t).join(' vs ')
        : g.teams;
      const score = g.score ? `<div class="sched-score">${g.score}${g.ot? ' (OT)':''}${g.so? ' (SO)':''}</div>` : '';
      return `<td class="sched-played">${label}${score}</td>`;
    }).join('');
    tr.innerHTML = `<td class="sched-date">${w.date}</td>${cells}`;
    tbody.appendChild(tr);
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', async ()=>{
  await loadLeagueData();
  const select = document.getElementById('season-select');
  if(!select) return;
  // populate season dropdown
  let keys = Object.keys(seasons);
  // fallback keys so the select isn't empty if JSON failed to load
  if(keys.length === 0){
    keys = ['2025-2026','2024-2025'];
    // ensure seasons has entries for the fallback keys
    keys.forEach(k=>{ if(!seasons[k]) seasons[k] = { teams: [] }; });
    const tbody = document.querySelector('#standings-table tbody');
    if(tbody) tbody.innerHTML = '<tr><td colspan="10">No season data found; showing empty seasons.</td></tr>';
    // continue to build the select so user can switch
  }
  // choose default season
  const preferred = keys.includes('2026-2027') ? '2026-2027' : keys[0];
  // build options
  keys.forEach(k=>{
    const opt = document.createElement('option');
    opt.value = k; opt.textContent = k;
    if(k === preferred) opt.selected = true;
    select.appendChild(opt);
  });
  function applySeason(key){
    currentSeasonKey = key;
    leagueData = seasons[key] || { teams: [] };
    const h = document.querySelector('#standings h2');
    if(h) h.textContent = `Standings ${key}`;
    renderStandings();
    renderLeaders();
    renderTeams();
    renderSchedule();
  }
  select.addEventListener('change', (e)=> applySeason(e.target.value));
  applySeason(preferred);
});