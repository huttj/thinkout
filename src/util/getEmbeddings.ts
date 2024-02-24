import axios from "axios";

/**
 * 
 * @param {[{ author: string, content: string }]} fullText 
 * @returns 
 */
export default async function getEmbeddings(text: string) {
  const model = localStorage.getItem('model');

  if (localStorage.getItem('ai') === 'ollama') {

    if (!model) {
      throw Error('Model not specified');
    }

    const response = await axios({
      url: "http://localhost:11434/api/embeddings",
      method: "POST",
      data: {
        model,
        prompt: text,
        stream: false,
      },
    });

    return response.data.embedding;
  }

  if (!localStorage.getItem("key")) {
    throw new Error('No API key');
  }

  const messages = [];

  const systemMessage = localStorage.getItem('systemMessage');

  if (systemMessage) {
    messages.push({
      role: 'system',
      content: systemMessage,
    });
  }

  const response = await axios({
    url: "/embeddings",
    method: "POST",
    data: {
      model: model || 'gpt-3.5-turbo',
      key: localStorage.getItem("key"),
      input: text,
    },
  });

  return response.data;
}
