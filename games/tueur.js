// ─────────────────────────────────────────────────────────────────────────────
// 🗡️ Le Tueur silencieux — jeu de fond qui dure toute la soirée.
// Ce n'est PAS un jeu comme les autres : il tourne pendant que vous jouez aux autres
// jeux (il est rangé dans le salon, pas dans la liste des jeux).
// Chacun reçoit en secret une CIBLE et une MISSION (« fais-lui dire “exactement” »…).
// Mission réussie → on le déclare, la cible confirme (ou conteste), elle est éliminée
// et on hérite de sa cible et de sa mission. Le dernier en vie gagne.
// ─────────────────────────────────────────────────────────────────────────────
const { shuffle } = require('./_utils');

const MISSIONS = [
  'Fais-lui dire le mot « exactement ».',
  'Fais-lui toucher son nez.',
  'Fais-lui prendre un objet que tu lui tends.',
  'Fais-lui te taper dans la main (un « check »).',
  'Fais-lui dire ton prénom.',
  'Fais-lui te dire l\'heure qu\'il est.',
  'Fais-lui chanter au moins trois mots d\'une chanson.',
  'Fais-lui regarder une photo sur ton téléphone.',
  'Fais-lui goûter quelque chose.',
  'Fais-lui citer le titre d\'un film.',
  'Fais-lui dire un nombre plus grand que 100.',
  'Fais-lui lever les deux bras en même temps.',
  'Fais-lui raconter un souvenir de vacances.',
  'Fais-lui dire le nom d\'un animal.',
  'Fais-lui trinquer avec toi.',
  'Fais-lui prononcer le mot « bizarre ».',
  'Fais-lui tenir un objet à toi pendant au moins 10 secondes.',
  'Fais-lui imiter un accent.',
  'Fais-lui dire le prénom de quelqu\'un qui n\'est pas là ce soir.',
  'Fais un selfie avec lui/elle.',
  'Fais-lui dire « je sais pas ».',
  'Fais-lui te donner un conseil.',
  'Fais-lui compter à voix haute jusqu\'à 5.',
  'Fais-lui épeler un mot.',
  'Fais-lui parler de la météo.',
  'Fais-lui dire le mot « pizza ».',
  'Fais-lui te serrer la main.',
  'Fais-lui rire avec une blague.',
  'Fais-lui faire un pouce levé 👍.',
  'Fais-lui dire le nom d\'un pays.',
  'Fais-lui dire « je te jure ».',
  'Fais-lui dire un mot en anglais.',
  'Fais-lui te prêter un objet.',
  'Fais-lui dire « bonne idée ».',
  'Fais-lui deviner ton âge.',
  'Fais-lui citer une chanson qu\'il/elle aime.',
  'Fais-lui faire un clin d\'œil.',
  'Fais-lui dire le mot « vacances ».',
  'Fais-lui changer de place.',
  'Fais-lui avouer un plat qu\'il/elle déteste.',
];
const MIN_PLAYERS = 4;
const AUTO_CONFIRM = 90000; // la cible ne répond pas : la mission est validée au bout de 1 min 30
const PTS = { KILL: 2, SURVIVOR: 4 };

const newMission = (except) => shuffle(MISSIONS.filter((m) => m !== except))[0];

// participants encore dans le salon (un joueur parti pour de bon est sauté)
const inRoom = (room, t) => t.ring.filter((id) => room.players.has(id));
const alive = (room, t) => inRoom(room, t).filter((id) => !t.dead[id]);

function targetOf(room, t, pid) {
  const list = alive(room, t);
  const i = list.indexOf(pid);
  if (i < 0 || list.length < 2) return null;
  return list[(i + 1) % list.length];
}

function start(room, players) {
  const ids = shuffle(players.map((p) => p.id));
  if (ids.length < MIN_PLAYERS) return { error: `Le Tueur silencieux : il faut au moins ${MIN_PLAYERS} joueurs connectés` };
  const missions = {};
  for (const id of ids) missions[id] = newMission();
  room.tueur = { ring: ids, dead: {}, missions, kills: {}, rerolls: {}, claims: {}, feed: [], startedAt: Date.now(), over: false, n: (room.tueur?.n || 0) + 1 };
}

function checkOver(room) {
  const t = room.tueur;
  if (t.over) return;
  const left = alive(room, t);
  if (left.length > 1) return;
  t.over = true;
  t.winner = left[0] || null;
  // points de soirée
  t.points = {};
  for (const id of inRoom(room, t)) {
    const pts = (t.kills[id] || 0) * PTS.KILL + (id === t.winner ? PTS.SURVIVOR : 0);
    if (pts) { t.points[id] = pts; room.players.get(id).soiree += pts; }
  }
}

function kill(room, killer, victim, how) {
  const t = room.tueur;
  delete t.claims[victim];
  if (t.dead[victim] || t.dead[killer]) return;
  t.dead[victim] = { by: killer, mission: t.missions[killer], at: Date.now() };
  t.kills[killer] = (t.kills[killer] || 0) + 1;
  t.feed.unshift({ killer, victim, mission: t.missions[killer], at: Date.now(), how });
  // le tueur hérite de la mission de sa victime (qui visait déjà sa nouvelle cible)
  t.missions[killer] = t.missions[victim] || newMission(t.missions[killer]);
  // une déclaration en cours contre le tueur par la victime n'a plus de sens
  for (const [v, c] of Object.entries(t.claims)) if (c.killer === victim) delete t.claims[v];
  checkOver(room);
}

// Actions d'un joueur. Renvoie { error } ou { toast:{to, msg} } ; le serveur renvoie l'état à tous.
function action(room, pid, type, isHost, schedule) {
  const t = room.tueur;
  if (type === 'start') {
    if (!isHost) return { error: 'Seul l\'hôte peut lancer Le Tueur silencieux' };
    if (t && !t.over) return { error: 'Une partie est déjà en cours' };
    return start(room, [...room.players.values()].filter((p) => p.connected && !p.kb));
  }
  if (!t) return {};
  if (type === 'stop') {
    if (!isHost) return {};
    if (!t.over) { t.over = true; t.stopped = true; t.winner = null; t.points = {}; }
    return {};
  }
  if (type === 'close') { if (isHost && t.over) room.tueur = null; return {}; }
  if (t.over || !t.ring.includes(pid) || t.dead[pid]) return {};
  if (type === 'claim') {
    const target = targetOf(room, t, pid);
    if (!target) return {};
    if (t.claims[target]) return { error: 'Déjà déclaré : on attend sa réponse' };
    const at = Date.now();
    t.claims[target] = { killer: pid, mission: t.missions[pid], at };
    schedule(AUTO_CONFIRM, () => {
      const c = room.tueur === t && t.claims[target];
      if (c && c.at === at) kill(room, pid, target, 'auto');
    });
    return { buzz: { to: target, pattern: [300, 100, 300] } };
  }
  if (type === 'reroll') {
    if ((t.rerolls[pid] || 0) >= 1) return { error: 'Tu as déjà changé de mission une fois' };
    t.rerolls[pid] = 1;
    t.missions[pid] = newMission(t.missions[pid]);
    return {};
  }
  const claim = t.claims[pid];
  if (type === 'confirm' && claim) { kill(room, claim.killer, pid, 'ok'); return {}; }
  if (type === 'deny' && claim) {
    delete t.claims[pid];
    return { toast: { to: claim.killer, msg: `${room.players.get(pid)?.name || 'Ta cible'} conteste : la mission n'est pas validée` } };
  }
  return {};
}

// Ce que voit chaque joueur (secret : seulement SA cible et SA mission)
function stateFor(room, pid) {
  const t = room.tueur;
  if (!t) return null;
  const s = {
    n: t.n, over: t.over, stopped: !!t.stopped, winner: t.winner || null, points: t.points || null,
    players: inRoom(room, t), aliveCount: alive(room, t).length, dead: Object.fromEntries(Object.entries(t.dead).map(([id, d]) => [id, d.by])),
    kills: t.kills, feed: t.feed.slice(0, 12).map(({ killer, victim, mission, at }) => ({ killer, victim, mission, at })), startedAt: t.startedAt,
    inGame: pid != null && t.ring.includes(pid),
  };
  if (pid && s.inGame) {
    s.me = {
      dead: t.dead[pid] ? { by: t.dead[pid].by, mission: t.dead[pid].mission } : null,
      target: t.dead[pid] || t.over ? null : targetOf(room, t, pid),
      mission: t.dead[pid] || t.over ? null : t.missions[pid],
      rerolled: !!t.rerolls[pid],
      pendingOut: Object.entries(t.claims).some(([, c]) => c.killer === pid),
      claimOnMe: t.claims[pid] ? { killer: t.claims[pid].killer, mission: t.claims[pid].mission } : null,
    };
  }
  return s;
}

// à chaque envoi d'état : un joueur parti pour de bon peut terminer la partie
const tick = (room) => { if (room.tueur && !room.tueur.over) checkOver(room); };

module.exports = { action, stateFor, tick, MIN_PLAYERS, _test: { MISSIONS, targetOf, alive } };
