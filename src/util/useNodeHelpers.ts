import { useMemo } from "react";
import {
  useReactFlow,
  useStoreApi,
  getIncomers,
  useNodesState,
  type Edge,
  type Node,
} from "reactflow";
import { getId } from "@/constants";
import promptAI from "@/util/promptAI";
import { useRecoilValue } from "recoil";
import { docState, userState } from "./data";
import useNodesStateSynced from "@/hooks/useNodesStateSynced";
import useEdgesStateSynced from "@/hooks/useEdgesStateSynced";

export default function useNodeHelpers() {
  const user = useRecoilValue(userState);
  const { ydoc } = useRecoilValue(docState);
  // @ts-ignore
  const nodesMap = ydoc.getMap<Node>("nodes");
  // @ts-ignore
  const edgesMap = ydoc.getMap<Edge>("edges");

  const [nodes, setNodes, onNodesChange] = useNodesStateSynced();
  const [edges, setEdges, onEdgesChange] = useEdgesStateSynced();

  // const { setNodes, setEdges, addNodes, addEdges } = useReactFlow();

  // const store = useStoreApi();

  return useMemo(() => {
    function updateNode(id, params) {
      const node = nodesMap.get(id);
      nodesMap.set(id, { ...node, ...params });
    }

    function deleteNode(id) {
      nodesMap.delete(id);
    }

    function updateNodeData(id, data) {
      const node = nodesMap.get(id);
      updateNode(id, { ...node, data: { ...node?.data, ...data } });
    }

    function getAllTextToNode(id, label, seenNodes = {}) {
      const { nodes, edges } = getNodesAndEdges();
      const thisNode = nodes.find((n) => n.id === id);

      const allIncomers = [];

      let incomer = thisNode;
      for (let i = 0; i < 1000; i++) {
        incomers = getIncomers(incomer, nodes, edges);

        if (incomer) {
          allIncomers.push(incomer);
        } else {
          break;
        }
      }

      const fullText = [
        label
          ? { author: thisNode.data.author, content: thisNode.data.text }
          : thisNode.data.text,
        ...allIncomers.map((n) =>
          label ? { author: n.data.author, content: n.data.text } : n.data.text
        ),
      ].reverse();

      return label ? fullText : fullText.join("\n\n");
    }

    async function updateNodeSummary(id) {
      const summary = await summarizeNode(id);
      updateNodeData(id, { summary });
    }

    async function summarizeNode(id) {
      const { nodes, edges } = getNodesAndEdges();
      const thisNode = nodes.find((n) => n.id === id);
      const incomers = getIncomers(thisNode, nodes, edges);

      if (!incomers.length) {
        return promptAI(`
          Summarize this TEXT with its key points. Sentence fragments are ok.
          Don't give an "explanation." Bullet points only. Terseness preferred.
          Remember to summarize the TEXT clearly.

          <TEXT>
          
          ${thisNode.data.author}: ${thisNode.data.text}
          
          </TEXT>
      `);
      }

      return promptAI(`
      Summarize this TEXT with its key points. Sentence fragments are ok.
      Don't give an "explanation." Combine with the CONTEXT — deduplicate,
      but don't lose info. Bullet points only. Terseness preferred.
      Remember to summarize the TEXT clearly.

      <TEXT>
      
      ${thisNode.data.author}: ${thisNode.data.text}
      
      </TEXT>
      
      <CONTEXT>
      
      ${incomers.map((n, i) => `${i}. ${n.data.summary}`).join("\n\n")}
      
      </CONTEXT>
      `);
    }

    function getTextToNode(id, label) {
      const { nodes, edges } = getNodesAndEdges();
      const thisNode = nodes.find((n) => n.id === id);

      const allIncomers = [];

      let incomer = thisNode;
      for (let i = 0; i < 1000; i++) {
        incomer = getIncomers(incomer, nodes, edges)[0];

        if (incomer) {
          allIncomers.push(incomer);
        } else {
          break;
        }
      }

      const fullText = [
        label
          ? { author: thisNode.data.author, content: thisNode.data.text }
          : thisNode.data.text,
        ...allIncomers.map((n) =>
          label ? { author: n.data.author, content: n.data.text } : n.data.text
        ),
      ].reverse();

      return label ? fullText : fullText.join("\n\n");
    }

    function getNodesAndEdges() {
      return {
        nodes,
        edges,
      };
    }

    function getNodes() {
      return nodes;
    }

    function getNode(id) {
      return nodesMap.get(id);
    }

    function addNodes(node) {
      nodesMap.set(node.id, node);
    }

    function addEdges(edge) {
      edgesMap.set(edge.id, edge);
    }

    function addNodeBelow(
      id: string | string[],
      text = "",
      data = {},
      opts = {}
    ) {
      const newNodeId = getId();
      const thisNode = nodesMap.get(Array.isArray(id) ? id[0] : id);

      const newNode = {
        id: newNodeId,
        position: thisNode
          ? {
              x: thisNode.position.x,
              y: thisNode.position.y + (thisNode.height || 0) + 50,
            }
          : { x: 0, y: 0 },
        type: "textUpdater",
        data: { text, ...data },
        ...opts,
      };

      ydoc?.transact(() => {
        addNodes(newNode);

        const ids = Array.isArray(id) ? id : [id];

        for (const id of ids) {
          const newEdge = {
            id: `${id}-${newNodeId}`,
            source: id,
            target: newNodeId,
          };

          edgesMap.set(newEdge.id, newEdge);
        }
      });
      
      return newNode;
    }

    // Splits node into parent & child
    function splitNode(id: string, char: number) {
      const node = getNode(id);

      if (!node) return null;

      const aText = node.data.text.slice(0, char).trim();
      const bText = node.data.text.slice(char).trim();

      let newNode: any = null;
      ydoc?.transact(() => {
        newNode = addNodeBelow(id, bText, {
          author: node.data.author,
          authorId: node?.data?.authorId,
        });
        updateNodeData(id, { text: aText });
        edges
          .filter((e) => e.source === id)
          .forEach((e) => edgesMap.set(e.id, { ...e, source: newNode.id }));

        const newEdge = {
          id: `${id}-${newNode.id}`,
          source: id,
          target: newNode.id,
        };
        edgesMap.set(newEdge.id, newEdge);
      });

      return newNode;
    }

    // Splits node into two siblings
    function spreadNode(id: string, char: number) {
      const node = nodesMap.get(id);

      if (!node) return;

      const aText = node.data.text.slice(0, char).trim();
      const bText = node.data.text.slice(char).trim();

      let newNode: any = null;
      ydoc?.transact(() => {
        updateNodeData(id, { text: aText });
        const incomers = getIncomers(node, nodes, edges);
        newNode = addNodeBelow(
          incomers?.map((n) => n.id),
          bText,
          {
            author: node.data.author,
            authorId: node.data.authorId,
          }
        );

        for (const edge of edges) {
          if (edge.source === id) {
            edgesMap.set(edge.id, { ...edge, source: newNode.id });
          } else if (edge.target === id) {
            edgesMap.set(edge.id, { ...edge, target: newNode.id });
          }
        }
      });

      return newNode;
    }

    function getDownstreamNodeIds(id: string) {
      const { nodes, edges } = getNodesAndEdges();

      const set = new Set();

      set.add(id);

      for (let i = 0; i < 1000; i++) {
        let added = false;
        edges.forEach((e) => {
          if (set.has(e.source)) {
            set.add(e.target);
            added = true;
          }
        });

        if (!added) {
          break;
        }
      }

      // const nodeMap = store.getState().nodeInternals;

      set.delete(id);

      return set;
    }

    return {
      updateNode,
      updateNodeData,
      getTextToNode,
      getNodesAndEdges,
      getNodes,
      getNode,
      addNodeBelow,
      splitNode,
      spreadNode,
      deleteNode,
      getDownstreamNodeIds,
      summarizeNode,
      updateNodeSummary,
    };
  }, [ydoc, nodes, edges]);
}
