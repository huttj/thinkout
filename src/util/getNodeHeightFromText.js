const MINIMUM_HEIGHT = 80;
const MAXIMUM_HEIGHT = 600;

let textarea;

export default function getHeight(text, noMinHeight = false) {
  if (!textarea) {
    textarea = document.createElement("textarea");
    textarea.style.width = "600px";
    textarea.style.visibility = "hidden";
    textarea.style.outline = "none";
    textarea.style.overscrollBehavior = "contain";
    textarea.style.resize = "none";

    "nodrag py-2 px-2 leading-6"
      .split(" ")
      .map((className) => textarea.classList.add(className));

    document.body.appendChild(textarea);
  }

  textarea.value = text;
  const height = textarea.scrollHeight;

  // document.body.removeChild(textarea);

  if (noMinHeight) {
    return Math.min(MAXIMUM_HEIGHT, height);
  }

  return Math.min(MAXIMUM_HEIGHT, Math.max(MINIMUM_HEIGHT, height));
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
