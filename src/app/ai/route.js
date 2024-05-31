import axios from "axios";

// TODO: Figure out how to best enable local LLM via Ollama or others.......
export async function POST(req, res) {
  const body = await req.json();
  try {
    if (body.type === "groq") {

      console.log('groq request');
      const result = await axios({
        url: "https://api.groq.com/openai/v1/chat/completions",
        method: "POST",
        headers: {
          Authorization: `Bearer ${body.key}`,
          "Content-Type": "application/json",
        },
        data: {
          // TODO: Make this more intuitive (e.g., allow custom selection from a hard-coded list?)
          model: "mixtral-8x7b-32768",
          messages: body.messages,
        },
      });

      console.log(result);

      return Response.json(result.data.choices[0].message.content);
    }

    const result = await axios({
      url: "https://api.openai.com/v1/chat/completions",
      method: "POST",
      headers: {
        Authorization: `Bearer ${body.key}`,
      },
      data: {
        model: body.model || "gpt-3.5-turbo",
        messages: body.messages,
      },
    });

    return Response.json(result.data.choices[0].message.content);
  } catch (e) {
    const status = e?.response?.status || 500;
    return new Response(
      JSON.stringify({
        error: e?.response?.data?.error?.message || "Unknown Error",
        status,
      }),
      {
        status,
        headers: {
          "content-type": "application/json",
        },
      }
    );
  }
}
