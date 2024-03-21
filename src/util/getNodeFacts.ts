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

export default async function getNodeFacts(
  node: TextNode,
  incomers: TextNode[]
): Promise<{
  topic: string;
  tone: string;
  purpose: string;
  summary: string;
  argument: string;
}> {
  const result = await promptAI(`
    Can you extract the facts, opinions, and arguments from this message and put them into a JSON object?

    IMPORTANT: Make sure to reference the name of the message author (the \`author\` property on the message JSON),
    that is, don't say "the author," but rather, provide the author's actual name.

    e.g.,
    
    {
      "facts": ["facts, including what the author thinks or wants"],
      "opinions": ["opinions that the author holds, or things the author believes"],
      "arguments": ["things that the author is claiming or suggesting, that they may have substantiated but have not proved"]
    }

    Here is the message:

    ${JSON.stringify({
      id: node.id,
      author: node.data.author,
      replyTo: node.replyTo,
      text: removeQuotes(node.data.text),
    })}

  `, '', true);

  try {
    const facts = JSON.parse(extractJson(result));
    console.log(facts);
    return facts;
  } catch (e: any) {
    throw new Error(`Failed to summarize: ${e.message}`);
  }
}


function removeQuotes(text: string) {
  return text.split('\n').filter((line: string) => line.trim()[0] !== '>').join('\n');
}

function extractJson(str: string) {
  const firstBraceIndex = str.indexOf('{');
  const lastBraceIndex = str.lastIndexOf('}');

  console.log({
    str,
    'str.slice(firstBraceIndex, (lastBraceIndex + 1) || str.length);': str.slice(firstBraceIndex, (lastBraceIndex + 1) || str.length),
  })

  return str.slice(firstBraceIndex, (lastBraceIndex + 1) || str.length);
}