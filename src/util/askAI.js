import axios from "axios";

export default async function askAI(fullText) {
  const messages = [];

  const systemMessage = localStorage.getItem('systemMessage');

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
      key: localStorage.getItem("key"),
      messages: messages.concat(
        fullText.map((t) => ({
          role: t.author === "AI" ? "assistant" : "user",
          content: t.content,
        }))
      ),
    },
  });

  return response.data;

  return await axios({
    url: "http://localhost:11434/api/generate",
    method: "POST",
    data: {
      // model: "mixtral",
      model: "starling-lm",
      prompt:
        fullText.map((n) => `${n.author}: ${n.content}`).join("\n***\n") +
        "\n***\nAI: ",
      // prompt: (fullText + '\n\nAI: ').slice(-(5*1000)),
      stream: false,
      system: `
        Keep your responses short, conscise, and clear. Avoid
        overly general advice like "consult a professional"
        and language like "it's important to remember." Be
        direct and conversational, like a friend. Try to avoid
        responding with lists or "tips." Just reply as if you
        were talking.
      `
        .replace(/\n/g, "")
        .trim(),
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
}
