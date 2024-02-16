const brightColors = [
  "#00a5e3",
  "#ff5768",
  "#8dd7bf",
  "#ffbf65",
  "#ff96c5",
  "#6c88c4",
  "#c05780",
  // '#',
  // '#',
  // '#',
];

const map = {
  user: brightColors[0],
  ai: brightColors[1],
  AI: brightColors[1],
};

function randomColor() {
  const color = '#' + Math.floor(Math.random()*16777215).toString(16);
  return color.length === 7 ? color : randomColor();
}

let index = 2;

export default function getColorForUser(user) {
  if (!map[user]) {
    map[user] = brightColors[index] || randomColor();
    index++;
  }

  return map[user];
}
