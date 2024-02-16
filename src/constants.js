import {v4} from 'uuid';

export const nodeWidth = 200;
export const nodeHeight = 100;

export const getId = () => v4();


export const defaultNode = {
  id: getId(),
  position: { x: 0, y: 0 },
  width: nodeWidth,
  height: nodeHeight,
  type: "textUpdater",
  data: { text: "", author: "user" },
};

