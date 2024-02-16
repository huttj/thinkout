import React, {
  useCallback,
  useRef,
  useEffect,
} from "react";
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

import "reactflow/dist/style.css";

const nodeTypes = { textUpdater: TextUpdaterNode };

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// import data from "./data.json";
import Saved from "@/components/Saved";
import { getId, defaultNode, nodeWidth, nodeHeight } from "@/constants";

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

function Flow() {
  const reactFlow = useReactFlow();
  const reactFlowWrapper = useRef(null);
  const connectingNodeId = useRef(null);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const onConnect = useCallback((params) => {
    // reset the start node on connections
    connectingNodeId.current = null;
    setEdges((eds) => addEdge(params, eds));
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
          data: { label: `Node ${id}`, text: "" },
          origin: [0.5, 0.0],
        };

        setNodes((nds) => nds.concat(newNode));
        setEdges((eds) =>
          eds.concat({ id, source: connectingNodeId.current, target: id })
        );
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
      >
        <Panel position="top-right">
          <button onClick={() => onLayout("TB")} className="mr-2 border p-2 rounded">
            Align Vertical
          </button>
          <button onClick={() => onLayout("LR")} className="border border p-2 rounded">Align Horizontal</button>
        </Panel>
        <Controls />
        <MiniMap pannable zoomable />

        <Background variant="dots" gap={12} size={1} />
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