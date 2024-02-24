import axios from "axios";

// TODO: Figure out how to best enable local LLM via Ollama or others.......
export async function POST(req) {
  
  const body = await req.json();

  const result = await axios({
    url: 'https://api.openai.com/v1/embeddings',
    method: 'POST',
    headers: {
      Authorization: `Bearer ${body.key}`,
    },
    data: {
      model: 'text-embedding-3-small',
      input: body.input,
    },
  });
  
  return Response.json(result.data.data[0].embedding);
}