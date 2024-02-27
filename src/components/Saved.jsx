import React, { useEffect, useRef, useState } from "react";
import { useReactFlow, useStoreApi } from "reactflow";
import { nodeHeight, nodeWidth } from "@/constants";
import toast from "react-hot-toast";
import LoadTranscript from "@/components/LoadTranscript";
import Settings from "@/components/Settings";
import { docState, savedGraphs } from "@/util/data";
import { v4 } from "uuid";
import { useRecoilState, useRecoilValue } from "recoil";
import HamburgerSvg from '@/icons/hamburger.svg';
import Image from 'next/image';


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
  const {id} = useRecoilValue(docState);
  const [saved, setSaved] = useRecoilState(savedGraphs);

  useEffect(() => {
    function onClick(e) {
      if (!container.current.contains(e.target)) {
        setExpanded(false);
      }
    }

    document.body.addEventListener("click", onClick);
    return () => document.body.removeEventListener("click", onClick);
  }, [container, setExpanded]);

  function createNew() {
    window.location = `/${v4()}`;
  }

  function save() {
    const newSave = [
      {
        id,
        name,
      },
      ...saved.filter((n) => n.id !== id),
    ];
    setSaved(newSave);

    toast.success(
      <span>
        Saved <span className="font-bold"> {name}</span>
      </span>
    );
  }

  function load(data) {
    window.location = `/${data.id}`;
  }

  function remove(item) {
    if (confirm(`Really delete ${item.name}?`)) {
      const newSave = saved.filter((n) => n.id !== item.id);
      setSaved(newSave);
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

  // async function loadFromClipboard() {
  //   let text = "";
  //   try {
  //     text = await navigator.clipboard.readText();
  //   } catch (error) {
  //     text = document.execCommand("paste");
  //   }
  //   try {
  //     const data = JSON.parse(text);
  //     data.name = data.name || "Untitled";

  //     data.nodes = data.nodes.map((n) => ({
  //       ...n,
  //       position: { x: 0, y: 0 },
  //       width: nodeWidth,
  //       height: nodeHeight,
  //       type: "textUpdater",
  //     }));

  //     load(data);
  //   } catch (e) {
  //     alert(e.message);
  //   }
  // }

  async function loadTranscript(data) {
    data.nodes = data.nodes.map((n) => ({
      ...n,
      position: n.position || { x: 0, y: 0 },
      width: n.width || nodeWidth,
      height: n.height || nodeHeight,
      type: n.type || "textUpdater",
    }));
    setNodes(data.nodes);
    setEdges(data.edges);
    // load(data);
  }



  if (!expanded) {
    return (
      <div
        ref={container}
        className="fixed top-0 left-0 dark:bg-gray-800 bg-gray-100 text-3xl p-2 m-3 rounded leading-none cursor-pointer"
        onClick={() => setExpanded(true)}
      >
        <Image src={HamburgerSvg} height={24} width={24} />
      </div>
    );
  }

  return (
    <div
      className="fixed top-0 left-0 dark:bg-gray-900 bg-gray-100 bottom-0 flex flex-col"
      ref={container}
    >
      <div className="px-4 pt-4">
        <div className="flex flex-row gap-2 justify-between items-center">
          <div className="flex gap-2">
            <button className="border p-1 px-3" onClick={createNew}>
              New
            </button>
            {/* <button className="border p-1 px-3" onClick={loadFromClipboard}>
              📋
            </button> */}
            <LoadTranscript
              className="border p-1 px-3"
              onLoad={loadTranscript}
            /> 
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
              className="p-2 mr-2 rounded border flex-1 text-black"
              placeholder="Save name"
              onChange={(e) => setName(e.target.value)}
            />
            <button className="border p-2 px-4">Save</button>
          </form>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4">
        {saved.map((d, i) => (
          <p
            className="border rounded p-1 px-2 my-4 cursor-pointer dark:hover:bg-gray-800 dark:hover:text-white hover:bg-blue-50 hover:text-black flex flex-row justify-between gap-4"
            onClick={() => load(d)}
            key={i}
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
