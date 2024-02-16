import React, { useEffect, useRef, useState } from "react";
import { useReactFlow } from "reactflow";
import { nodeHeight, nodeWidth } from "@/constants";
import toast from "react-hot-toast";
import LoadTranscript from "@/components/LoadTranscript";
import Settings from "@/components/Settings";

function tryLoad() {
  try {
    return (JSON.parse(localStorage.getItem("saved")) || []).map(stringIds);
  } catch (e) {
    return [];
  }
}

function stringIds(entry) {
  return {
    ...entry,
    nodes: entry.nodes.map((n) => ({
      ...n,
      id: n.id + "",
    })),
    edges: entry.edges.map((e) => ({
      ...e,
      source: e.source + "",
      target: e.target + "",
    })),
  };
}

export default function Saved({ onLayout = () => {} }) {
  const { setNodes, setEdges, fitView } = useReactFlow();
  const container = useRef(null);

  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(tryLoad());

  useEffect(() => {
    function onClick(e) {
      if (!container.current.contains(e.target)) {
        setExpanded(false);
      }
    }

    document.body.addEventListener("click", onClick);
    return () => document.body.removeEventListener("click", onClick);
  }, [container, setExpanded]);

  function clear() {
    setName("");
    setNodes([
      {
        id: "1",
        position: { x: 0, y: 0 },
        width: nodeWidth,
        height: nodeHeight,
        type: "textUpdater",
        data: { text: "", author: "user" },
      },
    ]);
    setEdges([]);
    setTimeout(() => fitView(), 1);
  }

  function save() {
    const newSave = [
      {
        name,
        nodes: [...store.getState().nodeInternals.values()],
        edges: store.getState().edges,
      },
      ...saved.filter((n) => n.name !== name),
    ];
    setSaved(newSave);
    localStorage.setItem("saved", JSON.stringify(newSave));

    toast.success(
      <span>
        Saved <span className="font-bold"> {name}</span>
      </span>
    );
  }

  function load(data) {
    clear();

    setTimeout(() => {
      setName(data.name);
      setNodes(data.nodes);
      setEdges(data.edges);
      setTimeout(() => fitView(), 1);
      toast.success(
        <span>
          Loaded <span className="font-bold"> {data.name}</span>
        </span>
      );
    }, 1);
  }

  function remove(item) {
    if (confirm(`Really delete ${item.name}?`)) {
      const newSave = saved.filter((n) => n.name !== item.name);
      setSaved(newSave);
      localStorage.setItem("saved", JSON.stringify(newSave));
      toast(
        <span>
          Deleted <span className="font-bold"> {item.name}</span>
        </span>,
        { icon: "🗑️" }
      );
    }
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.metaKey && e.keyCode == 83) {
        e.preventDefault();
        save();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [save]);

  async function loadFromClipboard() {
    let text = "";
    try {
      text = await navigator.clipboard.readText();
    } catch (error) {
      text = document.execCommand("paste");
    }
    try {
      const data = JSON.parse(text);
      data.name = data.name || "Untitled";

      data.nodes = data.nodes.map((n) => ({
        ...n,
        position: { x: 0, y: 0 },
        width: nodeWidth,
        height: nodeHeight,
        type: "textUpdater",
      }));

      load(data);
    } catch (e) {
      alert(e.message);
    }
  }

  async function loadTranscript(data) {
    data.nodes = data.nodes.map((n) => ({
      ...n,
      position: { x: 0, y: 0 },
      width: nodeWidth,
      height: nodeHeight,
      type: "textUpdater",
    }));
    load(data);
  }

  if (!expanded) {
    return (
      <div
        ref={container}
        className="fixed top-0 left-0 dark:bg-black bg-white text-3xl p-1 px-3 pb-2 m-3 rounded leading-none cursor-pointer"
        onClick={() => setExpanded(true)}
      >
        +
      </div>
    );
  }

  return (
    <div
      className="fixed top-0 left-0 dark:bg-black bg-white bottom-0 flex flex-col"
      ref={container}
    >
      <div className="px-4 pt-4">
        <div className="flex flex-row gap-2 justify-between items-center">
          <div className="flex gap-2">
            <button className="border p-1 px-3" onClick={clear}>New</button>
            <button className="border p-1 px-3" onClick={loadFromClipboard}>📋</button>
            <LoadTranscript className="border p-1 px-3" onLoad={loadTranscript} />
            <Settings className="border p-1 px-3" />
          </div>
        </div>

        <div className="mt-4">
          <form
            className="flex"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <input
              value={name}
              className="p-2 mr-2 rounded border flex-1"
              placeholder="Save name"
              onChange={(e) => setName(e.target.value)}
            />
            <button className="border p-2 px-4">Save</button>
          </form>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4">
        {saved.map((d) => (
          <p
            className="border rounded p-1 px-2 my-4 cursor-pointer dark:hover:bg-black dark:hover:text-white hover:bg-blue-50 hover:text-black flex flex-row justify-between gap-4"
            onClick={() => load(d)}
          >
            <span>{d.name}</span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                remove(d);
              }}
            >
              X
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}
