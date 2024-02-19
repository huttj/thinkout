import stringToColor from "@/util/stringToColor";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useReactFlow } from "reactflow";
import { docState, userState } from "@/util/data";
import { useRecoilValue } from "recoil";

const MAX_IDLE_TIME = 10000;

export type Cursor = {
  id: string;
  color: string;
  x: number;
  y: number;
  timestamp: number;
  name: string;
};

export function useCursorStateSynced() {

  const user = useRecoilValue(userState);
  const { ydoc } = useRecoilValue(docState);

  // @ts-ignore
  const cursorsMap = ydoc.getMap<Cursor>("cursors");
  // @ts-ignore
  const cursorId = user.id;
  // const cursorId = ydoc.clientID.toString();
  const cursorColor = user.color;

  const [cursors, setCursors] = useState<Cursor[]>([]);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    console.log('User update', user);
    const cursor = cursorsMap.get(cursorId);
    cursorsMap.set(cursorId, { ...cursor, ...user } as any);
  }, [user, cursorsMap]);

  // Flush any cursors that have gone stale.
  const flush = useCallback(() => {
    const now = Date.now();

    for (const [id, cursor] of cursorsMap) {
      if (now - cursor.timestamp > MAX_IDLE_TIME) {
        cursorsMap.delete(id);
      }
    }
  }, []);

  const onMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      cursorsMap.set(cursorId, {
        id: cursorId,
        color: cursorColor,
        x: position.x,
        y: position.y,
        timestamp: Date.now(),
        name: user.name,
      });
    },
    [screenToFlowPosition, user]
  );

  useEffect(() => {
    const timer = window.setInterval(flush, MAX_IDLE_TIME);
    const observer = () => {
      setCursors([...cursorsMap.values()]);
    };

    flush();
    setCursors([...cursorsMap.values()]);
    cursorsMap.observe(observer);

    return () => {
      cursorsMap.unobserve(observer);
      window.clearInterval(timer);
    };
  }, [flush]);

  const cursorsWithoutSelf = useMemo(
    () => cursors.filter(({ id }) => id !== cursorId),
    [cursors]
  );

  return [cursorsWithoutSelf, onMouseMove] as const;
}

export default useCursorStateSynced;
