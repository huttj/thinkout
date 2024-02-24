import { EdgeLabelRenderer, useViewport } from "reactflow";
import { type Cursor } from "@/hooks/useCursorStateSynced";

function Cursors({ cursors }: { cursors: Cursor[] }) {
  const viewport = useViewport();

  return (
    <EdgeLabelRenderer>
      {cursors.map(({ id, color, x, y, name }) => {
        const translate = `translate(${x}px, ${y}px)`;
        const scale = `scale(${1 / viewport.zoom})`;

        // return (
        //   <svg
        //     className="cursor"
        //     style={{ transform: `${translate} ${scale}`, zIndex: 100000 }}
        //   >
        //     <g>
        //       <path
        //         className="stroke-black dark:stroke-white"
        //         // stroke="white"
        //         stroke-width="1"
        //         d={cursorPath}
        //         fill={color}
        //         fillRule="evenodd"
        //         clipRule="evenodd"
        //       />
        //     </g>
        //   </svg>
        // );

        return (
          <div
            key={id}
            style={{ transform: `${translate}`, zIndex: 100000, transformOrigin: 'bottom right'}}
            className="relative"
          >
            <div style={{ transform: scale, transformOrigin: '0 0' }}>
              <svg className="cursor">
                <g>
                  <path
                    className="stroke-black dark:stroke-white"
                    // stroke="white"
                    strokeWidth="1"
                    d={cursorPath}
                    fill={color}
                    fillRule="evenodd"
                    clipRule="evenodd"
                  />
                </g>
              </svg>
              <p
                className="bg-red p-[2px] px-2 rounded-full absolute top-0 left-6 leading-0 text-xs border border-black dark:border-white"
                style={{ backgroundColor: color }}
              >
                {name}
              </p>
            </div>
          </div>
        );
      })}
    </EdgeLabelRenderer>
  );
}

// const cursorPath = `
//   M3.29227 0.048984C3.47033 -0.032338 3.67946 -0.00228214 3.8274 0.125891L12.8587
//   7.95026C13.0134 8.08432 13.0708 8.29916 13.0035 8.49251C12.9362 8.68586 12.7578
//   8.81866 12.5533 8.82768L9.21887 8.97474L11.1504 13.2187C11.2648 13.47 11.1538
//   13.7664 10.9026 13.8808L8.75024 14.8613C8.499 14.9758 8.20255 14.8649 8.08802
//   14.6137L6.15339 10.3703L3.86279 12.7855C3.72196 12.934 3.50487 12.9817 3.31479
//   12.9059C3.1247 12.8301 3 12.6461 3 12.4414V0.503792C3 0.308048 3.11422 0.130306
//   3.29227 0.048984ZM4 1.59852V11.1877L5.93799 9.14425C6.05238 9.02363 6.21924 8.96776
//   6.38319 8.99516C6.54715 9.02256 6.68677 9.12965 6.75573 9.2809L8.79056 13.7441L10.0332
//   13.178L8.00195 8.71497C7.93313 8.56376 7.94391 8.38824 8.03072 8.24659C8.11753
//   8.10494 8.26903 8.01566 8.435 8.00834L11.2549 7.88397L4 1.59852z
// `;

const cursorPath = `
  M2.1271 16.8994L1 1.61572C1 0.940573 1.28788 0.839884 1.86094 1.21962C5.24502 3.60784
  10.2414 7.03385 14.1425 9.62217C15.4506 10.4901 15.1084 11.2726 14.1425 11.4977L10.112
  12.323L12.9791 16.8994L9.57969 19L6.68991 14.3111C6.27165 14.7987 5.16897 16.0666
  4.10431 17.237C3.28308 18.1397 2.17327 17.7772 2.1271 16.8994Z
`;

export default Cursors;
