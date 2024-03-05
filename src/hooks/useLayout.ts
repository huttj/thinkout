import useEdgesStateSynced from "@/hooks/useEdgesStateSynced";
import useNodesStateSynced from "@/hooks/useNodesStateSynced";
import getNodeHeightFromText from "@/util/getNodeHeightFromText";
import { useCallback } from "react";

// @ts-ignore
import dagre from "dagre";
import { useReactFlow } from "reactflow";
import { NODE_SPACING_Y, nodeHeight, nodeWidth } from "@/constants";

export default function useLayout() {
  const { fitView } = useReactFlow();
  const [nodes, setNodes] = useNodesStateSynced();
  const [edges, setEdges] = useEdgesStateSynced();

  return useCallback(() => {
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges
    );

    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);
    // setTimeout(() => fitView(), 1);

    // // TODO: If one node is focused, focus on them
    // Create hook to get selected nodes........?
    const selected = nodes.filter((n) => n.selected);

    if (selected?.length) {
      setTimeout(() => {
        fitView({
          nodes: selected,
          padding: 0.005,
          maxZoom: 1.25,
          duration: 300,
        });
      }, 1);
    }
  }, [nodes, edges, setNodes, setEdges]);
}

function getLayoutedElements(nodes: any, edges: any, direction = "TB") {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction });

  nodes.forEach((node: any) => {
    dagreGraph.setNode(node.id, {
      width: 600 + 50,
      height: getNodeHeightFromText(node.data.text) + NODE_SPACING_Y,
    });
  });

  edges.forEach((edge: any) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node: any) => {
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
