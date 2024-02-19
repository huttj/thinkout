import { useCallback, useEffect, useState } from 'react';
import {
  type Node,
  type OnNodesChange,
  applyNodeChanges,
  getConnectedEdges,
} from 'reactflow';
import { type Map } from 'yjs';
import { useRecoilValue } from 'recoil';
import { docState } from '@/util/data';

// We are using nodesMap as the one source of truth for the nodes.
// This means that we are doing all changes to the nodes in the map object.
// Whenever the map changes, we update the nodes state.


function useNodesStateSynced(initialNodes?: Node[]): [
  Node[],
  React.Dispatch<React.SetStateAction<Node[]>>,
  OnNodesChange,
  Map<Node>
] {
  const { ydoc } = useRecoilValue(docState);
  // @ts-ignore
  const nodesMap = ydoc.getMap<Node>('nodes');
  // @ts-ignore
  const edgesMap = ydoc.getMap<Edge>("edges");

  useEffect(() => {
    if (initialNodes) {
      initialNodes.map(n => nodesMap.set(n.id, n));
    }
  }, []);

  const [nodes, setNodes] = useState<Node[]>(initialNodes || []);

  const setNodesSynced = useCallback(
    (nodesOrUpdater: React.SetStateAction<Node[]>) => {
      const seen = new Set<string>();
      const next =
        typeof nodesOrUpdater === 'function'
          // @ts-ignore
          ? nodesOrUpdater([...nodesMap.values()]) 
          : nodesOrUpdater;
          
          for (const node of next) {
            seen.add(node.id);
            nodesMap.set(node.id, node);
          }
          
      // @ts-ignore
      for (const node of nodesMap.values()) {
        if (!seen.has(node.id)) {
          nodesMap.delete(node.id);
        }
      }
    },
    []
  );

  // The onNodesChange callback updates nodesMap.
  // When the changes are applied to the map, the observer will be triggered and updates the nodes state.
  const onNodesChanges: OnNodesChange = useCallback((changes) => {
    const nodes = Array.from(nodesMap.values());
    const nextNodes = applyNodeChanges(changes, nodes as any);

    for (const change of changes) {
      if (change.type === 'add' || change.type === 'reset') {
        nodesMap.set(change.item.id, change.item);
      } else if (change.type === 'remove' && nodesMap.has(change.id)) {
        const deletedNode = nodesMap.get(change.id)!;
        const connectedEdges = getConnectedEdges(
          [deletedNode],
          // @ts-ignore
          [...edgesMap.values()]
        );

        nodesMap.delete(change.id);

        for (const edge of connectedEdges) {
          edgesMap.delete(edge.id);
        }
      } else {
        nodesMap.set(change.id, nextNodes.find((n) => n.id === change.id)!);
      }
    }
  }, []);

  // here we are observing the nodesMap and updating the nodes state whenever the map changes.
  useEffect(() => {
    const observer = () => {
      setNodes(Array.from(nodesMap.values()));
    };

    setNodes(Array.from(nodesMap.values()));
    nodesMap.observe(observer);

    return () => nodesMap.unobserve(observer);
  }, [setNodes]);

  return [nodes, setNodesSynced, onNodesChanges, nodesMap];
}

export default useNodesStateSynced;
