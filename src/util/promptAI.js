import axios from "axios";

/**
 *
 * @param {string} prompt
 * @returns
 */
export default async function promptAI(prompt, systemMessage='', json=false) {
  const model = localStorage.getItem("model");
  const type = localStorage.getItem("ai");

  if (type === "ollama") {
    if (!model) {
      throw Error("Model not specified");
    }

    const response = await axios({
      url: "http://localhost:11434/api/generate",
      method: "POST",
      data: {
        // model: "mixtral",
        format: json ? 'json' : null,
        model,
        prompt,
        stream: false,
        system: systemMessage,
        // system: localStorage.getItem("systemMessage") || null,
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

  if (!localStorage.getItem("key")) {
    throw new Error("No API key");
  }

  const messages = [];

  if (systemMessage) {
    messages.push({
      role: "system",
      content: systemMessage,
    });
  }

  const response = await axios({
    url: "/ai",
    method: "POST",
    data: {
      type,
      model: model || "gpt-3.5-turbo",
      key: localStorage.getItem("key"),
      messages: messages.concat({
        role: "user",
        content: prompt,
      }),
    },
  });

  return response.data;
}
