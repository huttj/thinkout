import axios from "axios";

/**
 * 
 * @param {[{ author: string, content: string }]} fullText 
 * @returns 
 */

function getConfig(agent) {
  const model = localStorage.getItem('model');
  const systemMessage = localStorage.getItem('systemMessage');
  const type = localStorage.getItem('ai');
  const key = localStorage.getItem("key")

  if (!agent) {
    return {
      key,
      model,
      type,
      systemMessage,
    }
  }

  return {
    key,
    model: agent.type === 'default' ? model : agent.model ,
    type: agent.type === 'default' ? type : agent.type,
    systemMessage: agent.systemPrompt,
  };
}

export default async function askAI(fullText, agent) {
  const {model, type, systemMessage, key} = getConfig(agent);

  if (type === 'ollama') {

    if (!model) {
      throw Error('Model not specified');
    }

    const response = await axios({
      url: "http://localhost:11434/api/generate",
      method: "POST",
      data: {
        // model: "mixtral",
        model,
        prompt: fullText.map((n) => `${n.author}: ${n.content}`).join("\n***\n") + "\n***\nAI: ",
        stream: false,
        system: agent?.systemPrompt || localStorage.getItem('systemMessage') || null,
        // system: `
        //   Keep your responses conscise and clear. Avoid overly
        //   general advice like "consult a professional" and
        //   language like "it's important to remember." Be direct
        //   and conversational, like a friend. If you are
        //   respoinding with separate points or ideas, separate
        //   the parts of your responses with "***".
        // `
        //   .replace(/\n/g, "")
        //   .trim(),
      },
    });

    return response.data.response;
  }

  if (!key) {
    throw new Error('No API key');
  }

  const messages = [];


  if (systemMessage) {
    messages.push({
      role: 'system',
      content: systemMessage,
    });
  }

  const response = await axios({
    url: "/ai",
    method: "POST",
    data: {
      type,
      model: model || 'gpt-3.5-turbo',
      key,
      messages: messages.concat(
        fullText.map((t) => ({
          role: t.author === "AI" ? "assistant" : "user",
          content: t.content,
        }))
      ),
    },
  });

  return response.data;
}
