import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, Trash2, Link2, ZoomIn, ZoomOut, Search, Star,
  ArrowLeft, StickyNote, FileText, X, Pin, Hand, MousePointer2
} from "lucide-react";

// ---------- fonts ----------
function useFonts() {
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Special+Elite&family=Courier+Prime:wght@400;700&display=swap";
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);
}

// ---------- storage helpers (браузерный localStorage) ----------
async function loadBoards() {
  try {
    const raw = localStorage.getItem("rt-boards");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
async function saveBoards(boards) {
  try { localStorage.setItem("rt-boards", JSON.stringify(boards)); } catch {}
}
async function loadBoardData(id) {
  try {
    const raw = localStorage.getItem(`rt-board-data:${id}`);
    return raw ? JSON.parse(raw) : { objects: [], connections: [] };
  } catch {
    return { objects: [], connections: [] };
  }
}
async function saveBoardData(id, data) {
  try { localStorage.setItem(`rt-board-data:${id}`, JSON.stringify(data)); } catch {}
}

const uid = () => Math.random().toString(36).slice(2, 10);

const THREAD_COLORS = [
  "#c0392b", "#d4a017", "#e07b39", "#4a7c59",
  "#4a90a4", "#3d5a80", "#7b4b94", "#e8e0d0", "#d98aa0", "#1a1512",
];
const CARD_COLORS = ["#f0e6d2", "#e8d9b5", "#d9c9a3", "#f5f0e6", "#c9d9c9", "#d9c9d9"];

// ================= APP =================
export default function RedThreadsApp() {
  useFonts();
  const [view, setView] = useState("list"); // list | board
  const [boards, setBoards] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadBoards().then((b) => { setBoards(b); setLoaded(true); });
  }, []);

  const openBoard = (id) => { setCurrentId(id); setView("board"); };
  const backToList = () => { setView("list"); loadBoards().then(setBoards); };

  const createBoard = async () => {
    const nb = { id: uid(), title: "Новое дело", updatedAt: Date.now(), favorite: false };
    const next = [nb, ...boards];
    setBoards(next);
    await saveBoards(next);
    await saveBoardData(nb.id, { objects: [], connections: [] });
    openBoard(nb.id);
  };

  const deleteBoard = async (id, e) => {
    e.stopPropagation();
    const next = boards.filter((b) => b.id !== id);
    setBoards(next);
    await saveBoards(next);
  };

  const toggleFavorite = async (id, e) => {
    e.stopPropagation();
    const next = boards.map((b) => b.id === id ? { ...b, favorite: !b.favorite } : b);
    setBoards(next);
    await saveBoards(next);
  };

  if (!loaded) {
    return (
      <div style={{ ...pageStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'Special Elite', monospace", color: "#d9c9a3", letterSpacing: 2 }}>
          открываю архив…
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {view === "list" ? (
        <BoardList
          boards={boards}
          onOpen={openBoard}
          onCreate={createBoard}
          onDelete={deleteBoard}
          onFavorite={toggleFavorite}
        />
      ) : (
        <BoardCanvas
          boardId={currentId}
          boardMeta={boards.find((b) => b.id === currentId)}
          onBack={backToList}
          onRename={async (title) => {
            const next = boards.map((b) => b.id === currentId ? { ...b, title, updatedAt: Date.now() } : b);
            setBoards(next);
            await saveBoards(next);
          }}
          onTouch={async () => {
            const next = boards.map((b) => b.id === currentId ? { ...b, updatedAt: Date.now() } : b);
            setBoards(next);
            await saveBoards(next);
          }}
        />
      )}
    </div>
  );
}

const pageStyle = {
  width: "100%",
  height: "100vh",
  background: "#241d18",
  fontFamily: "'Courier Prime', monospace",
  color: "#e8e0d0",
  overflow: "hidden",
};

// ================= BOARD LIST =================
function BoardList({ boards, onOpen, onCreate, onDelete, onFavorite }) {
  const [query, setQuery] = useState("");
  const filtered = boards
    .filter((b) => b.title.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (b.favorite - a.favorite) || (b.updatedAt - a.updatedAt));

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "40px 32px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{
              fontFamily: "'Special Elite', monospace", fontSize: 34, margin: 0,
              color: "#e8e0d0", letterSpacing: 1,
            }}>
              RED THREADS
            </h1>
            <div style={{ color: "#a0937a", fontSize: 13, marginTop: 4, letterSpacing: 1 }}>
              АРХИВ ДЕЛ · {boards.length} {pluralBoards(boards.length)}
            </div>
          </div>
          <button onClick={onCreate} style={primaryBtn}>
            <Plus size={16} /> Новая доска
          </button>
        </div>

        <div style={{ position: "relative", marginBottom: 28 }}>
          <Search size={15} style={{ position: "absolute", left: 14, top: 12, color: "#a0937a" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="поиск по названию…"
            style={searchInput}
          />
        </div>

        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "#6e6252" }}>
            <div style={{ fontFamily: "'Special Elite', monospace", fontSize: 16, marginBottom: 8 }}>
              {boards.length === 0 ? "дел пока нет" : "ничего не найдено"}
            </div>
            <div style={{ fontSize: 13 }}>
              {boards.length === 0 ? "нажми «Новая доска», чтобы начать" : "попробуй другой запрос"}
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
            {filtered.map((b) => (
              <div key={b.id} onClick={() => onOpen(b.id)} style={boardCard}>
                <div style={corkPattern} />
                <button
                  onClick={(e) => onFavorite(b.id, e)}
                  style={{ ...iconBtn, position: "absolute", top: 10, right: 40, zIndex: 2 }}
                  title="избранное"
                >
                  <Star size={15} fill={b.favorite ? "#d4a017" : "none"} color={b.favorite ? "#d4a017" : "#a0937a"} />
                </button>
                <button
                  onClick={(e) => onDelete(b.id, e)}
                  style={{ ...iconBtn, position: "absolute", top: 10, right: 8, zIndex: 2 }}
                  title="удалить"
                >
                  <Trash2 size={15} color="#a0937a" />
                </button>
                <div style={{ position: "relative", zIndex: 2 }}>
                  <div style={{ fontFamily: "'Special Elite', monospace", fontSize: 16, marginBottom: 6, wordBreak: "break-word" }}>
                    {b.title}
                  </div>
                  <div style={{ fontSize: 11, color: "#a0937a" }}>
                    {timeAgo(b.updatedAt)}
                  </div>
                </div>
                <div style={pinDot} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function pluralBoards(n) {
  const mod10 = n % 10, mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "доска";
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return "доски";
  return "досок";
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  return `${d} дн назад`;
}

// ================= BOARD CANVAS =================
function BoardCanvas({ boardId, boardMeta, onBack, onRename, onTouch }) {
  const [data, setData] = useState({ objects: [], connections: [] });
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState("move"); // 'move' | 'pan'
  const [connectMode, setConnectMode] = useState(false);
  const [connectFrom, setConnectFrom] = useState(null);
  const [selectedConnId, setSelectedConnId] = useState(null);
  const [view3, setView3] = useState({ x: 0, y: 0, scale: 1 });
  const [titleEdit, setTitleEdit] = useState(false);
  const [titleVal, setTitleVal] = useState(boardMeta?.title || "");

  const canvasRef = useRef(null);
  const dragRef = useRef(null); // {id, startX, startY, origX, origY}
  const panRef = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    loadBoardData(boardId).then((d) => { setData(d); setLoaded(true); });
  }, [boardId]);

  useEffect(() => { setTitleVal(boardMeta?.title || ""); }, [boardMeta?.title]);

  const persist = useCallback((next) => {
    setData(next);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveBoardData(boardId, next);
      onTouch();
    }, 400);
  }, [boardId, onTouch]);

  const toCanvasCoords = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - view3.x) / view3.scale,
      y: (clientY - rect.top - view3.y) / view3.scale,
    };
  };

  const addObject = (type) => {
    const center = toCanvasCoords(window.innerWidth / 2, window.innerHeight / 2);
    const obj = {
      id: uid(),
      type,
      x: center.x - 90,
      y: center.y - 60,
      w: type === "note" ? 160 : 200,
      h: type === "note" ? 140 : 120,
      title: type === "card" ? "Новая карточка" : "",
      text: "",
      color: type === "note" ? "#e8d9b5" : "#f0e6d2",
      pinned: false,
    };
    persist({ ...data, objects: [...data.objects, obj] });
    setSelectedId(obj.id);
  };

  const updateObject = (id, patch) => {
    persist({ ...data, objects: data.objects.map((o) => o.id === id ? { ...o, ...patch } : o) });
  };

  const deleteSelected = () => {
    if (selectedId) {
      persist({
        objects: data.objects.filter((o) => o.id !== selectedId),
        connections: data.connections.filter((c) => c.fromId !== selectedId && c.toId !== selectedId),
      });
      setSelectedId(null);
    } else if (selectedConnId) {
      persist({ ...data, connections: data.connections.filter((c) => c.id !== selectedConnId) });
      setSelectedConnId(null);
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (document.activeElement.tagName === "TEXTAREA" || document.activeElement.tagName === "INPUT") return;
        deleteSelected();
      }
      if (e.key === "Escape") { setConnectMode(false); setConnectFrom(null); setSelectedId(null); setSelectedConnId(null); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // object drag/select — pointer events work for both mouse and touch
  const onObjectPointerDown = (e, obj) => {
    if (connectMode) {
      e.stopPropagation();
      if (!connectFrom) {
        setConnectFrom(obj.id);
      } else if (connectFrom !== obj.id) {
        const conn = { id: uid(), fromId: connectFrom, toId: obj.id, color: "#c0392b", style: "solid" };
        persist({ ...data, connections: [...data.connections, conn] });
        setConnectFrom(null);
        setConnectMode(false);
      }
      return;
    }
    if (mode === "pan") {
      // не трогаем объект — пусть событие всплывёт к фону и подвинет холст
      return;
    }
    e.stopPropagation();
    setSelectedId(obj.id);
    setSelectedConnId(null);
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { id: obj.id, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, origX: obj.x, origY: obj.y };
  };

  const onObjectPointerMove = (e) => {
    if (dragRef.current && dragRef.current.pointerId === e.pointerId) {
      const { id, startX, startY, origX, origY } = dragRef.current;
      const dx = (e.clientX - startX) / view3.scale;
      const dy = (e.clientY - startY) / view3.scale;
      setData((prev) => ({
        ...prev,
        objects: prev.objects.map((o) => o.id === id ? { ...o, x: origX + dx, y: origY + dy } : o),
      }));
    }
  };

  const onObjectPointerUp = (e) => {
    if (dragRef.current && dragRef.current.pointerId === e.pointerId) {
      try { e.currentTarget.releasePointerCapture(e.pointerId); } catch {}
      dragRef.current = null;
      setData((prev) => { persist(prev); return prev; });
    }
  };

  const onCanvasPointerMove = (e) => {
    if (panRef.current && panRef.current.pointerId === e.pointerId) {
      const { startX, startY, origX, origY } = panRef.current;
      setView3((v) => ({ ...v, x: origX + (e.clientX - startX), y: origY + (e.clientY - startY) }));
    }
  };

  const onCanvasPointerUp = (e) => {
    if (panRef.current && panRef.current.pointerId === e.pointerId) {
      try { canvasRef.current.releasePointerCapture(e.pointerId); } catch {}
      panRef.current = null;
    }
  };

  const onBackgroundPointerDown = (e) => {
    if (e.target !== canvasRef.current) return;
    setSelectedId(null);
    setSelectedConnId(null);
    if (connectMode) { setConnectMode(false); setConnectFrom(null); return; }
    if (mode === "pan") {
      canvasRef.current.setPointerCapture(e.pointerId);
      panRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, origX: view3.x, origY: view3.y };
    }
  };

  const onWheel = (e) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    setView3((v) => {
      const newScale = Math.min(2.5, Math.max(0.25, v.scale + delta));
      return { ...v, scale: newScale };
    });
  };

  const zoom = (dir) => {
    setView3((v) => ({ ...v, scale: Math.min(2.5, Math.max(0.25, v.scale + dir * 0.15)) }));
  };

  const centerOf = (obj) => ({ x: obj.x + obj.w / 2, y: obj.y + obj.h / 2 });

  if (!loaded) {
    return <div style={{ ...pageStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>загрузка доски…</div>;
  }

  const selectedObj = data.objects.find((o) => o.id === selectedId);
  const selectedConn = data.connections.find((c) => c.id === selectedConnId);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      {/* top bar */}
      <div style={topBar}>
        <button onClick={onBack} style={iconBtn} title="назад к архиву">
          <ArrowLeft size={17} />
        </button>
        {titleEdit ? (
          <input
            autoFocus
            value={titleVal}
            onChange={(e) => setTitleVal(e.target.value)}
            onBlur={() => { setTitleEdit(false); onRename(titleVal || "Без названия"); }}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            style={{ ...titleInput }}
          />
        ) : (
          <div onClick={() => setTitleEdit(true)} style={titleText} title="нажми, чтобы переименовать">
            {boardMeta?.title || "Без названия"}
          </div>
        )}
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: "#a0937a", marginRight: 8 }}>
          {data.objects.length} объектов · {data.connections.length} связей
        </div>
      </div>

      {/* canvas */}
      <div
        ref={canvasRef}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
        onPointerCancel={onCanvasPointerUp}
        onWheel={onWheel}
        style={{
          position: "absolute", inset: 0, touchAction: "none",
          cursor: mode === "pan" ? "grab" : (connectMode ? "crosshair" : "default"),
          backgroundColor: "#3a2f26",
          backgroundImage:
            "radial-gradient(#4a3c30 1px, transparent 1px)," +
            "repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0px, transparent 2px, transparent 3px)," +
            "repeating-linear-gradient(90deg, rgba(0,0,0,0.05) 0px, transparent 2px, transparent 3px)",
          backgroundSize: `${28 * view3.scale}px ${28 * view3.scale}px, auto, auto`,
          backgroundPosition: `${view3.x}px ${view3.y}px`,
        }}
      >
        <div
          style={{
            position: "absolute", left: 0, top: 0,
            transform: `translate(${view3.x}px, ${view3.y}px) scale(${view3.scale})`,
            transformOrigin: "0 0",
          }}
        >
          {/* connections svg */}
          <svg style={{ position: "absolute", overflow: "visible", left: 0, top: 0, pointerEvents: "none" }}>
            {data.connections.map((c) => {
              const from = data.objects.find((o) => o.id === c.fromId);
              const to = data.objects.find((o) => o.id === c.toId);
              if (!from || !to) return null;
              const p1 = centerOf(from), p2 = centerOf(to);
              const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2 - 30;
              return (
                <g key={c.id} style={{ pointerEvents: "stroke" }}>
                  <path
                    d={`M ${p1.x} ${p1.y} Q ${mx} ${my} ${p2.x} ${p2.y}`}
                    stroke={c.color}
                    strokeWidth={selectedConnId === c.id ? 3.5 : 2}
                    fill="none"
                    strokeDasharray={c.style === "dashed" ? "6 5" : undefined}
                    style={{ cursor: "pointer", pointerEvents: "stroke" }}
                    onMouseDown={(e) => { e.stopPropagation(); setSelectedConnId(c.id); setSelectedId(null); }}
                  />
                  <circle cx={p1.x} cy={p1.y} r={4} fill={c.color} />
                  <circle cx={p2.x} cy={p2.y} r={4} fill={c.color} />
                </g>
              );
            })}
            {connectMode && connectFrom && (
              <text x={10} y={20} fill="#d4a017" fontSize={12} fontFamily="'Courier Prime', monospace">
                выбери второй объект…
              </text>
            )}
          </svg>

          {/* objects */}
          {data.objects.map((obj) => (
            <ObjectCard
              key={obj.id}
              obj={obj}
              selected={selectedId === obj.id}
              connectPending={connectFrom === obj.id}
              onPointerDown={(e) => onObjectPointerDown(e, obj)}
              onPointerMove={onObjectPointerMove}
              onPointerUp={onObjectPointerUp}
              onChange={(patch) => updateObject(obj.id, patch)}
            />
          ))}
        </div>
      </div>

      {/* zoom controls */}
      <div style={zoomBox}>
        <button style={iconBtn} onClick={() => zoom(1)} title="приблизить"><ZoomIn size={16} /></button>
        <div style={{ fontSize: 11, textAlign: "center", color: "#a0937a" }}>{Math.round(view3.scale * 100)}%</div>
        <button style={iconBtn} onClick={() => zoom(-1)} title="отдалить"><ZoomOut size={16} /></button>
      </div>

      {/* режим: холст / объекты */}
      <div style={modeBox}>
        <button
          style={{ ...modeBtn, background: mode === "pan" ? "#c0392b" : "transparent", color: mode === "pan" ? "#f0e6d2" : "#a0937a" }}
          onClick={() => setMode("pan")}
          title="двигать холст"
        >
          <Hand size={16} /><span>Холст</span>
        </button>
        <button
          style={{ ...modeBtn, background: mode === "move" ? "#c0392b" : "transparent", color: mode === "move" ? "#f0e6d2" : "#a0937a" }}
          onClick={() => setMode("move")}
          title="двигать объекты"
        >
          <MousePointer2 size={16} /><span>Объекты</span>
        </button>
      </div>

      {/* bottom toolbar */}
      <div style={toolbar}>
        <button style={toolBtn} onClick={() => addObject("card")} title="добавить карточку">
          <FileText size={16} /><span>Карточка</span>
        </button>
        <button style={toolBtn} onClick={() => addObject("note")} title="добавить заметку">
          <StickyNote size={16} /><span>Заметка</span>
        </button>
        <button
          style={{ ...toolBtn, background: connectMode ? "#c0392b" : toolBtn.background, color: connectMode ? "#f0e6d2" : toolBtn.color }}
          onClick={() => { setConnectMode((v) => !v); setConnectFrom(null); }}
          title="соединить нитью"
        >
          <Link2 size={16} /><span>Нить</span>
        </button>
        <button
          style={{ ...toolBtn, opacity: (selectedId || selectedConnId) ? 1 : 0.4 }}
          onClick={deleteSelected}
          disabled={!selectedId && !selectedConnId}
          title="удалить выбранное"
        >
          <Trash2 size={16} /><span>Удалить</span>
        </button>
      </div>

      {/* inspector panel */}
      {selectedObj && (
        <div style={inspector}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontFamily: "'Special Elite', monospace", fontSize: 12, color: "#a0937a" }}>
              {selectedObj.type === "card" ? "КАРТОЧКА" : "ЗАМЕТКА"}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                style={iconBtnSmall}
                onClick={() => updateObject(selectedObj.id, { pinned: !selectedObj.pinned })}
                title="закрепить"
              >
                <Pin size={13} fill={selectedObj.pinned ? "#d4a017" : "none"} color={selectedObj.pinned ? "#d4a017" : "#a0937a"} />
              </button>
              <button style={iconBtnSmall} onClick={() => setSelectedId(null)} title="закрыть">
                <X size={13} color="#a0937a" />
              </button>
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            {CARD_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => updateObject(selectedObj.id, { color: c })}
                style={{
                  width: 20, height: 20, borderRadius: "50%", background: c, cursor: "pointer",
                  border: selectedObj.color === c ? "2px solid #d4a017" : "1px solid rgba(0,0,0,0.3)",
                }}
              />
            ))}
          </div>
        </div>
      )}

      {selectedConn && (
        <div style={inspector}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontFamily: "'Special Elite', monospace", fontSize: 12, color: "#a0937a" }}>НИТЬ</span>
            <button style={iconBtnSmall} onClick={() => setSelectedConnId(null)} title="закрыть"><X size={13} color="#a0937a" /></button>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {THREAD_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => persist({ ...data, connections: data.connections.map((cc) => cc.id === selectedConn.id ? { ...cc, color: c } : cc) })}
                style={{
                  width: 18, height: 18, borderRadius: "50%", background: c, cursor: "pointer",
                  border: selectedConn.color === c ? "2px solid #fff" : "1px solid rgba(0,0,0,0.3)",
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["solid", "dashed"].map((s) => (
              <button
                key={s}
                onClick={() => persist({ ...data, connections: data.connections.map((cc) => cc.id === selectedConn.id ? { ...cc, style: s } : cc) })}
                style={{
                  ...smallToggle,
                  background: selectedConn.style === s ? "#4a3c30" : "transparent",
                  color: selectedConn.style === s ? "#e8e0d0" : "#a0937a",
                }}
              >
                {s === "solid" ? "сплошная" : "пунктир"}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ObjectCard({ obj, selected, connectPending, onPointerDown, onPointerMove, onPointerUp, onChange }) {
  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: "absolute",
        left: obj.x, top: obj.y, width: obj.w, height: obj.h,
        background: obj.color,
        touchAction: "none",
        boxShadow: selected
          ? "0 0 0 2px #d4a017, 2px 4px 10px rgba(0,0,0,0.5)"
          : connectPending
          ? "0 0 0 2px #c0392b, 2px 4px 10px rgba(0,0,0,0.5)"
          : "2px 4px 10px rgba(0,0,0,0.4)",
        borderRadius: 2,
        padding: obj.type === "note" ? "14px 12px" : "10px 12px",
        cursor: "grab",
        transform: obj.type === "note" ? "rotate(-1deg)" : "none",
        display: "flex",
        flexDirection: "column",
        userSelect: "none",
      }}
    >
      {obj.pinned && (
        <div style={{
          position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)",
          width: 10, height: 10, borderRadius: "50%", background: "#c0392b",
          boxShadow: "0 1px 2px rgba(0,0,0,0.6)",
        }} />
      )}
      {obj.type === "card" && (
        <input
          value={obj.title}
          onChange={(e) => onChange({ title: e.target.value })}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            background: "transparent", border: "none", outline: "none",
            fontFamily: "'Special Elite', monospace", fontSize: 13, color: "#241d18",
            marginBottom: 4, width: "100%",
          }}
        />
      )}
      <textarea
        value={obj.text}
        onChange={(e) => onChange({ text: e.target.value })}
        onPointerDown={(e) => e.stopPropagation()}
        placeholder={obj.type === "note" ? "заметка…" : "детали…"}
        style={{
          background: "transparent", border: "none", outline: "none", resize: "none",
          fontFamily: "'Courier Prime', monospace", fontSize: 12, color: "#3a2f26",
          flex: 1, width: "100%",
        }}
      />
    </div>
  );
}

// ---------- styles ----------
const primaryBtn = {
  display: "flex", alignItems: "center", gap: 8, background: "#c0392b", color: "#f0e6d2",
  border: "none", borderRadius: 3, padding: "10px 16px", fontFamily: "'Courier Prime', monospace",
  fontWeight: 700, fontSize: 13, cursor: "pointer", letterSpacing: 0.5,
};
const searchInput = {
  width: "100%", boxSizing: "border-box", padding: "10px 14px 10px 38px", borderRadius: 3,
  border: "1px solid #4a3c30", background: "#2b2420", color: "#e8e0d0",
  fontFamily: "'Courier Prime', monospace", fontSize: 13, outline: "none",
};
const boardCard = {
  position: "relative", background: "#4a3c30", borderRadius: 3, padding: 16, minHeight: 110,
  cursor: "pointer", overflow: "hidden", border: "1px solid #5a4c3d",
};
const corkPattern = {
  position: "absolute", inset: 0,
  backgroundImage: "radial-gradient(rgba(0,0,0,0.15) 1px, transparent 1px)",
  backgroundSize: "6px 6px", opacity: 0.5,
};
const pinDot = {
  position: "absolute", bottom: 10, right: 12, width: 6, height: 6, borderRadius: "50%",
  background: "#c0392b", boxShadow: "0 0 4px rgba(192,57,43,0.8)",
};
const iconBtn = {
  background: "transparent", border: "none", cursor: "pointer", padding: 6,
  borderRadius: 3, color: "#e8e0d0", display: "flex", alignItems: "center", justifyContent: "center",
};
const iconBtnSmall = { ...iconBtn, padding: 3 };
const topBar = {
  position: "absolute", top: 0, left: 0, right: 0, height: 48, display: "flex", alignItems: "center",
  gap: 10, padding: "0 12px", background: "rgba(36,29,24,0.92)", borderBottom: "1px solid #4a3c30", zIndex: 10,
};
const titleText = {
  fontFamily: "'Special Elite', monospace", fontSize: 15, cursor: "text", color: "#e8e0d0",
};
const titleInput = {
  fontFamily: "'Special Elite', monospace", fontSize: 15, background: "#2b2420", color: "#e8e0d0",
  border: "1px solid #4a3c30", borderRadius: 2, padding: "3px 8px", outline: "none",
};
const zoomBox = {
  position: "absolute", right: 12, bottom: 90, background: "rgba(36,29,24,0.92)",
  border: "1px solid #4a3c30", borderRadius: 4, padding: 6, display: "flex",
  flexDirection: "column", alignItems: "center", gap: 4, zIndex: 10,
};
const modeBox = {
  position: "absolute", left: 12, bottom: 18, background: "rgba(36,29,24,0.94)",
  border: "1px solid #4a3c30", borderRadius: 6, padding: 4, display: "flex",
  gap: 4, zIndex: 10,
};
const modeBtn = {
  display: "flex", alignItems: "center", gap: 5, border: "none", borderRadius: 4,
  padding: "8px 10px", fontFamily: "'Courier Prime', monospace", fontSize: 11, cursor: "pointer",
};
const toolbar = {
  position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: 18,
  display: "flex", gap: 8, background: "rgba(36,29,24,0.94)", border: "1px solid #4a3c30",
  borderRadius: 6, padding: 8, zIndex: 10,
};
const toolBtn = {
  display: "flex", alignItems: "center", gap: 6, background: "#3a2f26", color: "#e8e0d0",
  border: "none", borderRadius: 4, padding: "8px 12px", fontFamily: "'Courier Prime', monospace",
  fontSize: 12, cursor: "pointer",
};
const inspector = {
  position: "absolute", right: 12, top: 60, background: "rgba(36,29,24,0.96)",
  border: "1px solid #4a3c30", borderRadius: 6, padding: 12, width: 160, zIndex: 10,
};
const smallToggle = {
  flex: 1, border: "1px solid #4a3c30", borderRadius: 3, padding: "5px 6px", fontSize: 11,
  cursor: "pointer", fontFamily: "'Courier Prime', monospace",
};
