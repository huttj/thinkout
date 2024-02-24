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
import Image from 'next/image';
import SaveSvg from '@/icons/save.svg';

import dagre from "dagre";
import { Toaster, toast } from "react-hot-toast";
import TextUpdaterNode from "@/components/TextNode";

import useCursorStateSynced from "@/hooks/useCursorStateSynced";
import useNodesStateSynced from "@/hooks/useNodesStateSynced";
import useEdgesStateSynced from "@/hooks/useEdgesStateSynced";

import "reactflow/dist/style.css";

const nodeTypes = { textUpdater: TextUpdaterNode };

// import data from "./data.json";
import Saved from "@/components/Saved";
import { getId, defaultNode, nodeWidth, nodeHeight } from "@/constants";
import { docState, userState, vectorStoreState } from "@/util/data";
import { useRecoilValue } from "recoil";
import Cursors from "./Cursors";
import useNodeHelpers from "@/util/useNodeHelpers";
import Search from "./Search";
import promptAI from "@/util/promptAI";
import getEmbeddings from "@/util/getEmbeddings";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import kMeans from "@/util/kMeans";

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

function Flow(props) {
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
  const helpers = useNodeHelpers();
  const { ydoc } = useRecoilValue(docState);

  const vector = useRecoilValue(vectorStoreState);
  // useEffect(() => {
  //   helpers.cleanUpEdges();
  // }, [helpers]);

  async function loadColorEmbeddings() {
    const colorStore = new MemoryVectorStore({
      async embedDocuments(texts) {
        const results = [];
        for (const text of texts) {
          results.push(await getEmbeddings(text));
        }
        return results;
      },
      embedQuery(text) {
        return getEmbeddings(text);
      },
    });

    colorStore.addDocuments(
      ["red", "blue", "green"].map((color) => ({
        pageContent: color,
        metadata: {
          id: color,
        },
      }))
    );

    window.colorStore = colorStore;
  }

  function fakeColorEmbeddings(embeddings) {
    const colorStore = new MemoryVectorStore({
      async embedDocuments(texts) {
        const results = [];
        for (const text of texts) {
          results.push(await getEmbeddings(text));
        }
        return results;
      },
      embedQuery(text) {
        return getEmbeddings(text);
      },
    });

    colorStore.addVectors(
      embeddings,
      ["red", "blue", "green"].map((color, i) => ({
        pageContent: color,
        metadata: {
          id: color,
        },
      }))
    );

    window.colorStore = colorStore;

    return colorStore;
  }

  function colorSearchToColor(results) {
    console.log(results);
    const map = results.reduce((acc, n) => {
      acc[n[0].pageContent] = n[1] * 255;
      return acc;
    }, {});
    return `rgb(${map.red || 0}, ${map.green || 0}, ${map.blue || 0})`;
  }

  window.loadColorEmbeddings = loadColorEmbeddings;

  async function summarizeTopicsByNode() {
    const nodesWithVectors = [];

    for (const node of nodes) {
      if (node.data.topic) {
        if (!window[node.data.topic]) {
          window[node.data.topic] = await getEmbeddings(node.data.topic);
        }
        const embedding = window[node.data.topic];

        nodesWithVectors.push({
          ...node,
          embedding,
        });
      }
    }

    const k = 3; // Number of clusters
    const { centroids, assignments } = kMeans(
      nodesWithVectors.map((n) => n.embedding),
      k
    );

    console.log({
      centroids,
      assignments,
    });

    // window.vector = vector;

    // window.nodesWithVectors = nodesWithVectors;

    // vector.addVectors(
    //   nodesWithVectors.map((n) => n.embedding),
    //   nodesWithVectors.map((n) => ({
    //     pageContent: n.data.text,
    //     metadata: {
    //       id: n.id,
    //       author: n.data.author,
    //       topic: n.data.topic,
    //     },
    //   }))
    // );

    // for (const node of nodesWithVectors) {
    //   const distances = await vector.similaritySearchVectorWithScore(
    //     node.embedding,
    //     1000
    //   );
    //   const averageDistance =
    //     distances.reduce((acc, n) => acc + n[1], 0) / distances.length;
    //   node.averageDistance = averageDistance;
    // }

    // console.log(nodesWithVectors);

    // nodesWithVectors.sort((a, b) => b.averageDistance - a.averageDistance);

    const colors = fakeColorEmbeddings(centroids);

    for (const node of nodesWithVectors) {
      node.color = colorSearchToColor(
        await colors.similaritySearchVectorWithScore(node.embedding, 10)
      );
    }

    ydoc.transact(async () => {
      for (const node of nodesWithVectors) {
        const oldNode = nodesMap.get(node.id);
        nodesMap.set(node.id, {
          ...oldNode,
          data: { ...oldNode.data, color: node.color },
        });
      }
    });

    // vector.addDocuments(nodes.map(n => ({
    //   pageContent: n.data.text,
    //   metadata: {
    //     id: n.id,
    //     author: n.data.author,
    //     authorId: n.data.authorId,
    //   }
    // })));

    // window.vector = vector;

    // const embeddings = await Promise.all(nodes.map(n => getEmbeddings(n.data.text)));
    // console.log(embeddings);
    return;
    const response = await promptAI(
      `
      Please summarize the following list of messages, in order, with short, concise topics,
      in this format:

      \`\`\`
      [
        {
          "id": "<id>",
          "topics": ["<topic 1>", "<topic 2>"]
        }
      ]
      \`\`\`

      Here is the list:
      ${JSON.stringify(
        nodes.map(({ id, data: { text } }) => ({ id, text })),
        null,
        2
      )}

      Remember to respond in valid JSON only.
    `,
      "Respond only in JSON."
    );

    try {
      const parsed = JSON.parse(response);

      parsed.map((n) => ({ ...n }));
    } catch (e) {
      console.log(response);
      throw new Error("Failed to parse JSON from AI response.");
    }
  }

  window.summarizeTopicsByNode = summarizeTopicsByNode;

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
          data: { text: "", author: user.name, authorId: user.id },
          origin: [0.5, 0.0],
        };

        nodesMap.set(newNode.id, newNode);
        edgesMap.set(id, { id, source: connectingNodeId.current, target: id });
      }
    },
    [screenToFlowPosition, nodesMap, edgesMap]
  );

  const onLayout = useCallback(
    (direction) => {
      helpers.cleanUpEdges();

      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(nodes, edges, direction);

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
      // setTimeout(() => fitView(), 1);
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
              onClick={() => helpers.addNode()}
            >
              +
            </div>
            <Search />
            <button
              onClick={() => onLayout("TB")}
              className="border p-2 rounded dark:bg-gray-800 bg-gray-100 "
            >
              Align Vertical
            </button>
            <button
              onClick={() => onLayout("LR")}
              className="border border p-2 rounded dark:bg-gray-800 bg-gray-100 "
            >
              Align Horizontal
            </button>
            <div
              className="dark:bg-gray-800 bg-gray-100 text-3xl p-1 px-3 pb-2 rounded leading-none cursor-pointer inline-block leading-0"
              onClick={() => download({ nodes, edges })}
            >
              <Image src={SaveSvg} height={25} width={25} className="dark:text-white" />
            </div>
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

export default (props) => (
  <ReactFlowProvider>
    <Flow {...props} />
  </ReactFlowProvider>
);
