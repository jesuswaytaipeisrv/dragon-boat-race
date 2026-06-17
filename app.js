import { firebaseConfig } from "./firebase-config.js";

const TEAMS = [
  { id: "red", name: "紅隊", color: "#d83a34" },
  { id: "blue", name: "藍隊", color: "#2166d9" },
  { id: "green", name: "綠隊", color: "#169b65" }
];

const STATUS_LABELS = {
  lobby: "等待開始",
  countdown: "準備",
  racing: "比賽中",
  finished: "比賽結束"
};

const FINISH_X_PERCENT = 92;
const SPEED_WINDOW_MS = 3000;
const RECENT_BUCKET_MS = 1000;
const FLUSH_MS = 420;
const RACE_TICK_MS = 500;
const SPEED_BOOST_CAP = 8;
const HOST_HEARTBEAT_MS = 1000;
const HOST_TAKEOVER_TIMEOUT_MS = 3000;

const params = new URLSearchParams(window.location.search);
const view = params.get("view") || "host";
const screen = document.querySelector("#screen");
const hostLink = document.querySelector("#hostLink");
const joinLink = document.querySelector("#joinLink");
const playerIdKey = "dragonBoatPlayerId";
const playerRoomKey = "dragonBoatRoomCode";
const hostSessionIdKey = "dragonBoatHostSessionId";
const playerId = getOrCreatePlayerId();
const hostSessionId = getOrCreateHostSessionId();

let store;
let state = createEmptyState(params.get("room") || makeRoomCode());
let unsubscribe = () => {};
let flushTimer = null;
let pendingClicks = 0;
let optimisticClickTotal = 0;
let countdownTimer = null;
let raceTicker = null;
let hostTakeoverTimer = null;
let hostClaimInFlight = false;
let lastHostHeartbeatAt = 0;

boot();

async function boot() {
  store = await createStore();
  document.body.dataset.view = view;
  hostLink.classList.toggle("active", view === "host");
  joinLink.classList.toggle("active", view !== "host");

  if (view === "player") {
    renderPlayer();
    return;
  }

  if (view === "join") {
    renderJoin();
    return;
  }

  renderHost();
}

function renderHost() {
  const roomCode = params.get("room") || state.roomCode;
  screen.replaceChildren(cloneTemplate("hostTemplate"));
  bindRoom(roomCode);

  const roomCodeTitle = document.querySelector("#roomCodeTitle");
  const joinUrl = document.querySelector("#joinUrl");
  const qrCode = document.querySelector("#qrCode");
  const raceLength = document.querySelector("#raceLength");
  const raceLengthValue = document.querySelector("#raceLengthValue");

  const url = makeJoinUrl(roomCode);
  roomCodeTitle.textContent = roomCode;
  joinUrl.textContent = url;
  qrCode.src = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(url)}`;

  document.querySelector("#copyJoinUrl").addEventListener("click", async () => {
    await navigator.clipboard?.writeText(url);
  });

  document.querySelector("#shuffleTeams").addEventListener("click", async () => {
    const players = Object.values(state.players);
    const shuffled = shufflePlayers(players);
    const updates = {};
    shuffled.forEach((player, index) => {
      updates[player.id] = { ...player, team: TEAMS[index % TEAMS.length].id };
    });
    try {
      await store.setPlayers(roomCode, updates);
    } catch (error) {
      console.error("Failed to shuffle teams.", error);
    }
  });

  document.querySelector("#startRace").addEventListener("click", () => startRace(roomCode));
  document.querySelector("#resetRace").addEventListener("click", () => resetRace(roomCode));

  raceLength.addEventListener("input", () => {
    raceLengthValue.textContent = `${raceLength.value} 公尺`;
  });

  raceLength.addEventListener("change", () => {
    if (state.status !== "lobby") return;
    store.updateRoom(roomCode, {
      raceLength: Number(raceLength.value),
      positions: emptyPositions(),
      winner: null,
      status: "lobby",
      finishedAt: null
    }).catch((error) => logStoreError("Failed to update race length", error));
  });
}

function renderJoin() {
  screen.replaceChildren(cloneTemplate("joinTemplate"));
  const roomInput = document.querySelector("#roomCodeInput");
  const nameInput = document.querySelector("#playerNameInput");
  const hint = document.querySelector("#joinHint");
  roomInput.value = params.get("room") || localStorage.getItem(playerRoomKey) || "";

  document.querySelector("#joinForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const roomCode = roomInput.value.trim().toUpperCase();
    const name = nameInput.value.trim();

    if (!roomCode || !name) return;

    hint.textContent = "正在加入...";
    try {
      await store.joinRoom(roomCode, {
        id: playerId,
        name,
        team: "",
        clicks: 0,
        recent: {},
        joinedAt: Date.now()
      });
      localStorage.setItem(playerRoomKey, roomCode);
      window.location.href = makePlayerUrl(roomCode);
    } catch (error) {
      logStoreError("Failed to join room", error);
      hint.textContent = "加入失敗，請重新試一次。";
    }
  });
}

function renderPlayer() {
  clearInterval(flushTimer);
  flushTimer = null;
  pendingClicks = 0;
  optimisticClickTotal = 0;

  const roomCode = params.get("room") || localStorage.getItem(playerRoomKey) || "";
  if (!roomCode) {
    window.location.href = "?view=join";
    return;
  }

  screen.replaceChildren(cloneTemplate("playerTemplate"));
  bindRoom(roomCode);

  const button = document.querySelector("#paddleButton");
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (!canPaddle()) return;
    optimisticClickTotal = Math.max(optimisticClickTotal, state.players[playerId]?.clicks || 0);
    optimisticClickTotal += 1;
    pendingClicks += 1;
    updatePlayerStats();
    button.animate(
      [
        { transform: "translateY(0) scale(1)" },
        { transform: "translateY(5px) scale(0.97)" },
        { transform: "translateY(0) scale(1)" }
      ],
      { duration: 110, easing: "ease-out" }
    );
  });

  flushTimer = window.setInterval(() => {
    if (pendingClicks <= 0) return;
    const count = pendingClicks;
    pendingClicks = 0;
    store.addClicks(roomCode, playerId, count).catch((error) => logStoreError("Failed to send clicks", error));
  }, FLUSH_MS);
}

function bindRoom(roomCode) {
  unsubscribe();
  unsubscribe = store.watchRoom(roomCode, (nextState) => {
    state = normalizeState(nextState, roomCode);
    updateUrlRoom(roomCode);
    updateScreen();
  });
}

function updateScreen() {
  if (view === "host") {
    updateHost();
  } else if (view === "player") {
    updatePlayer();
  }
}

function updateHost() {
  const players = Object.values(state.players);
  const teams = getTeamStats(state);
  const startRaceButton = document.querySelector("#startRace");
  const playerList = document.querySelector("#playerList");
  const lanes = document.querySelector("#lanes");
  const results = document.querySelector("#results");
  const statusLabel = document.querySelector("#statusLabel");
  const raceHeadline = document.querySelector("#raceHeadline");
  const raceLength = document.querySelector("#raceLength");
  const raceLengthValue = document.querySelector("#raceLengthValue");

  if (!startRaceButton || !playerList || !lanes || !results || !statusLabel || !raceHeadline || !raceLength || !raceLengthValue) {
    return;
  }

  startRaceButton.disabled = state.status === "racing" || state.status === "countdown" || players.length === 0;
  raceLength.value = state.raceLength;
  raceLength.disabled = state.status !== "lobby";
  raceLengthValue.textContent = `${state.raceLength} 公尺`;
  statusLabel.textContent = STATUS_LABELS[state.status] || "等待";
  raceHeadline.textContent = headlineForState(state);
  syncHostTimers(state.roomCode);

  playerList.replaceChildren(
    ...players.map((player) => {
      const team = getTeam(player.team);
      const li = document.createElement("li");
      li.innerHTML = `
        <span><span class="team-dot" style="background:${team?.color || "#8a948f"}"></span> ${escapeHtml(player.name)}</span>
        <strong>${team?.name || "未分隊"}</strong>
      `;
      return li;
    })
  );

  lanes.replaceChildren(
    ...TEAMS.map((team) => {
      const stats = teams[team.id];
      const position = Math.min(getFinishDistance(state), state.positions[team.id] || 0);
      const positionPercent = getPositionPercent(position, state);
      const finishProgress = position / getFinishDistance(state);
      const wakeActive = state.status === "racing" && (position > 0 || stats.speed > 0);
      const leaderEffort = state.status === "racing" && finishProgress >= 0.82;
      const lane = document.createElement("article");
      lane.className = "lane";
      lane.innerHTML = `
        <div class="lane-meta">
          <span class="team-dot" style="background:${team.color}"></span>
          <strong>${team.name}</strong>
          <span class="lane-stats">${stats.members} 人 · ${stats.clicks} 下 · ${stats.speed.toFixed(1)} 下/秒</span>
        </div>
        <div class="wake${wakeActive ? " active" : ""}" style="--x:${positionPercent}%" aria-hidden="true">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
        <div class="boat${leaderEffort ? " effort" : ""}" style="--team:${team.color}; --x:${positionPercent}%">
          ${boatSvg(team)}
        </div>
      `;
      return lane;
    })
  );

  if (state.status === "finished") {
    const ranking = getRaceRanking(state, teams);
    results.hidden = false;
    results.innerHTML = `
      <h3>比賽結果</h3>
      <ol>${ranking.map((team, index) => `
        <li class="${index === 0 ? "winner" : ""}">
          <span>${team.name}</span>
          <strong>${index + 1} 名 · ${Math.round(team.position)} 公尺 · ${team.clicks} 下</strong>
        </li>
      `).join("")}</ol>
    `;
  } else {
    results.hidden = true;
  }
}

function updatePlayer() {
  const player = state.players[playerId];
  const playerScreen = document.querySelector("#playerScreen");
  const playerTeam = document.querySelector("#playerTeam");
  const playerStatus = document.querySelector("#playerStatus");
  const playerCountdown = document.querySelector("#playerCountdown");
  const button = document.querySelector("#paddleButton");

  if (!playerScreen || !playerTeam || !playerStatus || !playerCountdown || !button) return;

  if (!player) {
    window.location.href = `?view=join&room=${encodeURIComponent(state.roomCode)}`;
    return;
  }

  const team = getTeam(player.team);
  playerScreen.style.setProperty("--team", team?.color || "#65716d");
  playerTeam.textContent = team?.name || "等待分隊";
  playerStatus.textContent = STATUS_LABELS[state.status] || "等待";
  playerCountdown.textContent = countdownText(state);
  button.disabled = !canPaddle();
  updatePlayerStats();
}

function updatePlayerStats() {
  const player = state.players[playerId];
  const teamStats = getTeamStats(state);
  const teamId = player?.team;
  const playerClicks = document.querySelector("#playerClicks");
  const teamClicks = document.querySelector("#teamClicks");
  if (!playerClicks || !teamClicks) return;
  const serverPlayerClicks = player?.clicks || 0;
  optimisticClickTotal = Math.max(optimisticClickTotal, serverPlayerClicks);
  const visiblePlayerClicks = Math.max(serverPlayerClicks + pendingClicks, optimisticClickTotal);
  const localUnconfirmedClicks = Math.max(0, visiblePlayerClicks - serverPlayerClicks);
  playerClicks.textContent = String(visiblePlayerClicks);
  teamClicks.textContent = String((teamStats[teamId]?.clicks || 0) + localUnconfirmedClicks);
}

function canPaddle() {
  const player = state.players[playerId];
  return state.status === "racing" && Boolean(player?.team);
}

async function startRace(roomCode) {
  try {
    const players = Object.values(state.players);
    if (!players.length || state.status === "countdown" || state.status === "racing") return;

    const needsTeams = players.some((player) => !player.team);
    if (needsTeams) {
      const shuffled = shufflePlayers(players);
      const updates = {};
      shuffled.forEach((player, index) => {
        updates[player.id] = { ...player, team: TEAMS[index % TEAMS.length].id };
      });
      await store.setPlayers(roomCode, updates);
    }

    const now = Date.now();
    lastHostHeartbeatAt = now;
    await store.updateRoom(roomCode, {
      status: "countdown",
      countdownEndsAt: now + 3200,
      positions: emptyPositions(),
      startedAt: null,
      finishedAt: null,
      winner: null,
      hostId: hostSessionId,
      hostHeartbeatAt: now
    });

    clearInterval(countdownTimer);
    countdownTimer = null;
  } catch (error) {
    logStoreError("Failed to start race", error);
  }
}

function runRaceTicker(roomCode) {
  clearInterval(raceTicker);
  raceTicker = window.setInterval(async () => {
    try {
      if (!isHostOwner(state)) {
        clearInterval(raceTicker);
        raceTicker = null;
        return;
      }

      if (state.status !== "racing") {
        clearInterval(raceTicker);
        raceTicker = null;
        return;
      }

      const teams = getTeamStats(state);
      const nextPositions = { ...state.positions };
      const finishDistance = getFinishDistance(state);
      const finishers = [];

      TEAMS.forEach((team) => {
        const stats = teams[team.id];
        const pace = stats.members ? stats.speed / Math.max(1, stats.members) : 0;
        const boost = pace > 0 ? Math.min(SPEED_BOOST_CAP, pace) : 0;
        const nextPosition = Math.min(finishDistance, (nextPositions[team.id] || 0) + boost);
        nextPositions[team.id] = nextPosition;
        if (nextPosition >= finishDistance) {
          finishers.push({ id: team.id, speed: stats.speed, clicks: stats.clicks });
        }
      });

      const now = Date.now();
      lastHostHeartbeatAt = now;

      if (finishers.length) {
        finishers.sort((a, b) => b.clicks - a.clicks || b.speed - a.speed || teamOrder(a.id) - teamOrder(b.id));
        await store.updateRoom(roomCode, {
          positions: nextPositions,
          status: "finished",
          winner: finishers[0].id,
          finishedAt: now,
          hostHeartbeatAt: now
        });
        clearInterval(raceTicker);
        raceTicker = null;
        return;
      }

      await store.updateRoom(roomCode, {
        positions: nextPositions,
        hostId: hostSessionId,
        hostHeartbeatAt: now
      });
    } catch (error) {
      logStoreError("Failed to update race ticker", error);
    }
  }, RACE_TICK_MS);
}

function syncHostTimers(roomCode) {
  const countdown = document.querySelector("#countdown");
  if (!countdown) return;
  syncHostTakeoverTimer(roomCode);
  claimHostIfStale(roomCode);

  if (state.status === "countdown" && state.countdownEndsAt) {
    countdown.textContent = countdownText(state);

    if (!isHostOwner(state)) {
      clearInterval(countdownTimer);
      countdownTimer = null;
      return;
    }

    if (!countdownTimer) {
      countdownTimer = window.setInterval(async () => {
        try {
          if (state.status !== "countdown" || !state.countdownEndsAt) {
            clearInterval(countdownTimer);
            countdownTimer = null;
            return;
          }
          if (Date.now() >= state.countdownEndsAt) {
            clearInterval(countdownTimer);
            countdownTimer = null;
            if (!isHostOwner(state)) return;
            const now = Date.now();
            lastHostHeartbeatAt = now;
            await store.updateRoom(roomCode, {
              status: "racing",
              startedAt: now,
              countdownEndsAt: null,
              hostId: hostSessionId,
              hostHeartbeatAt: now
            });
            runRaceTicker(roomCode);
          } else {
            sendHostHeartbeat(roomCode);
            updateHost();
          }
        } catch (error) {
          logStoreError("Failed to advance countdown", error);
        }
      }, 250);
    }
    return;
  }

  countdown.textContent = "";

  if (state.status === "racing" && isHostOwner(state) && !raceTicker) {
    runRaceTicker(roomCode);
  }

  if (state.status !== "countdown" && countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }

  if (state.status !== "racing" && raceTicker) {
    clearInterval(raceTicker);
    raceTicker = null;
  }
}

async function resetRace(roomCode) {
  try {
    clearInterval(raceTicker);
    clearInterval(countdownTimer);
    clearInterval(hostTakeoverTimer);
    raceTicker = null;
    countdownTimer = null;
    hostTakeoverTimer = null;
    const players = {};
    Object.values(state.players).forEach((player) => {
      players[player.id] = { ...player, clicks: 0, recent: {} };
    });
    await store.setPlayers(roomCode, players);
    await store.updateRoom(roomCode, {
      status: "lobby",
      positions: emptyPositions(),
      startedAt: null,
      finishedAt: null,
      winner: null,
      countdownEndsAt: null,
      hostId: null,
      hostHeartbeatAt: null
    });
  } catch (error) {
    logStoreError("Failed to reset race", error);
  }
}

function claimHostIfStale(roomCode) {
  if (view !== "host" || isHostOwner(state) || !isRaceControlledStatus(state.status) || !isHostStale(state) || hostClaimInFlight) {
    return;
  }

  hostClaimInFlight = true;
  const now = Date.now();
  lastHostHeartbeatAt = now;
  store.updateRoom(roomCode, {
    hostId: hostSessionId,
    hostHeartbeatAt: now
  })
    .catch((error) => logStoreError("Failed to claim host ownership", error))
    .finally(() => {
      hostClaimInFlight = false;
    });
}

function syncHostTakeoverTimer(roomCode) {
  if (view !== "host" || isHostOwner(state) || !isRaceControlledStatus(state.status)) {
    clearInterval(hostTakeoverTimer);
    hostTakeoverTimer = null;
    return;
  }

  if (!hostTakeoverTimer) {
    hostTakeoverTimer = window.setInterval(() => claimHostIfStale(roomCode), 500);
  }
}

function sendHostHeartbeat(roomCode) {
  if (!isHostOwner(state) || Date.now() - lastHostHeartbeatAt < HOST_HEARTBEAT_MS) return;
  const now = Date.now();
  lastHostHeartbeatAt = now;
  store.updateRoom(roomCode, {
    hostId: hostSessionId,
    hostHeartbeatAt: now
  }).catch((error) => logStoreError("Failed to update host heartbeat", error));
}

function getTeamStats(roomState) {
  const now = Date.now();
  const stats = Object.fromEntries(
    TEAMS.map((team) => [team.id, { members: 0, clicks: 0, speed: 0 }])
  );

  Object.values(roomState.players).forEach((player) => {
    if (!stats[player.team]) return;
    stats[player.team].members += 1;
    stats[player.team].clicks += player.clicks || 0;

    Object.entries(player.recent || {}).forEach(([time, count]) => {
      if (now - Number(time) < SPEED_WINDOW_MS) {
        stats[player.team].speed += Number(count) || 0;
      }
    });
  });

  Object.values(stats).forEach((teamStats) => {
    teamStats.speed = teamStats.speed / (SPEED_WINDOW_MS / 1000);
  });

  return stats;
}

async function createStore() {
  if (isFirebaseReady(firebaseConfig)) {
    try {
      return await createFirebaseStore();
    } catch (error) {
      console.warn("Firebase failed, using local demo store.", error);
    }
  }
  return createLocalStore();
}

async function createFirebaseStore() {
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js");
  const {
    getDatabase,
    ref,
    onValue,
    set,
    update,
    get,
    child,
    increment
  } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js");

  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);

  return {
    watchRoom(roomCode, callback) {
      const roomRef = ref(db, `rooms/${roomCode}`);
      get(roomRef).then((snapshot) => {
        const patch = snapshot.exists()
          ? createMissingRoomPatch(snapshot.val(), roomCode)
          : createInitialRoomPatch(roomCode);
        if (Object.keys(patch).length) return update(roomRef, patch);
        return null;
      }).catch((error) => logStoreError("Failed to initialize room", error));
      return onValue(
        roomRef,
        (snapshot) => callback(snapshot.val() || createEmptyState(roomCode)),
        (error) => logStoreError("Failed to watch room", error)
      );
    },
    async joinRoom(roomCode, player) {
      const roomRef = ref(db, `rooms/${roomCode}`);
      await set(child(roomRef, `players/${player.id}`), player);
    },
    updateRoom(roomCode, patch) {
      return update(ref(db, `rooms/${roomCode}`), patch);
    },
    setPlayers(roomCode, players) {
      return update(ref(db, `rooms/${roomCode}/players`), players);
    },
    addClicks(roomCode, id, count) {
      const now = Date.now();
      const bucket = String(Math.floor(now / RECENT_BUCKET_MS) * RECENT_BUCKET_MS);
      const patches = {
        clicks: increment(count),
        [`recent/${bucket}`]: increment(count)
      };
      for (let i = 1; i <= 10; i += 1) {
        const staleBucket = String(
          Math.floor((now - SPEED_WINDOW_MS * 2 - i * RECENT_BUCKET_MS) / RECENT_BUCKET_MS) * RECENT_BUCKET_MS
        );
        patches[`recent/${staleBucket}`] = null;
      }
      return update(ref(db, `rooms/${roomCode}/players/${id}`), patches);
    }
  };
}

function createLocalStore() {
  const listeners = new Set();
  const channel = "BroadcastChannel" in window ? new BroadcastChannel("dragonBoatRace") : null;

  channel?.addEventListener("message", () => emit());
  window.addEventListener("storage", emit);

  return {
    watchRoom(roomCode, callback) {
      const room = getLocalRoom(roomCode);
      saveLocalRoom(roomCode, room);
      const listener = () => callback(getLocalRoom(roomCode));
      listeners.add(listener);
      listener();
      return () => listeners.delete(listener);
    },
    async joinRoom(roomCode, player) {
      const room = getLocalRoom(roomCode);
      room.players[player.id] = player;
      saveLocalRoom(roomCode, room);
    },
    async updateRoom(roomCode, patch) {
      const room = getLocalRoom(roomCode);
      saveLocalRoom(roomCode, { ...room, ...patch });
    },
    async setPlayers(roomCode, players) {
      const room = getLocalRoom(roomCode);
      saveLocalRoom(roomCode, { ...room, players: { ...room.players, ...players } });
    },
    async addClicks(roomCode, id, count) {
      const room = getLocalRoom(roomCode);
      const player = room.players[id];
      if (!player) return;
      const bucket = String(Math.floor(Date.now() / RECENT_BUCKET_MS) * RECENT_BUCKET_MS);
      player.clicks = (player.clicks || 0) + count;
      player.recent = player.recent || {};
      player.recent[bucket] = (player.recent[bucket] || 0) + count;
      pruneRecent(player.recent);
      saveLocalRoom(roomCode, room);
    }
  };

  function emit() {
    listeners.forEach((listener) => listener());
  }

  function saveLocalRoom(roomCode, room) {
    localStorage.setItem(localRoomKey(roomCode), JSON.stringify(room));
    channel?.postMessage({ roomCode });
    emit();
  }
}

function getLocalRoom(roomCode) {
  const raw = localStorage.getItem(localRoomKey(roomCode));
  return raw ? normalizeState(JSON.parse(raw), roomCode) : createEmptyState(roomCode);
}

function localRoomKey(roomCode) {
  return `dragonBoatRoom:${roomCode}`;
}

function createEmptyState(roomCode) {
  return {
    roomCode,
    status: "lobby",
    raceLength: 100,
    positions: emptyPositions(),
    players: {},
    createdAt: Date.now(),
    startedAt: null,
    finishedAt: null,
    winner: null,
    countdownEndsAt: null,
    hostId: null,
    hostHeartbeatAt: null
  };
}

function createInitialRoomPatch(roomCode) {
  const state = createEmptyState(roomCode);
  return {
    roomCode: state.roomCode,
    status: state.status,
    raceLength: state.raceLength,
    positions: state.positions,
    createdAt: state.createdAt,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
    winner: state.winner,
    countdownEndsAt: state.countdownEndsAt,
    hostId: state.hostId,
    hostHeartbeatAt: state.hostHeartbeatAt
  };
}

function createMissingRoomPatch(roomState, roomCode) {
  const initial = createInitialRoomPatch(roomCode);
  return Object.fromEntries(
    Object.entries(initial).filter(([key]) => roomState?.[key] === undefined)
  );
}

function normalizeState(roomState, roomCode) {
  const normalized = {
    ...createEmptyState(roomCode),
    ...roomState,
    roomCode,
    positions: { ...emptyPositions(), ...(roomState?.positions || {}) },
    players: roomState?.players || {}
  };
  normalized.positions = normalizePositions(normalized);
  return normalized;
}

function emptyPositions() {
  return { red: 0, blue: 0, green: 0 };
}

function normalizePositions(roomState) {
  const positions = { ...emptyPositions(), ...(roomState.positions || {}) };
  const finishDistance = getFinishDistance(roomState);
  const maxPosition = Math.max(...Object.values(positions).map((value) => Number(value) || 0));

  if (roomState.status !== "finished" || maxPosition <= 0 || maxPosition >= finishDistance || maxPosition < FINISH_X_PERCENT) {
    return positions;
  }

  const scale = finishDistance / FINISH_X_PERCENT;
  return Object.fromEntries(
    Object.entries(positions).map(([teamId, position]) => [
      teamId,
      Math.min(finishDistance, (Number(position) || 0) * scale)
    ])
  );
}

function isFirebaseReady(config) {
  return Boolean(
    config?.apiKey &&
      !config.apiKey.includes("YOUR_") &&
      config?.databaseURL &&
      !config.databaseURL.includes("YOUR_")
  );
}

function makeRoomCode() {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function makeJoinUrl(roomCode) {
  return `${location.origin}${location.pathname}?view=join&room=${encodeURIComponent(roomCode)}`;
}

function makePlayerUrl(roomCode) {
  return `?view=player&room=${encodeURIComponent(roomCode)}`;
}

function updateUrlRoom(roomCode) {
  if (params.get("room") === roomCode) return;
  params.set("room", roomCode);
  history.replaceState(null, "", `${location.pathname}?${params}`);
}

function getOrCreatePlayerId() {
  const existing = localStorage.getItem(playerIdKey);
  if (existing) return existing;
  const id = crypto.randomUUID?.() || `p_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(playerIdKey, id);
  return id;
}

function getOrCreateHostSessionId() {
  const existing = sessionStorage.getItem(hostSessionIdKey);
  if (existing) return existing;
  const id = crypto.randomUUID?.() || `host_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  sessionStorage.setItem(hostSessionIdKey, id);
  return id;
}

function getTeam(teamId) {
  return TEAMS.find((team) => team.id === teamId);
}

function getFinishDistance(roomState) {
  const raceLength = Number(roomState.raceLength);
  return Number.isFinite(raceLength) && raceLength > 0 ? raceLength : 100;
}

function getPositionPercent(position, roomState) {
  return Math.min(FINISH_X_PERCENT, (position / getFinishDistance(roomState)) * FINISH_X_PERCENT);
}

function isHostOwner(roomState) {
  return roomState.hostId === hostSessionId;
}

function isRaceControlledStatus(status) {
  return status === "countdown" || status === "racing";
}

function isHostStale(roomState) {
  if (!isRaceControlledStatus(roomState.status)) return false;
  const heartbeatAt = Number(roomState.hostHeartbeatAt);
  return !roomState.hostId || !Number.isFinite(heartbeatAt) || Date.now() - heartbeatAt > HOST_TAKEOVER_TIMEOUT_MS;
}

function logStoreError(message, error) {
  console.error(message, error);
}

function teamOrder(teamId) {
  const index = TEAMS.findIndex((team) => team.id === teamId);
  return index === -1 ? TEAMS.length : index;
}

function shufflePlayers(players) {
  const shuffled = [...players];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function getRaceRanking(roomState, teamStats) {
  const ranking = TEAMS
    .map((team) => ({ ...team, position: roomState.positions[team.id] || 0, clicks: teamStats[team.id].clicks }))
    .sort(
      (a, b) =>
        b.position - a.position ||
        b.clicks - a.clicks ||
        Number(b.id === roomState.winner) - Number(a.id === roomState.winner) ||
        teamOrder(a.id) - teamOrder(b.id)
    );

  return ranking;
}

function countdownText(roomState) {
  if (roomState.status !== "countdown" || !roomState.countdownEndsAt) return "";
  const left = Math.max(0, Math.ceil((roomState.countdownEndsAt - Date.now()) / 1000));
  return left > 0 ? String(left) : "GO";
}

function headlineForState(roomState) {
  if (roomState.status === "racing") return "全力划向終點";
  if (roomState.status === "countdown") return "預備起槳";
  if (roomState.status === "finished") {
    const winner = getRaceRanking(roomState, getTeamStats(roomState))[0];
    return winner ? `${winner.name} 抵達終點` : "比賽結束";
  }
  return Object.keys(roomState.players).length ? "等待開始" : "等待玩家加入";
}

function cloneTemplate(id) {
  return document.querySelector(`#${id}`).content.cloneNode(true);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
    return map[char];
  });
}

function pruneRecent(recent) {
  const cutoff = Date.now() - SPEED_WINDOW_MS * 2;
  Object.keys(recent).forEach((time) => {
    if (Number(time) < cutoff) delete recent[time];
  });
}

function boatSvg(team) {
  return `
    <svg viewBox="0 0 320 120" role="img" aria-label="${escapeHtml(team.name)}龍舟">
      <path d="M20 68 C72 103 216 108 294 68 L276 100 C202 118 91 115 36 94 Z" fill="#7b321f" />
      <path d="M38 62 C93 88 213 91 278 62 L260 86 C190 100 99 99 52 82 Z" fill="var(--team)" />
      <path d="M258 55 C276 32 294 33 306 51 C292 47 280 52 270 68 Z" fill="#e7b640" />
      <path d="M269 36 C279 13 297 12 310 29 C294 28 285 35 281 49 Z" fill="#f4d36d" />
      <circle cx="291" cy="38" r="4" fill="#18201d" />
      <path d="M48 61 C43 36 61 18 86 29 C70 35 68 51 76 66 Z" fill="#e7b640" />
      <path d="M80 31 L96 14 L100 39 Z" fill="#d83a34" />
      <g transform="translate(42 16)">
        <circle cx="26" cy="28" r="23" fill="#ffd8ad" stroke="#fffdf8" stroke-width="5" />
        <path d="M7 26 C10 8 25 1 43 12 C34 10 25 16 18 27 Z" fill="#3a231b" opacity=".95" />
        <path d="M4 18 C18 6 35 5 48 18 L44 30 C31 20 20 20 8 30 Z" fill="var(--team)" />
        <g class="leader-calm">
          <circle cx="18" cy="30" r="3" fill="#18201d" />
          <circle cx="34" cy="30" r="3" fill="#18201d" />
          <path d="M19 41 C24 46 31 46 36 41" fill="none" stroke="#9a4935" stroke-width="3" stroke-linecap="round" />
        </g>
        <g class="leader-effort">
          <path d="M14 27 L24 31" stroke="#18201d" stroke-width="4" stroke-linecap="round" />
          <path d="M39 27 L29 31" stroke="#18201d" stroke-width="4" stroke-linecap="round" />
          <circle cx="18" cy="33" r="4" fill="#18201d" />
          <circle cx="34" cy="33" r="4" fill="#18201d" />
          <path d="M21 44 C24 38 31 38 34 44" fill="none" stroke="#9a4935" stroke-width="4" stroke-linecap="round" />
          <path d="M50 28 C60 20 63 34 55 40 C47 36 46 31 50 28 Z" fill="#7fd7ec" stroke="#fffdf8" stroke-width="2" />
          <path d="M4 38 C11 42 18 42 24 38" fill="none" stroke="#f28d7f" stroke-width="3" stroke-linecap="round" opacity=".7" />
          <path d="M29 38 C36 42 43 42 49 38" fill="none" stroke="#f28d7f" stroke-width="3" stroke-linecap="round" opacity=".7" />
        </g>
        <path d="M43 15 L58 8 L52 25 Z" fill="var(--team)" />
      </g>
      <g stroke="#fffdf8" stroke-width="5" stroke-linecap="round">
        <path d="M111 48 L92 90" />
        <path d="M150 51 L131 93" />
        <path d="M189 51 L170 93" />
        <path d="M228 48 L209 90" />
      </g>
      <g>
        <g transform="translate(96 34)">
          <circle cx="13" cy="10" r="10" fill="#ffd8ad" stroke="#fffdf8" stroke-width="3" />
          <path d="M4 8 C7 -1 18 -2 23 7 C17 4 11 4 4 8 Z" fill="#3a231b" />
          <path d="M2 27 C5 17 21 17 24 27 L22 42 L4 42 Z" fill="var(--team)" />
          <path d="M5 27 L-4 36" stroke="#ffd8ad" stroke-width="4" stroke-linecap="round" />
          <path d="M22 27 L32 37" stroke="#ffd8ad" stroke-width="4" stroke-linecap="round" />
        </g>
        <g transform="translate(135 37)">
          <circle cx="13" cy="10" r="10" fill="#ffd8ad" stroke="#fffdf8" stroke-width="3" />
          <path d="M4 8 C7 -1 18 -2 23 7 C17 4 11 4 4 8 Z" fill="#3a231b" />
          <path d="M2 27 C5 17 21 17 24 27 L22 42 L4 42 Z" fill="var(--team)" />
          <path d="M5 27 L-4 36" stroke="#ffd8ad" stroke-width="4" stroke-linecap="round" />
          <path d="M22 27 L32 37" stroke="#ffd8ad" stroke-width="4" stroke-linecap="round" />
        </g>
        <g transform="translate(174 37)">
          <circle cx="13" cy="10" r="10" fill="#ffd8ad" stroke="#fffdf8" stroke-width="3" />
          <path d="M4 8 C7 -1 18 -2 23 7 C17 4 11 4 4 8 Z" fill="#3a231b" />
          <path d="M2 27 C5 17 21 17 24 27 L22 42 L4 42 Z" fill="var(--team)" />
          <path d="M5 27 L-4 36" stroke="#ffd8ad" stroke-width="4" stroke-linecap="round" />
          <path d="M22 27 L32 37" stroke="#ffd8ad" stroke-width="4" stroke-linecap="round" />
        </g>
        <g transform="translate(213 34)">
          <circle cx="13" cy="10" r="10" fill="#ffd8ad" stroke="#fffdf8" stroke-width="3" />
          <path d="M4 8 C7 -1 18 -2 23 7 C17 4 11 4 4 8 Z" fill="#3a231b" />
          <path d="M2 27 C5 17 21 17 24 27 L22 42 L4 42 Z" fill="var(--team)" />
          <path d="M5 27 L-4 36" stroke="#ffd8ad" stroke-width="4" stroke-linecap="round" />
          <path d="M22 27 L32 37" stroke="#ffd8ad" stroke-width="4" stroke-linecap="round" />
        </g>
      </g>
    </svg>
  `;
}
