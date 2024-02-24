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

import dagre from "dagre";
import { Toaster, toast } from "react-hot-toast";
import TextUpdaterNode from "@/components/TextNode";

import useCursorStateSynced from "@/hooks/useCursorStateSynced";
import useNodesStateSynced from "@/hooks/useNodesStateSynced";
import useEdgesStateSynced from "@/hooks/useEdgesStateSynced";

import "reactflow/dist/style.css";

const nodeTypes = { textUpdater: TextUpdaterNode };

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// import data from "./data.json";
import Saved from "@/components/Saved";
import { getId, defaultNode, nodeWidth, nodeHeight } from "@/constants";
import { docState, userState } from "@/util/data";
import { useRecoilValue } from "recoil";
import Cursors from "./Cursors";

// const initialNodes = data.nodes.map((n) => ({
//   ...n,
//   position: { x: 0, y: 0 },
//   width: nodeWidth,
//   height: nodeHeight,
//   type: "textUpdater",
// }));

// const initialEdges = data.edges;

const initialNodes = [defaultNode];
const initialEdges = [];

function getLayoutedElements(nodes, edges, direction = "TB") {
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: node.width || nodeWidth,
      height: node.height || nodeHeight,
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

const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
  initialNodes,
  initialEdges
);

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

function Flow() {
  const user = useRecoilValue(userState);
  const [nodes, setNodes, onNodesChange, nodesMap] = useNodesStateSynced(
    initialNodes.map((n) => ({
      ...n,
      data: { ...n.data, authorId: user.id, author: user.name },
    }))
  );
  const [edges, setEdges, onEdgesChange, edgesMap] =
    useEdgesStateSynced(initialEdges);
  const [cursors, onMouseMove] = useCursorStateSynced();

  const reactFlow = useReactFlow();
  const reactFlowWrapper = useRef(null);
  const connectingNodeId = useRef(null);

  const { screenToFlowPosition, fitView } = useReactFlow();
  const onConnect = useCallback((params) => {
    // reset the start node on connections
    connectingNodeId.current = null;
    edgesMap.add(params.id, params);
  }, []);

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
          data: { text: "", author: user.name, authorId: user.id },
          origin: [0.5, 0.0],
        };

        nodesMap.set(newNode.id, newNode);
        edgesMap.set(id, { id, source: connectingNodeId.current, target: id });
      }
    },
    [screenToFlowPosition]
  );

  const onLayout = useCallback(
    (direction) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(nodes, edges, direction);

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
      // setTimeout(() => fitView(), 1);
    },
    [nodes, edges]
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
      style={{ width: "100vw", height: "100vh" }}
      className="wrapper dark:bg-gray-900"
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
        minZoom={0.001}
        maxZoom={3}
        snapToGrid
        panOnScroll
        panOnScrollSpeed={1.5}
        // selectionOnDrag
        // panOnDrag={[1, 2]}
        // selectionKeyCode={16}
        selectionMode={SelectionMode.Partial}
        onPointerMove={onMouseMove}
      >
        <Panel position="top-right">
          <div className="flex flex-row gap-2">
            <button
              onClick={() => onLayout("TB")}
              className="border p-2 rounded"
            >
              Align Vertical
            </button>
            <button
              onClick={() => onLayout("LR")}
              className="border border p-2 rounded"
            >
              Align Horizontal
            </button>
            <button
              className="border border p-2 rounded"
              onClick={() => download({ nodes, edges })}
            >
              Download
            </button>
          </div>
        </Panel>
        <Controls />
        <MiniMap pannable zoomable />

        <Background variant="dots" gap={12} size={1} />
        <Cursors cursors={cursors} />
      </ReactFlow>
      <Saved />
    </div>
  );
}

export default () => (
  <ReactFlowProvider>
    <Flow />
  </ReactFlowProvider>
);
