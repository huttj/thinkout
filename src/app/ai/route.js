import axios from "axios";

// TODO: Figure out how to best enable local LLM via Ollama or others.......
export async function POST(req) {
  
  const body = await req.json();

  const result = await axios({
    url: 'https://api.openai.com/v1/chat/completions',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${body.key}`,
    },
    data: {
      model: 'gpt-3.5-turbo',
      messages: body.messages,
    },
  });
  
  return Response.json(result.data.choices[0].message.content);
}