import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Stage,
  Layer,
  Rect,
  Circle,
  Line,
  Text,
  Ellipse,
  Arrow,
  Group,
  Transformer,
} from "react-konva";
import {
  MousePointer2,
  Pencil,
  Square,
  CircleDot,
  Minus,
  ArrowRight,
  Type,
  StickyNote,
  Eraser,
  ArrowLeft,
} from "lucide-react";
import useBoardStore from "../store/boardStore";
import useSocket from "../hooks/useSocket";
import useAuthStore from "../store/authStore";

const TOOLS = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "pen", label: "Pen", icon: Pencil },
  { id: "rect", label: "Rect", icon: Square },
  { id: "ellipse", label: "Ellipse", icon: CircleDot },
  { id: "line", label: "Line", icon: Minus },
  { id: "arrow", label: "Arrow", icon: ArrowRight },
  { id: "text", label: "Text", icon: Type },
  { id: "sticky", label: "Sticky", icon: StickyNote },
  { id: "eraser", label: "Eraser", icon: Eraser },
];
const CLICK_TOOLS = new Set(["text", "sticky"]);

export default function BoardEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentBoard,
    elements,
    loading,
    loadBoard,
    presentUsers,
    updateElement,
    removeElement,
  } = useBoardStore();
  const { emit } = useSocket(id);

  // All state
  const [tool, setTool] = useState("select");
  const [color, setColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [opacity, setOpacity] = useState(1);
  const [fontSize, setFontSize] = useState(20);
  const [selectedIds, setSelectedIds] = useState([]);
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [stageScale, setStageScale] = useState(1);
  const [showShare, setShowShare] = useState(false);
  const [renderTick, setRenderTick] = useState(0); // force re-render
  const [editingTextId, setEditingTextId] = useState(null);
  const [editingTextValue, setEditingTextValue] = useState("");
  const [editingTextPos, setEditingTextPos] = useState({
    left: 0,
    top: 0,
    width: 200,
    height: 60,
    fontSize: 14,
  });
  const [isTransforming, setIsTransforming] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [viewport, setViewport] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  const stageRef = useRef(null);
  const textEditRef = useRef(null);
  const transformerRef = useRef(null);
  const shapeRefs = useRef({});
  const clipboardRef = useRef([]);

  // Track hovered state to prevent stage drag interference
  const [hoveredId, setHoveredId] = useState(null);
  // Drawing refs – SOURCE of truth, not React state
  const drawing = useRef({
    isDrawing: false,
    shape: null, // { type, attrs }
  });

  useEffect(() => {
    if (id) loadBoard(id);
  }, [id, loadBoard]);

  useEffect(() => {
    const onResize = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (tool !== "select") setSelectedIds([]);
  }, [tool]);

  const getRole = () => {
    if (!currentBoard || !user) return "viewer";
    if (
      currentBoard.ownerId?._id === user._id ||
      currentBoard.ownerId === user._id
    )
      return "owner";
    const col = currentBoard.collaborators?.find(
      (c) => c.userId?._id === user._id || c.userId === user._id
    );
    return col?.role || "viewer";
  };
  const role = getRole();
  const canEdit = role === "owner" || role === "editor";

  const forceRender = () => setRenderTick((t) => t + 1);

  const getSelectedElements = useCallback(
    () => elements.filter((el) => selectedIds.includes(el._id)),
    [elements, selectedIds]
  );

  const cloneElementForPaste = useCallback((el, offset = 24) => {
    const attrs = { ...(el.attrs || {}) };
    if (Array.isArray(attrs.points)) {
      attrs.points = attrs.points.map((point) => point + offset);
    } else {
      attrs.x = (attrs.x || 0) + offset;
      attrs.y = (attrs.y || 0) + offset;
    }
    return {
      type: el.type,
      attrs,
      zIndex: el.zIndex,
    };
  }, []);

  const copySelection = useCallback(() => {
    const selected = getSelectedElements();
    clipboardRef.current = selected.map((el) => ({
      ...el,
      attrs: { ...(el.attrs || {}) },
    }));
  }, [getSelectedElements]);

  const pasteClipboard = useCallback(
    (offset = 24) => {
      if (!canEdit || clipboardRef.current.length === 0) return;
      clipboardRef.current.forEach((el) => {
        emit("element:add", cloneElementForPaste(el, offset));
      });
      setTool("select");
      setContextMenu(null);
    },
    [canEdit, cloneElementForPaste, emit]
  );

  const duplicateSelection = useCallback(() => {
    if (!canEdit || selectedIds.length === 0) return;
    getSelectedElements().forEach((el) => {
      emit("element:add", cloneElementForPaste(el, 28));
    });
    setContextMenu(null);
  }, [canEdit, cloneElementForPaste, emit, getSelectedElements, selectedIds]);

  const makeShapeData = (canvasX, canvasY) => {
    const attrs = {
      x: canvasX,
      y: canvasY,
      fill: color,
      stroke: color,
      strokeWidth,
      opacity,
    };
    const s = { type: tool, attrs };

    if (tool === "pen") {
      s.attrs = {
        ...s.attrs,
        points: [canvasX, canvasY],
        stroke: color,
        strokeWidth,
        tension: 0.5,
        lineCap: "round",
        lineJoin: "round",
      };
    } else if (tool === "rect") {
      s.attrs = {
        ...s.attrs,
        width: 0,
        height: 0,
        stroke: color,
        strokeWidth,
        fill: color + "33",
      };
    } else if (tool === "ellipse") {
      s.attrs = {
        ...s.attrs,
        radiusX: 0,
        radiusY: 0,
        stroke: color,
        strokeWidth,
        fill: color + "33",
      };
    } else if (tool === "line" || tool === "arrow") {
      s.attrs = {
        ...s.attrs,
        points: [canvasX, canvasY, canvasX, canvasY],
        stroke: color,
        strokeWidth,
        lineCap: "round",
        pointerLength: tool === "arrow" ? 10 : undefined,
        pointerWidth: tool === "arrow" ? 10 : undefined,
      };
    } else if (tool === "text") {
      s.attrs = { ...s.attrs, text: "Type here", fontSize, fill: color };
    } else if (tool === "sticky") {
      s.attrs = {
        ...s.attrs,
        text: "Note",
        fontSize: 14,
        width: 200,
        height: 200,
        fill: "#FFEB3B",
        stroke: "#FBC02D",
        strokeWidth: 2,
      };
    }
    return s;
  };

  const onMouseDown = useCallback(
    (e) => {
      if (!canEdit || tool === "select" || tool === "eraser") {
        setContextMenu(null);
        if (tool === "select" && e.target === e.target.getStage())
          setSelectedIds([]);
        return;
      }
      setContextMenu(null);
      const pos = e.target.getStage().getPointerPosition();
      const cx = (pos.x - stagePos.x) / stageScale;
      const cy = (pos.y - stagePos.y) / stageScale;
      const sd = makeShapeData(cx, cy);

      if (CLICK_TOOLS.has(tool)) {
        emit("element:add", sd);
        return;
      }
      // Start drag draw
      drawing.current = { isDrawing: true, shape: sd };
      forceRender();
    },
    [canEdit, tool, stagePos, stageScale, makeShapeData, emit]
  );

  const onMouseMove = useCallback(
    (e) => {
      const pos = e.target.getStage().getPointerPosition();
      const canvasX = (pos.x - stagePos.x) / stageScale;
      const canvasY = (pos.y - stagePos.y) / stageScale;
      emit("cursor:move", {
        x: canvasX,
        y: canvasY,
        activity: tool === "select" ? "selecting" : "drawing",
        selectedElementId:
          tool === "select" && selectedIds.length === 1 ? selectedIds[0] : null,
      });

      const d = drawing.current;
      if (!d.isDrawing || !d.shape) return;

      const currentPos = e.target.getStage().getPointerPosition();
      const absX = (currentPos.x - stagePos.x) / stageScale;
      const absY = (currentPos.y - stagePos.y) / stageScale;
      const shape = d.shape;
      const sx = shape.attrs.x;
      const sy = shape.attrs.y;

      if (shape.type === "pen") {
        shape.attrs.points = [...shape.attrs.points, absX, absY];
      } else if (shape.type === "rect") {
        shape.attrs.width = absX - sx;
        shape.attrs.height = absY - sy;
        shape.attrs.x = absX > sx ? sx : absX;
        shape.attrs.y = absY > sy ? sy : absY;
      } else if (shape.type === "ellipse") {
        shape.attrs.radiusX = Math.abs(absX - sx) / 2;
        shape.attrs.radiusY = Math.abs(absY - sy) / 2;
        shape.attrs.x = (absX + sx) / 2;
        shape.attrs.y = (absY + sy) / 2;
      } else if (shape.type === "line" || shape.type === "arrow") {
        shape.attrs.points = [sx, sy, absX, absY];
      }
      forceRender();
    },
    [emit, stagePos, stageScale]
  );

  const onMouseUp = useCallback(() => {
    const d = drawing.current;
    if (!d.isDrawing || !d.shape) return;
    d.isDrawing = false;

    const shape = d.shape;
    // Filter tiny
    if (
      shape.type === "rect" &&
      Math.abs(shape.attrs.width) < 3 &&
      Math.abs(shape.attrs.height) < 3
    ) {
      d.shape = null;
      forceRender();
      return;
    }
    if (
      (shape.type === "line" || shape.type === "arrow") &&
      shape.attrs.points
    ) {
      const [x1, y1, x2, y2] = shape.attrs.points;
      if (Math.abs(x2 - x1) < 3 && Math.abs(y2 - y1) < 3) {
        d.shape = null;
        forceRender();
        return;
      }
    }
    if (
      shape.type === "ellipse" &&
      shape.attrs.radiusX < 2 &&
      shape.attrs.radiusY < 2
    ) {
      d.shape = null;
      forceRender();
      return;
    }

    emit("element:add", shape);
    d.shape = null;
    forceRender();
  }, [emit]);

  const onDragEnd = useCallback(
    (e, el) => {
      const changes = {
        attrs: { x: e.target.x(), y: e.target.y() },
      };
      updateElement(el._id, changes);
      emit("element:update", {
        id: el._id,
        changes,
      });
    },
    [emit, updateElement]
  );

  const commitTransform = useCallback(
    (node, el) => {
      if (!node || !el) return;
      const sx = node.scaleX(),
        sy = node.scaleY();
      const changes = {
        attrs: { x: node.x(), y: node.y(), rotation: node.rotation() },
      };
      const scaleX = Math.abs(sx);
      const scaleY = Math.abs(sy);

      if (el.type === "ellipse") {
        changes.attrs.radiusX = Math.max(
          (el.attrs?.radiusX || node.radiusX()) * scaleX,
          5
        );
        changes.attrs.radiusY = Math.max(
          (el.attrs?.radiusY || node.radiusY()) * scaleY,
          5
        );
      } else if (el.type === "line" || el.type === "arrow") {
        const oldPoints = el.attrs?.points || [];
        changes.attrs.points = oldPoints.map((point, index) =>
          index % 2 === 0 ? point * sx : point * sy
        );
      } else if (el.type === "text") {
        changes.attrs.fontSize = Math.max(
          (node.fontSize() * Math.abs(sx) + node.fontSize() * Math.abs(sy)) / 2,
          8
        );
      } else if (el.type === "sticky") {
        changes.attrs.width = Math.max((el.attrs?.width || 200) * scaleX, 50);
        changes.attrs.height = Math.max((el.attrs?.height || 200) * scaleY, 50);
      } else if (el.type !== "pen" && el.type !== "freehand") {
        changes.attrs.width = Math.max(
          (el.attrs?.width || node.width()) * scaleX,
          5
        );
        changes.attrs.height = Math.max(
          (el.attrs?.height || node.height()) * scaleY,
          5
        );
      }
      node.scaleX(1);
      node.scaleY(1);
      updateElement(el._id, changes);
      emit("element:update", { id: el._id, changes });
    },
    [emit, updateElement]
  );

  const onTransformerEnd = useCallback(() => {
    setIsTransforming(false);
    selectedIds.forEach((selectedId) => {
      const node = shapeRefs.current[selectedId];
      const el = elements.find((item) => item._id === selectedId);
      commitTransform(node, el);
    });
  }, [commitTransform, elements, selectedIds]);

  const onDelete = useCallback(() => {
    selectedIds.forEach((id) => {
      removeElement(id);
      emit("element:delete", { id });
    });
    setSelectedIds([]);
    setContextMenu(null);
  }, [selectedIds, emit, removeElement]);

  const clearAll = useCallback(() => {
    if (!canEdit || elements.length === 0) return;
    if (!window.confirm("Clear all items from this board?")) return;
    elements.forEach((el) => {
      removeElement(el._id);
      emit("element:delete", { id: el._id });
    });
    setSelectedIds([]);
    setContextMenu(null);
  }, [canEdit, elements, emit, removeElement]);

  const onEraser = useCallback(
    (e) => {
      const t = e.target;
      if (t !== e.target.getStage()) {
        const id = t.id() || t.findAncestor("Group")?.id();
        if (id) {
          removeElement(id);
          emit("element:delete", { id });
        }
      }
    },
    [emit, removeElement]
  );

  const onKeyDown = useCallback(
    (e) => {
      const activeTag = document.activeElement?.tagName;
      const isTyping =
        activeTag === "INPUT" ||
        activeTag === "TEXTAREA" ||
        document.activeElement?.isContentEditable;
      if ((e.key === "Delete" || e.key === "Backspace") && !isTyping)
        onDelete();
      if (isTyping) return;
      const key = e.key.toLowerCase();
      const hasModifier = e.ctrlKey || e.metaKey;

      if (hasModifier && key === "a") {
        e.preventDefault();
        setSelectedIds(elements.map((el) => el._id));
        return;
      }
      if (hasModifier && key === "c") {
        e.preventDefault();
        copySelection();
        return;
      }
      if (hasModifier && key === "x") {
        e.preventDefault();
        copySelection();
        onDelete();
        return;
      }
      if (hasModifier && key === "v") {
        e.preventDefault();
        pasteClipboard();
        return;
      }
      if (hasModifier && key === "d") {
        e.preventDefault();
        duplicateSelection();
        return;
      }
      if (hasModifier && e.shiftKey && key === "backspace") {
        e.preventDefault();
        clearAll();
        return;
      }
      if (key === "escape") {
        setSelectedIds([]);
        setContextMenu(null);
        return;
      }
      if (hasModifier && key === "z") {
        emit("board:undo", { targetId: selectedIds[0] });
        e.preventDefault();
      }
      if (hasModifier && key === "y") {
        emit("board:redo", { targetId: selectedIds[0] });
        e.preventDefault();
      }
    },
    [
      copySelection,
      clearAll,
      duplicateSelection,
      elements,
      emit,
      onDelete,
      pasteClipboard,
      selectedIds,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;
    const nodes = selectedIds
      .map((selectedId) => shapeRefs.current[selectedId])
      .filter(Boolean);
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedIds, elements, renderTick]);

  const onWheel = useCallback(
    (e) => {
      e.evt.preventDefault();
      const scaleBy = 1.1;
      const st = e.target.getStage();
      const old = st.scaleX();
      const ptr = st.getPointerPosition();
      const dir = e.evt.deltaY > 0 ? -1 : 1;
      const ns = dir > 0 ? old * scaleBy : old / scaleBy;
      const mpt = {
        x: (ptr.x - stagePos.x) / old,
        y: (ptr.y - stagePos.y) / old,
      };
      setStageScale(ns);
      setStagePos({ x: ptr.x - mpt.x * ns, y: ptr.y - mpt.y * ns });
    },
    [stagePos]
  );

  const onContextMenu = useCallback(
    (e) => {
      e.evt.preventDefault();
      const stage = e.target.getStage();
      const target = e.target;
      const elId =
        target === stage
          ? null
          : target.id() || target.findAncestor("Group")?.id();

      if (elId && !selectedIds.includes(elId)) {
        setSelectedIds([elId]);
      }
      if (!elId && selectedIds.length === 0) {
        setSelectedIds([]);
      }

      setContextMenu({
        x: e.evt.clientX,
        y: e.evt.clientY,
        hasSelection: Boolean(elId || selectedIds.length),
        canPaste: clipboardRef.current.length > 0,
      });
    },
    [selectedIds]
  );

  const drawShape = (el, isNew) => {
    const a = el.attrs || {};
    const elKey = isNew ? "new" : el._id;
    const common = {
      id: el._id,
      ref: (node) => {
        if (node) shapeRefs.current[el._id] = node;
        else delete shapeRefs.current[el._id];
      },
      draggable: canEdit && !isNew,
      onClick: (e) => {
        e.cancelBubble = true;
        if (tool === "select") setSelectedIds([el._id]);
      },
      onTap: (e) => {
        e.cancelBubble = true;
        if (tool === "select") setSelectedIds([el._id]);
      },
      onMouseEnter: () => setHoveredId(el._id),
      onMouseLeave: () => setHoveredId(null),
      onDragStart: () => {
        emit("cursor:move", {
          x: 0,
          y: 0,
          activity: "dragging",
          selectedElementId: el._id,
        });
      },
      onDragEnd: (e) => onDragEnd(e, el),
    };

    switch (el.type) {
      case "rect":
        return (
          <Rect
            key={elKey}
            {...common}
            x={a.x}
            y={a.y}
            width={a.width}
            height={a.height}
            fill={a.fill}
            stroke={a.stroke}
            strokeWidth={a.strokeWidth}
            opacity={a.opacity}
            rotation={a.rotation}
          />
        );
      // case "ellipse":
      //   return (
      //     <Ellipse
      //       key={elKey}
      //       {...common}
      //       x={a.x}
      //       y={a.y}
      //       radiusX={a.radiusX}
      //       radiusY={a.radiusY}
      //       fill={a.fill}
      //       stroke={a.stroke}
      //       strokeWidth={a.strokeWidth}
      //       opacity={a.opacity}
      //       rotation={a.rotation}
      //     />
      //   );
      case "line":
      case "arrow": {
        const C = el.type === "arrow" ? Arrow : Line;
        return (
          <C
            key={elKey}
            {...common}
            points={a.points}
            stroke={a.stroke}
            strokeWidth={a.strokeWidth}
            opacity={a.opacity}
            lineCap="round"
            lineJoin="round"
            tension={a.tension}
            pointerLength={a.pointerLength}
            pointerWidth={a.pointerWidth}
          />
        );
      }
      case "text":
        return (
          <Text
            key={elKey}
            {...common}
            x={a.x}
            y={a.y}
            text={a.text === "" ? " " : a.text ?? " "}
            fontSize={a.fontSize}
            fill={a.fill}
            opacity={a.opacity}
            rotation={a.rotation}
          />
        );
      case "sticky":
        return (
          <Group key={elKey} {...common} x={a.x} y={a.y} rotation={a.rotation}>
            <Rect
              width={a.width || 200}
              height={a.height || 200}
              fill={a.fill || "#FFEB3B"}
              stroke={a.stroke || "#FBC02D"}
              strokeWidth={2}
            />
            <Text
              x={10}
              y={10}
              text={a.text ?? "Note"}
              fontSize={a.fontSize || 14}
              fill="#333"
              width={(a.width || 200) - 20}
            />
          </Group>
        );
      case "freehand":
      case "pen":
        return (
          <Line
            key={elKey}
            {...common}
            points={a.points}
            stroke={a.stroke}
            strokeWidth={a.strokeWidth}
            opacity={a.opacity}
            tension={a.tension || 0.5}
            lineCap="round"
            lineJoin="round"
          />
        );
      default:
        return null;
    }
  };

  const onDblClick = useCallback(
    (e) => {
      const target = e.target;
      if (target === e.target.getStage()) return;
      const elId = target.id() || target.findAncestor("Group")?.id();
      if (!elId) return;
      const el = elements.find((x) => x._id === elId);
      if (!el || !canEdit) return;
      if (el.type === "text" || el.type === "sticky") {
        setEditingTextId(el._id);
        setEditingTextValue(el.attrs?.text || "");
        setTimeout(() => {
          const node = stageRef.current?.findOne("#" + el._id);
          if (!node) return;
          const p = node.getAbsolutePosition();
          const w =
            (el.type === "sticky" ? el.attrs?.width || 200 : 200) * stageScale;
          const h =
            (el.type === "sticky" ? el.attrs?.height || 200 : 60) * stageScale;
          const fs = (el.attrs?.fontSize || 14) * stageScale;
          setEditingTextPos({
            left: p.x * stageScale + stagePos.x,
            top: p.y * stageScale + stagePos.y,
            width: w,
            height: h,
            fontSize: fs,
          });
          setTimeout(() => textEditRef.current?.focus(), 50);
        }, 0);
      }
    },
    [elements, canEdit, stageScale, stagePos]
  );

  const saveTextEdit = useCallback(() => {
    const id = editingTextId;
    if (id && editingTextValue.trim()) {
      const changes = { attrs: { text: editingTextValue } };
      updateElement(id, changes);
      emit("element:update", { id, changes });
    }
    setEditingTextId(null);
    setEditingTextValue("");
    forceRender();
  }, [editingTextId, editingTextValue, updateElement, emit]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Get the shape being drawn from ref for rendering
  const drawingShape = drawing.current.isDrawing ? drawing.current.shape : null;

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      {/* Toolbar */}
      <div className="z-20 flex items-center gap-2 border-b border-slate-200 bg-white/90 p-3 shadow-sm backdrop-blur-xl">
        <button
          onClick={() => navigate("/dashboard")}
          className="btn-secondary shrink-0 rounded-2xl px-3 py-2 text-sm font-bold"
        >
          <ArrowLeft />
        </button>
        <div className="min-w-0 shrink-0 border-r border-slate-200 pr-3">
          <p className="max-w-44 truncate text-sm font-black text-slate-950">
            {currentBoard?.title || "Untitled board"}
          </p>
          <p className="text-xs font-semibold text-slate-500">
            {Math.round(stageScale * 100)}% zoom
          </p>
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto rounded-2xl bg-slate-100 p-1">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.label}
              className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-sm font-black transition ${
                tool === t.id
                  ? "bg-teal-700 text-white shadow-md shadow-teal-900/20"
                  : "text-slate-600 hover:bg-white hover:text-slate-950"
              }`}
            >
              <t.icon size={18} />
            </button>
          ))}
        </div>
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-10 w-10 shrink-0 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
          title="Color"
        />
        <input
          type="range"
          min="1"
          max="20"
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          className="hidden w-20 accent-teal-700 md:block"
          title="Stroke Width"
        />
        <input
          type="range"
          min="0.1"
          max="1"
          step="0.1"
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="hidden w-20 accent-teal-700 lg:block"
          title="Opacity"
        />
        <input
          type="number"
          min="8"
          max="72"
          value={fontSize}
          onChange={(e) => setFontSize(Number(e.target.value))}
          className="control hidden w-16 rounded-xl px-2 py-2 text-sm md:block"
          title="Font Size"
        />
        {selectedIds.length > 0 && (
          <button
            onClick={onDelete}
            className="shrink-0 rounded-xl bg-rose-600 px-3 py-2 text-sm font-bold text-white hover:bg-rose-700"
          >
            Delete
          </button>
        )}
        {elements.length > 0 && (
          <button
            onClick={clearAll}
            className="hidden shrink-0 rounded-xl px-3 py-2 text-sm font-bold text-rose-600 hover:bg-rose-50 md:inline-flex"
            title="Clear all items"
          >
            Clear All
          </button>
        )}
        <button
          onClick={() => {
            const u = stageRef.current.toDataURL({ mimeType: "image/png" });
            const l = document.createElement("a");
            l.download = `${currentBoard?.title || "board"}.png`;
            l.href = u;
            l.click();
          }}
          className="btn-secondary hidden shrink-0 rounded-xl px-3 py-2 text-sm font-bold sm:inline-flex"
        >
          Export
        </button>
        <button
          onClick={() => setShowShare(!showShare)}
          className="btn-primary shrink-0 rounded-xl px-4 py-2 text-sm font-bold"
        >
          Share
        </button>
        <span
          className={`hidden rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide sm:inline-flex ${
            role === "owner"
              ? "bg-violet-100 text-violet-700"
              : role === "editor"
              ? "bg-teal-100 text-teal-700"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {role}
        </span>
      </div>

      {/* Presence */}
      <div className="z-10 flex items-center gap-2 border-b border-slate-200 bg-white/70 px-4 py-2 backdrop-blur-xl">
        <span className="mr-1 text-xs font-bold uppercase tracking-wide text-slate-500">
          Live
        </span>
        {presentUsers.map((u, i) => (
          <div
            key={u.userId || i}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-sm"
            style={{ backgroundColor: u.color }}
            title={u.name}
          >
            {u.name?.[0]?.toUpperCase() || "?"}
          </div>
        ))}
        {presentUsers.length === 0 && (
          <span className="text-xs font-semibold text-slate-400">Only you</span>
        )}
      </div>

      {/* Text edit overlay - inline, positioned over the element */}
      {editingTextId && (
        <textarea
          ref={textEditRef}
          value={editingTextValue}
          onChange={(e) => setEditingTextValue(e.target.value)}
          onBlur={saveTextEdit}
          onKeyDownCapture={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Escape") {
              setEditingTextId(null);
              setEditingTextValue("");
              forceRender();
            }
            if (e.key === "Enter" && !e.shiftKey) e.target.blur();
          }}
          style={{
            position: "fixed",
            left: editingTextPos.left + "px",
            top: editingTextPos.top + "px",
            width: editingTextPos.width + "px",
            height: editingTextPos.height + "px",
            fontSize: editingTextPos.fontSize + "px",
            zIndex: 100,
            border: "2px solid #3b82f6",
            background: "white",
            padding: "4px",
            fontFamily: "sans-serif",
            resize: "both",
            outline: "none",
            overflow: "hidden",
            minWidth: 100,
            minHeight: 30,
          }}
        />
      )}

      {/* Canvas */}
      <div className="canvas-grid relative flex-1 overflow-hidden">
        <Stage
          ref={stageRef}
          width={viewport.width}
          height={viewport.height - 104}
          onMouseDown={tool === "eraser" ? onEraser : onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onWheel={onWheel}
          onDblClick={onDblClick}
          onContextMenu={onContextMenu}
          draggable={
            tool === "select" &&
            selectedIds.length === 0 &&
            !drawing.current.isDrawing &&
            !isTransforming
          }
          onDragEnd={(e) => setStagePos({ x: e.target.x(), y: e.target.y() })}
          x={stagePos.x}
          y={stagePos.y}
          scaleX={stageScale}
          scaleY={stageScale}
          style={{
            cursor:
              tool === "select"
                ? "default"
                : tool === "pen"
                ? "crosshair"
                : "pointer",
          }}
        >
          <Layer>
            <Rect
              x={-5000}
              y={-5000}
              width={10000}
              height={10000}
              fill="#ffffff"
            />
            {elements.map((el) => drawShape(el, false))}
            {drawingShape && drawShape(drawingShape, true)}
            <Transformer
              ref={transformerRef}
              rotateEnabled
              keepRatio={false}
              ignoreStroke
              enabledAnchors={[
                "top-left",
                "top-center",
                "top-right",
                "middle-left",
                "middle-right",
                "bottom-left",
                "bottom-center",
                "bottom-right",
              ]}
              anchorSize={10}
              anchorCornerRadius={3}
              borderStroke="#0f766e"
              anchorStroke="#0f766e"
              anchorFill="#ffffff"
              onTransformStart={() => setIsTransforming(true)}
              onTransformEnd={onTransformerEnd}
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 8 || newBox.height < 8) return oldBox;
                return newBox;
              }}
            />
          </Layer>
        </Stage>
        {/* Cursor overlay – separate Stage on top, no pan/zoom transform */}
        <Stage
          width={viewport.width}
          height={viewport.height - 104}
          x={0}
          y={0}
          scaleX={1}
          scaleY={1}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "none",
          }}
          listening={false}
        >
          <Layer listening={false}>
            {presentUsers
              .filter((u) => u.userId !== user?._id)
              .map((u, i) => {
                const cx = (u.cursor?.x || 0) * stageScale + stagePos.x;
                const cy = (u.cursor?.y || 0) * stageScale + stagePos.y;
                const label = u.name || "?";
                const color = u.color || "#7c3aed"; // fallback

                // Cursor arrow (pointing down‑right)
                const arrowPoints = [cx, cy, cx + 14, cy + 6, cx + 6, cy + 14];

                // Small tail connecting label to cursor
                const tailPoints = [
                  cx + 20,
                  cy + 2,
                  cx + 28,
                  cy + 2,
                  cx + 24,
                  cy + 10,
                ];

                // Fixed label width – prevents overflow
                const LABEL_MAX_WIDTH = 120;
                const labelPadding = 16;
                const labelHeight = 28;

                return (
                  <Group key={`cursor-${u.userId || i}`}>
                    {/* Glow behind cursor */}
                    <Circle
                      x={cx}
                      y={cy}
                      radius={14}
                      fill={color}
                      opacity={0.2}
                      shadowColor={color}
                      shadowBlur={18}
                    />

                    {/* Cursor arrow (solid triangle) */}
                    <Line
                      points={arrowPoints}
                      closed
                      fill={color}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      lineCap="round"
                      lineJoin="round"
                    />

                    {/* Small dot at the tip for precision */}
                    <Circle x={cx} y={cy} radius={2} fill="#ffffff" />

                    {/* Label background (pill‑shaped) */}
                    <Rect
                      x={cx + 20}
                      y={cy - 14}
                      width={LABEL_MAX_WIDTH}
                      height={labelHeight}
                      cornerRadius={14}
                      fill={color}
                      shadowColor="rgba(0,0,0,0.2)"
                      shadowBlur={8}
                      shadowOffsetY={2}
                      opacity={0.95}
                    />

                    {/* Connector tail (small triangle) */}
                    <Line
                      points={tailPoints}
                      closed
                      fill={color}
                      stroke={color}
                      strokeWidth={0}
                    />

                    {/* User name – with ellipsis if too long */}
                    <Text
                      x={cx + 20 + labelPadding / 2}
                      y={cy - 14 + (labelHeight - 14) / 2} // vertical center
                      text={label}
                      fontSize={13}
                      fontFamily="system-ui, -apple-system, sans-serif"
                      fill="#ffffff"
                      fontStyle="600"
                      width={LABEL_MAX_WIDTH - labelPadding}
                      ellipsis={true}
                      wrap="none"
                    />
                  </Group>
                );
              })}
          </Layer>
        </Stage>
        {contextMenu && (
          <div
            className="absolute z-30 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-2xl shadow-slate-900/20"
            style={{
              left: Math.max(8, Math.min(contextMenu.x, viewport.width - 240)),
              top: Math.max(
                8,
                Math.min(contextMenu.y - 104, viewport.height - 300)
              ),
            }}
          >
            <button
              type="button"
              disabled={!contextMenu.hasSelection}
              onClick={() => {
                copySelection();
                setContextMenu(null);
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Copy <span className="text-xs text-slate-400">Ctrl+C</span>
            </button>
            <button
              type="button"
              disabled={!contextMenu.hasSelection}
              onClick={() => {
                copySelection();
                onDelete();
              }}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Cut <span className="text-xs text-slate-400">Ctrl+X</span>
            </button>
            <button
              type="button"
              disabled={!contextMenu.canPaste}
              onClick={() => pasteClipboard()}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Paste <span className="text-xs text-slate-400">Ctrl+V</span>
            </button>
            <button
              type="button"
              disabled={!contextMenu.hasSelection}
              onClick={duplicateSelection}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Duplicate <span className="text-xs text-slate-400">Ctrl+D</span>
            </button>
            <div className="my-1 border-t border-slate-100" />
            <button
              type="button"
              disabled={!contextMenu.hasSelection}
              onClick={onDelete}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Delete <span className="text-xs text-rose-300">Del</span>
            </button>
            <button
              type="button"
              disabled={elements.length === 0}
              onClick={clearAll}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear All{" "}
              <span className="text-xs text-rose-300">
                Ctrl+Shift+Backspace
              </span>
            </button>
            <div className="border-t border-slate-100 px-3 py-2 text-xs font-medium text-slate-400">
              Ctrl+A select all · Esc clear selection
            </div>
          </div>
        )}
      </div>

      {showShare && (
        <ShareModal board={currentBoard} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}

function ShareModal({ board, onClose }) {
  const [inviteLink, setInviteLink] = useState("");
  const [friends, setFriends] = useState([]);
  const [selectedFriend, setSelectedFriend] = useState("");
  const [role, setRole] = useState("editor");

  useEffect(() => {
    if (board)
      setInviteLink(`${window.location.origin}/invite/${board.inviteToken}`);
    (async () => {
      try {
        const { data } = await (await import("../api/friends")).listFriends();
        setFriends(data.friends);
      } catch {}
    })();
  }, [board]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="panel w-full max-w-md rounded-2xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-950">Share Board</h2>
          <button
            onClick={onClose}
            className="rounded-xl px-3 py-1 text-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            &times;
          </button>
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Invite Link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inviteLink}
              readOnly
              className="control min-w-0 flex-1 rounded-xl px-3 py-2 text-sm"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteLink);
                alert("Link copied!");
              }}
              className="btn-primary rounded-xl px-3 py-2 text-sm font-bold"
            >
              Copy
            </button>
          </div>
          <button
            onClick={async () => {
              try {
                const { data } = await (
                  await import("../api/boards")
                ).regenerateInvite(board._id);
                setInviteLink(
                  `${window.location.origin}/invite/${data.inviteToken}`
                );
              } catch {}
            }}
            className="mt-2 text-xs font-bold text-teal-700 hover:underline"
          >
            Regenerate link
          </button>
        </div>
        <div className="mb-4">
          <label className="mb-1 block text-sm font-semibold text-slate-700">
            Add Friend
          </label>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <select
              value={selectedFriend}
              onChange={(e) => setSelectedFriend(e.target.value)}
              className="control min-w-0 rounded-xl px-3 py-2 text-sm"
            >
              <option value="">Select a friend...</option>
              {friends.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.username}
                </option>
              ))}
            </select>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="control rounded-xl px-3 py-2 text-sm"
            >
              <option value="editor">Editor</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              onClick={async () => {
                try {
                  await (
                    await import("../api/boards")
                  ).addCollaborator(board._id, {
                    userId: selectedFriend,
                    role,
                  });
                  alert("Collaborator added!");
                } catch (err) {
                  alert(err.response?.data?.message || "Error");
                }
              }}
              className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"
            >
              Add
            </button>
          </div>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold text-slate-700">
            Current Collaborators
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {board?.collaborators
              ?.filter((c) => c.role !== "owner")
              .map((c) => (
                <div
                  key={c.userId?._id || c._id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-3"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                      style={{
                        backgroundColor: c.userId?.avatarColor || "#888",
                      }}
                    >
                      {(c.userId?.username || "?")[0].toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold text-slate-800">
                      {c.userId?.username || "Unknown"}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        c.role === "editor"
                          ? "bg-teal-100 text-teal-700"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {c.role}
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await (
                          await import("../api/boards")
                        ).removeCollaborator(board._id, c.userId?._id);
                        alert("Collaborator removed");
                        window.location.reload();
                      } catch {}
                    }}
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            {(!board?.collaborators ||
              board.collaborators.filter((c) => c.role !== "owner").length ===
                0) && (
              <p className="text-xs text-slate-500">No collaborators</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
