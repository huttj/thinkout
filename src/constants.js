import {v4} from 'uuid';

// Not really used...
export const nodeWidth = 200;
export const nodeHeight = 100;

export const NODE_SPACING_Y = 100;


export const getId = () => v4();


export const defaultNode = {
  id: v4(),
  position: { x: 0, y: 0 },
  width: nodeWidth,
  height: nodeHeight,
  type: "textUpdater",
  data: { text: "", author: "user" },
};

