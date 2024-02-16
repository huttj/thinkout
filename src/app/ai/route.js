import axios from "axios";


export async function POST(req) {
  
  const body = await req.json();

  console.log(body);

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

  console.log('result', body);
  
  return Response.json(result.data.choices[0].message.content);
}