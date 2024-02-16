import { useMemo } from "react";
import { useReactFlow, useStoreApi, getIncomers } from "reactflow";
import { getId } from "@/constants";

export default function useNodeHelpers() {
  const { setNodes, setEdges, addNodes, addEdges } = useReactFlow();

  const store = useStoreApi();

  return useMemo(() => {
    function updateNode(id, params) {
      const nodes = getNodes();
      setNodes(
        nodes.map((node) => {
          if (node.id === id) {
            return {
              ...node,
              ...params,
            };
          }
          return node;
        })
      );
    }

    function deleteNode(id, params) {
      const nodes = getNodes();
      setNodes(nodes.filter((node) => node.id !== id));
    }

    function updateNodeData(id, data) {
      const nodes = getNodes();
      setNodes(
        nodes.map((node) => {
          if (node.id === id) {
            node.data = {
              ...node.data,
              ...data,
            };
          }
          return node;
        })
      );
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
      const state = store.getState();
      return {
        nodes: state.getNodes(),
        edges: state.edges,
      };
    }

    function getNodes() {
      return [...store.getState().nodeInternals.values()];
    }

    function getNode(id) {
      return store.getState().nodeInternals.get(id);
    }

    function addNodeBelow(id, text = "", data = {}, opts = {}) {
      const newNodeId = getId();
      const thisNode = getNode(id);

      const newNode = {
        id: newNodeId,
        position: thisNode
          ? {
              x: thisNode.position.x,
              y: thisNode.position.y + thisNode.height + 50,
            }
          : { x: 0, y: 0 },
        type: "textUpdater",
        data: { text, ...data },
        ...opts,
      };

      addNodes(newNode);

      if (thisNode) {
        const newEdge = {
          id: `${id}-${newNodeId}`,
          source: id,
          target: newNodeId,
        };

        addEdges(newEdge);
      }

      return newNode;
    }

    function splitNode(id, char) {
      const { nodes, edges } = getNodesAndEdges();
      const node = nodes.find((n) => n.id === id);

      const aText = node.data.text.slice(0, char).trim();
      const bText = node.data.text.slice(char).trim();

      updateNodeData(id, { text: aText });

      const newNode = addNodeBelow(id, bText, { author: node.data.author });

      setEdges(
        edges
          .map((e) =>
            e.source === id
              ? {
                  ...e,
                  source: newNode.id,
                }
              : e
          )
          .concat({
            id: `${id}-${newNode.id}`,
            source: id,
            target: newNode.id,
          })
      );
    }

    function spreadNode(id, char) {
      const { nodes, edges } = getNodesAndEdges();
      const node = nodes.find((n) => n.id === id);

      const aText = node.data.text.slice(0, char).trim();
      const bText = node.data.text.slice(char).trim();

      updateNodeData(id, { text: aText });

      const incomers = getIncomers(node, nodes, edges);

      // TODO: Make addNodeBelow support multiple parents
      const newNode = addNodeBelow(incomers?.[0]?.id, bText, {
        author: node.data.author,
      });

      setEdges(
        edges
          .map((e) => {
            if (e.source === id) {
              return [
                e,
                {
                  ...e,
                  source: newNode.id,
                },
              ];
            } else if (e.target === id) {
              return [
                e,
                {
                  ...e,
                  target: newNode.id,
                },
              ];
            }
            return e;
          })
          .flat()
      );
    }

    function getDownstreamNodeIds(id) {
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
    };
  }, [store, setNodes, setEdges, addNodes, addEdges]);
}
