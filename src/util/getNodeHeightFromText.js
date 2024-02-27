const CHARACTERS_PER_LINE = 80;
const MAX_LINE_COUNT = 24;
const LINE_HEIGHT = 30;
const PADDING = 8;
const EXTRA_BUFFER = 20;

const MINIMUM_HEIGHT = 80;

let textarea;

export default function getHeight(text) {
  if (!textarea) {
    textarea = document.createElement("textarea");
    textarea.style.width = "600px";
    textarea.style.visibility = "hidden";

    "nodrag py-2 px-2 leading-6"
      .split(" ")
      .map((className) => textarea.classList.add(className));

    document.body.appendChild(textarea);
  }

  textarea.value = text;
  const height = textarea.scrollHeight;

  // document.body.removeChild(textarea);

  return Math.min(600, Math.max(MINIMUM_HEIGHT, height));
}

// export default function getHeight(text) {
//   const newLines = countNewlines(text || '');
//   const lines = Math.ceil((((text || "").length / CHARACTERS_PER_LINE) || 1) + newLines);
//   const height = LINE_HEIGHT * Math.min(lines, MAX_LINE_COUNT) + (lines > MAX_LINE_COUNT ? EXTRA_BUFFER : 0) + PADDING;

//   return Math.max(height, MINIMUM_HEIGHT);
// }

// function countNewlines(text) {
//   let count = 0;
//   for (let i = 0; i < text.length; i++) {
//     if (text[i] === '\n') {
//       count++;
//     }
//   }
//   return count;
// }
