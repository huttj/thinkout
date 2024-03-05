import promptAI from "./promptAI";
import { Tones, Purposes } from '@/util/tonesAndPurposes';


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
}> {
  const result = await promptAI(`
      Can you analyze this message and give me the following as JSON:
      
      {
        "summary": "1 sentence summary of the core idea(s)",
        "tone": "1 word description of the tone, such as: ${Tones.join(', ')}",
        "purpose": "1 word, such as: ${Purposes.join(', ')}",
        "topic": "1-3 word phrase describing the topic under discussion (use CONTEXT)"
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
    `, '', true);

  try {
    const { tone, topic, purpose, summary } = JSON.parse(result);
    console.log({ tone, topic, purpose, summary });
    return {
      tone,
      topic,
      purpose,
      summary,
    };
  } catch (e: any) {
    throw new Error(`Failed to summarize: ${e.message}`);
  }
}


function removeQuotes(text: string) {
  return text.split('\n').filter((line: string) => line.trim()[0] !== '>').join('\n');
}