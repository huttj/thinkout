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

let index = 2;

export default function getColorForUser(user) {
  if (!map[user]) {
    map[user] = brightColors[index];
    index++;
  }

  return map[user];
}
