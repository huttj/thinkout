import { useState } from "react";
import { BaseEdge, getBezierPath, useStore } from "reactflow";

export default function CustomEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
}: any) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  // const nodes = useStore((store) => store.getNodes());
  // const selectedNodes = nodes.filter((n) => n.selected);
  // const [hover, setHover] = useState(false);

  // let hoverText = "";
  // let x = sourceX;
  // let y = sourceY;

  // if (hover) {
  //   if (selectedNodes.find((n) => n.id === source)) {
  //     x = sourceX;
  //     y = sourceY;
  //     hoverText = nodes.find((n) => n.id === target)?.data?.text;
  //   } else if (selectedNodes.find((n) => n.id === target)) {
  //     x = targetX;
  //     y = targetY;
  //     hoverText = nodes.find((n) => n.id === source)?.data?.text;
  //   }

  //   // console.log({
  //   //   sourceId: source,
  //   //   targetId: target,
  //   //   source: nodes.find((n) => n.id === source),
  //   //   target: nodes.find((n) => n.id === target),
  //   //   sourceText: nodes.find((n) => n.id === source)?.data?.text,
  //   //   targetText: nodes.find((n) => n.id === target)?.data?.text,
  //   //   selectedNodes,
  //   //   hoverText,
  //   // });
  //   console.log({ x, y });
  // }

  return (
    <>
      <BaseEdge id={id} path={edgePath} />
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={1}
        strokeWidth={5}
        className="react-flow__edge-interaction hover:stroke-blue-500"
        style={{ zIndex: 9999999 }}
        // onMouseEnter={() => setHover(true)}
        // onMouseOut={() => setHover(false)}
      />
      {/* {hover && <p style={{ transform: `translate(${x}px, ${y}px)` }}>{hoverText}</p>}
      <foreignObject x={x} y={y} width="150" height="200" z={10000}>
        <p className="zIndex-1000">
          {hoverText || "hello"}
        </p>
      </foreignObject> */}
    </>
  );
}
