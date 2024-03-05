import React, { useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  ReactFlowProvider,
  Panel,
  SelectionMode,
} from "reactflow";
import Image from "next/image";
import SaveSvg from "@/icons/save.svg";
import ColorSvg from "@/icons/color.svg";

import dagre from "dagre";
import { Toaster, toast } from "react-hot-toast";
import TextUpdaterNode from "@/components/TextNode";

import useCursorStateSynced from "@/hooks/useCursorStateSynced";
import useNodesStateSynced from "@/hooks/useNodesStateSynced";
import useEdgesStateSynced from "@/hooks/useEdgesStateSynced";
import getNodeHeightFromText from "@/util/getNodeHeightFromText";

import "reactflow/dist/style.css";

// import data from "./data.json";
import Saved from "@/components/Saved";
import {
  getId,
  defaultNode,
  nodeWidth,
  nodeHeight,
  NODE_SPACING_Y,
} from "@/constants";
import {
  docState,
  settingsState,
  userState,
  vectorStoreState,
} from "@/util/data";
import { useRecoilState, useRecoilValue } from "recoil";
import Cursors from "./Cursors";
import useNodeHelpers from "@/util/useNodeHelpers";
import Search from "./Search";
import promptAI from "@/util/promptAI";
import getEmbeddings from "@/util/getEmbeddings";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import kMeans from "@/util/kMeans";
import CustomEdge from "./Edge";

const nodeTypes = { textUpdater: TextUpdaterNode };
const edgeTypes = { default: CustomEdge };

// const initialNodes = data.nodes.map((n) => ({
//   ...n,
//   position: { x: 0, y: 0 },
//   width: nodeWidth,
//   height: nodeHeight,
//   type: "textUpdater",
// }));

// const initialEdges = data.edges;

function download(data) {
  const file = new File([JSON.stringify(data)], "thinkout.json", {
    type: "text/plain",
  });

  const link = document.createElement("a");
  const url = URL.createObjectURL(file);

  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

const initialNodes = [defaultNode];
const initialEdges = [];

function getLayoutedElements(nodes, edges, direction = "TB") {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: 600 + 50,
      height: getNodeHeightFromText(node.data.text) + NODE_SPACING_Y,
    });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? "left" : "top";
    node.sourcePosition = isHorizontal ? "right" : "bottom";

    // We are shifting the dagre node position (anchor=center center) to the top left
    // so it matches the React Flow node anchor point (top left).
    // node.position = {
    //   x: nodeWithPosition.x - (node.width || nodeWidth) / 2,
    //   y: nodeWithPosition.y - (node.height || nodeHeight) / 2,
    // };

    if ((direction = "TB")) {
      node.position = {
        x: nodeWithPosition.x,
        y: nodeWithPosition.y - (node.height || nodeHeight) / 2,
      };
    } else {
      node.position = {
        x: nodeWithPosition.x - (node.width || nodeWidth) / 2,
        y: nodeWithPosition.y,
      };
    }

    return node;
  });

  return { nodes, edges };
}

function Flow(props) {
  const user = useRecoilValue(userState);
  const [nodes, setNodes, onNodesChange, nodesMap] = useNodesStateSynced();
  const [edges, setEdges, onEdgesChange, edgesMap] = useEdgesStateSynced();
  const [cursors, onMouseMove] = useCursorStateSynced();
  const [settings, setSettings] = useRecoilState(settingsState);

  const reactFlow = useReactFlow();
  const reactFlowWrapper = useRef(null);
  const connectingNodeId = useRef(null);
  const helpers = useNodeHelpers();

  // useEffect(() => {
  //   helpers.cleanUpEdges();
  // }, [helpers]);

  const { screenToFlowPosition, fitView } = useReactFlow();
  const onConnect = useCallback(
    (params) => {
      console.log(params);
      // reset the start node on connections
      connectingNodeId.current = null;
      const edge = {
        id: `${params.source}-${params.target}`,
        source: params.source,
        target: params.target,
      };
      edgesMap.set(edge.id, edge);
    },
    [edgesMap]
  );

  const onConnectStart = useCallback((_, { nodeId }) => {
    connectingNodeId.current = nodeId;
  }, []);

  const onConnectEnd = useCallback(
    (event) => {
      if (!connectingNodeId.current) return;

      const targetIsPane = event.target.classList.contains("react-flow__pane");

      if (targetIsPane) {
        // we need to remove the wrapper bounds, in order to get the correct position
        const id = getId();

        const newNode = {
          id,
          position: screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          }),
          type: "textUpdater",
          data: {
            text: "",
            authorId: user.id,
            author: user.name,
            color: user.color,
            pictureUrl: user.pictureUrl,
          },
          origin: [0.5, 0.0],
        };

        nodesMap.set(newNode.id, newNode);
        edgesMap.set(id, { id, source: connectingNodeId.current, target: id });

        setTimeout(() => focusOnNode(newNode.id));
      }
    },
    [screenToFlowPosition, nodesMap, edgesMap]
  );

  // TODO: Factor out of here and graph
  function focusOnNode(id) {
    setTimeout(() => {
      const textEl = document.getElementById(`${id}_textarea`);
      textEl.focus();
      textEl.selectionStart = textEl.value.length;
      textEl.selectionEnd = textEl.value.length;
      fitView({
        nodes: [{ id }],
        padding: 0.005,
        maxZoom: 1.25,
        duration: 300,
      });
    }, 100);
  }

  const onLayout = useCallback(
    (direction) => {
      helpers.cleanUpEdges();

      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(nodes, edges, direction);

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
      // setTimeout(() => fitView(), 1);

      // // TODO: If one node is focused, focus on them
      // Create hook to get selected nodes........?
      const selected = nodes.filter((n) => n.selected);

      setTimeout(() => {
        fitView({
          nodes: selected,
          padding: 0.005,
          maxZoom: 1.25,
          duration: 300,
        });
      }, 1);
    },
    [nodes, edges, helpers]
  );

  useEffect(() => {
    function onZoom(e) {
      // Zoom in
      if (e.metaKey && e.key === "=") {
        e.preventDefault();
        e.stopPropagation();
        reactFlow.zoomIn();

        // Zoom out
      } else if (e.metaKey && e.key === "-") {
        e.preventDefault();
        e.stopPropagation();
        reactFlow.zoomOut();
      }
    }
    document.body.addEventListener("keydown", onZoom);
    return () => document.body.removeEventListener("keydown", onZoom);
  }, [reactFlow]);

  // window.reactFlow = reactFlow;

  return (
    <div
      // style={{ width: "100vw", height: "100vh" }}
      className="wrapper dark:bg-gray-900 absolute top-0 bottom-0 left-0 right-0"
      ref={reactFlowWrapper}
    >
      <Toaster />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        fitView
        fitViewOptions={{ padding: 2 }}
        nodeOrigin={[0.5, 0]}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        minZoom={0.001}
        maxZoom={3}
        // snapToGrid
        panOnScroll
        panOnScrollSpeed={1.5}
        preventScrolling
        // selectionOnDrag
        // panOnDrag={[1, 2]}
        // selectionKeyCode={16}
        selectionMode={SelectionMode.Partial}
        onPointerMove={onMouseMove}
      >
        <Panel position="top-right">
          <div className="flex flex-row gap-2">
            <div
              className="dark:bg-gray-800 bg-gray-100 text-3xl p-1 px-3 pb-2 rounded leading-none cursor-pointer inline-block leading-0"
              onClick={() =>
                helpers.addNode("", {
                  authorId: user.id,
                  author: user.name,
                  color: user.color,
                  pictureUrl: user.pictureUrl,
                })
              }
            >
              +
            </div>
            <Search />
            <button
              onClick={() => onLayout("TB")}
              className="border p-2 rounded dark:bg-gray-800 bg-gray-100 "
            >
              Realign
            </button>

            <div
              className="dark:bg-gray-800 bg-gray-100 p-1 px-3 rounded leading-none cursor-pointer inline-block leading-0 flex items-center"
              style={{
                color: settings.showSummaries ? "white" : "black",
                background: settings.showSummaries ? "black" : "white",
              }}
              onClick={() =>
                setSettings({
                  ...settings,
                  showSummaries: !settings.showSummaries,
                })
              }
            >
              <p>Summaries</p>
            </div>

            <div
              className="dark:bg-gray-800 bg-gray-100 text-3xl p-1 px-3 pb-2 rounded leading-none cursor-pointer inline-block leading-0"
              style={{
                color: settings.colorNodes ? "white" : "black",
                background: settings.colorNodes ? "black" : "white",
              }}
              onClick={() =>
                setSettings({ ...settings, colorNodes: !settings.colorNodes })
              }
            >
              <Image
                src={ColorSvg}
                height={25}
                width={25}
                className="dark:text-white"
              />
            </div>

            <div
              className="dark:bg-gray-800 bg-gray-100 text-3xl p-1 px-3 pb-2 rounded leading-none cursor-pointer inline-block leading-0"
              onClick={() => download({ nodes, edges })}
            >
              <Image
                src={SaveSvg}
                height={25}
                width={25}
                className="dark:text-white"
              />
            </div>
          </div>
        </Panel>
        <Controls />
        <MiniMap pannable zoomable />

        {/* <Background variant="dots" gap={12} size={1} style={{ opacity: .25}} /> */}
        <Cursors cursors={cursors} />
      </ReactFlow>
      <Saved />
    </div>
  );
}

export default (props) => (
  <ReactFlowProvider>
    <Flow {...props} />
  </ReactFlowProvider>
);
