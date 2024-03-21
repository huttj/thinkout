import promptAI from "./promptAI";
import { Tones, Purposes } from "@/util/tonesAndPurposes";

type TextNode = {
  id: string;
  data: {
    authorId: string;
    author: string;
    text: string;
  };
  replyTo?: string[];
};

export default async function getNodeClassification(
  node: TextNode,
  incomers: TextNode[]
): Promise<{
  topic: string;
  tone: string;
  purpose: string;
  summary: string;
  argument: string;
}> {
  const result = await promptAI(
    `
      Can you analyze this message and give me the following as JSON:

      e.g.,
      
      {
        "topic": "1-3 word phrase describing the topic under discussion (use CONTEXT)",
        "tone": "1 word description of the tone, such as: ${Tones.join(", ")}",
        "purpose": "1 word, such as: ${Purposes.join(", ")}",
        "summary": "1 sentence summary of the core idea(s)",
        "argument": "whatever the text is arguing (may be null)",

      }

      NOTE: Avoid repetition between the tone and purpose (e.g., "reflective reflection", "inquisitive inquiry", "conflicted conflict", etc).

      <MESSAGE>

      \`\`\`
      ${JSON.stringify({
        id: node.id,
        author: node.data.author,
        replyTo: node.replyTo,
        text: removeQuotes(node.data.text),
      })}
      \`\`\`

      </MESSAGE>

      <CONTEXT>

      \`\`\`
      ${JSON.stringify(
        incomers.map((n) => ({
          id: n.id,
          author: n.data.author,
          replyTo: n.replyTo,
          text: n.data.text,
        }))
      )}
      \`\`\`

      </CONTEXT>
    `,
    "",
    true
  );

  try {
    const classification = JSON.parse(extractJson(result));
    console.log(classification);
    return classification;
  } catch (e: any) {
    throw new Error(`Failed to summarize: ${e.message}`);
  }
}

function removeQuotes(text: string) {
  return text
    .split("\n")
    .filter((line: string) => line.trim()[0] !== ">")
    .join("\n");
}

function extractJson(str: string) {
  const firstBraceIndex = str.indexOf("{");
  const lastBraceIndex = str.lastIndexOf("}");

  console.log({
    str,
    "str.slice(firstBraceIndex, (lastBraceIndex + 1) || str.length);":
      str.slice(firstBraceIndex, lastBraceIndex + 1 || str.length),
  });

  return str.slice(firstBraceIndex, lastBraceIndex + 1 || str.length);
}
