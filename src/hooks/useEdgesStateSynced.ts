import { docState } from "@/util/data";
import { useCallback, useEffect, useState } from "react";
import { type Edge, type OnEdgesChange, applyEdgeChanges } from "reactflow";
import { useRecoilValue } from "recoil";
import { type Map } from 'yjs';

// Please see the comments in useNodesStateSynced.ts.
// This is the same thing but for edges.

function useEdgesStateSynced(): [
  Edge[],
  React.Dispatch<React.SetStateAction<Edge[]>>,
  OnEdgesChange,
  Map<Edge>
] {
  const { ydoc } = useRecoilValue(docState);
  
  // @ts-ignore
  const edgesMap = ydoc.getMap<Edge>("edges");

  const [edges, setEdges] = useState<Edge[]>([]);

  const setEdgesSynced = useCallback(
    (edgesOrUpdater: React.SetStateAction<Edge[]>) => {
      const next =
        typeof edgesOrUpdater === "function"
          // @ts-ignore
          ? edgesOrUpdater([...edgesMap.values()])
          : edgesOrUpdater;

      const seen = new Set<string>();

      for (const edge of next) {
        seen.add(edge.id);
        edgesMap.set(edge.id, edge);
      }

      // @ts-ignore
      for (const edge of edgesMap.values()) {
        if (!seen.has(edge.id)) {
          edgesMap.delete(edge.id);
        }
      }
    },
    []
  );

  const onEdgesChange: OnEdgesChange = useCallback((changes) => {
    const edges = Array.from(edgesMap.values());
    const nextEdges = applyEdgeChanges(changes, edges as any);

    for (const change of changes) {
      if (change.type === "add" || change.type === "reset") {
        edgesMap.set(change.item.id, change.item);
      } else if (change.type === "remove" && edgesMap.has(change.id)) {
        edgesMap.delete(change.id);
      } else {
        edgesMap.set(change.id, nextEdges.find((n) => n.id === change.id)!);
      }
    }
  }, []);

  useEffect(() => {
    const observer = () => {
      setEdges(Array.from(edgesMap.values()));
    };

    setEdges(Array.from(edgesMap.values()));
    edgesMap.observe(observer);

    return () => edgesMap.unobserve(observer);
  }, [setEdges]);

  return [edges, setEdgesSynced, onEdgesChange, edgesMap];
}

export default useEdgesStateSynced;
