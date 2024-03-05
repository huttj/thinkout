import { useMemo } from "react";
import {
  useReactFlow,
  useStoreApi,
  getIncomers,
  useNodesState,
  type Edge,
  type Node,
  getOutgoers,
} from "reactflow";
import { NODE_SPACING_Y, getId } from "@/constants";
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
    function updateNode(id: string, params: any) {
      const node = nodesMap.get(id);
      if (node) {
        nodesMap.set(id, { ...node, ...params });
      }
    }

    function deleteNode(id: string) {
      nodesMap.delete(id);

      // Remove edges; doesn't happen automatically
      ydoc?.transact(() => {
        // @ts-ignore
        for (const e of edgesMap.values()) {
          if (e.target === id || e.source === id) {
            edgesMap.delete(e.id);
          }
        }
      });
    }

    function cleanUpEdges() {
      console.log("cleaning up edges");
      ydoc?.transact?.(() => {
        // @ts-ignore
        for (const e of edgesMap.values()) {
          if (!nodesMap.has(e.source) || !nodesMap.has(e.target)) {
            edgesMap.delete(e.id);
          }
        }
      });
    }

    function getNodeAndNeighbors(id: string, count=2) {
      const allNodes: any = {};

      let neighbors = [{ ...getNode(id), replyTo: [], }];

      for (let i = 0; i < count; i++) {
        neighbors.forEach((n: any) => { allNodes[n.id] = n });
        neighbors = neighbors.map((n: any) => {
          const incomers = getIncomers(n, nodes, edges).map(n => ({ ...n, replyTo: [] }));
          const outgoers = getOutgoers(n, nodes, edges).map(n => ({ ...n, replyTo: [] }));
          
          incomers.forEach(i => n.replyTo.push(i.id));
          // @ts-ignore
          outgoers.forEach(o => o.replyTo.push(n.id));

          return [...incomers, ...outgoers];
        }).flat();
      }

      return Object.values(allNodes);
    }

    function getNodeAndIncomers(id: string, count=2) {
      const allNodes: any = {};

      let order = 1;
      
      let neighbors: any[] = [{ ...getNode(id), replyTo: [], order, }];
      
      for (let i = 0; i < count; i++) {

        neighbors = neighbors.reduce((acc: any, n: any) => {
          // Trying to deduplicate here; only add unseen nodes, don't fan out neighbors who've been seen before
          if (!allNodes[n.id]) {
            order++;
            allNodes[n.id] = n;
            n.order = order;
            acc.push(n);
          }
          return acc;
        }, []);

        neighbors = neighbors.map((n: any) => {
          const incomers = getIncomers(n, nodes, edges).map(n => ({ ...n, replyTo: [] }));
          
          incomers.forEach(i => n.replyTo.push(i.id));

          return [...incomers];
        }).flat();
      }

      return Object.values(allNodes);
    }

    function updateNodeData(id: string, data: any) {
      const node = nodesMap.get(id);
      if (!id) {
        throw new Error("Node does not exist");
      }
      updateNode(id, { ...node, data: { ...node?.data, ...data } });
    }

    function getAllTextToNode(id: string, label: boolean, seenNodes = {}) {
      const { nodes, edges } = getNodesAndEdges();
      const thisNode = nodes.find((n) => n.id === id);

      const allIncomers = [];

      let incomer = thisNode;
      for (let i = 0; i < 1000; i++) {
        // @ts-ignore
        incomers = getIncomers(incomer, nodes, edges);

        if (incomer) {
          allIncomers.push(incomer);
        } else {
          break;
        }
      }

      const fullText = [
        label
          ? // @ts-ignore
            { author: thisNode.data.author, content: thisNode.data.text }
          : // @ts-ignore
            thisNode.data.text,
        ...allIncomers.map((n) =>
          label ? { author: n.data.author, content: n.data.text } : n.data.text
        ),
      ].reverse();

      return label ? fullText : fullText.join("\n\n");
    }

    async function updateNodeSummary(id: string) {
      const summary = await summarizeNode(id);
      updateNodeData(id, { summary });
    }

    async function summarizeNode(id: string) {
      const { nodes, edges } = getNodesAndEdges();
      const thisNode = nodesMap.get(id);

      if (!thisNode) return;

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

    function getTextToNode(id: string, label: boolean) {
      const { nodes, edges } = getNodesAndEdges();
      const thisNode = nodesMap.get(id);

      if (!thisNode) return;

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

    function getNode(id: string) {
      return nodesMap.get(id);
    }

    function addNodes(node: any) {
      nodesMap.set(node.id, node);
    }

    function addEdges(edge: any) {
      edgesMap.set(edge.id, edge);
    }

    function addNode(text = "", data = {}, opts = {}) {
      const newNodeId = getId();

      const newNode = {
        id: newNodeId,
        position: { x: 0, y: 0 },
        type: "textUpdater",
        data: { text, author: user.name, authorId: user.id, ...data },
        ...opts,
      };

      nodesMap.set(newNodeId, newNode);

      return newNode;
    }

    function addNodeBelow(
      id: string | string[],
      text = "",
      data = {},
      opts = {}
    ) {
      const newNodeId = getId();
      const thisNode = nodesMap.get(Array.isArray(id) ? id[0] : id);

      if (!thisNode) return;

      const newNode = {
        id: newNodeId,
        position: thisNode
          ? {
              x: thisNode.position.x,
              y: thisNode.position.y + (thisNode.height || 0) + NODE_SPACING_Y,
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
      addNode,
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
      cleanUpEdges,
      getNodeAndNeighbors,
      getNodeAndIncomers,
    };
  }, [ydoc, nodes, edges]);
}
