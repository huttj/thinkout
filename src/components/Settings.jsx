import React, { useState } from "react";
import parseTranscriptWithEdges from "@/util/parseOtter";
import toast from "react-hot-toast";

function useLocalStorage(key, defaultValue = "") {
  const [value, setValue] = useState(localStorage.getItem(key) || defaultValue);

  function update(newValue) {
    localStorage.setItem(key, newValue);
    setValue(newValue);
  }

  return [value, update];
}

export default function Settings(props) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useLocalStorage("key");
  const [model, setModel] = useLocalStorage("model");
  const [systemMessage, setSystemMessage] = useLocalStorage("systemMessage");
  const [ai, setAi] = useLocalStorage("ai", "openai");

  if (!open) {
    return (
      <button
        className={props.className}
        onClick={() => setTimeout(() => setOpen(true), 1)}
      >
        ⚙️
      </button>
    );
  }

  return (
    <>
      <button
        className={props.className}
        onClick={() => setTimeout(() => setOpen(true), 1)}
      >
        ⚙️
      </button>
      ;
      <div
        className="fixed top-0 bottom-0 left-0 right-0 flex items-center justify-center backdrop-blur the-backdrop"
        onClick={(e) => {
          if (e.target.classList.contains("the-backdrop")) {
            setOpen(false);
          }
        }}
      >
        <div className="bg-white dark:bg-black p-4 rounded-lg flex flex-col w-[500px] max-w-[90vw] relative">
          <p
            className="absolute top-0 right-0 m-3 cursor-pointer"
            onClick={() => setOpen(false)}
          >
            ❌
          </p>

          <h1 className="text-lg mb-4">Settings</h1>

          <p className="mb-1">LLM Selection</p>
          <label>
            <input
              type="radio"
              checked={ai === "openai"}
              onChange={(e) => e.target.checked && setAi("openai")}
            />{" "}
            OpenAI{" "}
          </label>
          {/* <label>
            <input type="radio" disabled /> Claude{" "}
          </label> */}
          <label>
            <input
              type="radio"
              checked={ai === "ollama"}
              onChange={(e) => e.target.checked && setAi("ollama")}
            />{" "}
            Ollama (Local)
          </label>

          {ai !== "ollama" && (
            <div className="mt-4">
              <label className="block mb-1">API Key</label>
              <input
                placeholder="API Key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="border p-2 dark:bg-gray-900 rounded w-full"
              />
            </div>
          )}

          <div className="mt-4">
            <label className="block mb-1">API Key</label>
            <input
              placeholder="Model name (e.g., gpt-3.5-turbo)"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="border p-2 dark:bg-gray-900 rounded w-full"
            />
          </div>

          <div className="mt-4">
            <label className="block mb-1">System message</label>
            <textarea
              placeholder="System message"
              value={systemMessage}
              onChange={(e) => setSystemMessage(e.target.value)}
              className="border rounded p-2 max-h-[50vh] dark:bg-gray-900 w-full"
              rows="5"
            />
          </div>

          <p className="text-gray-800 dark:text-gray-400 mt-4">
            <strong>Note:</strong>{" "}
            <span>
              The key, system message, and your notes are all saved in
              LocalStorage, not on our servers. (We don't have any.)
            </span>
          </p>

          <p className="text-gray-800 dark:text-gray-400 mt-4">Also, to run against Ollama, you'll have to run the following command to start it with CORS enabled: <pre className="mt-2">OLLAMA_ORIGINS=* ollama serve</pre></p>
        </div>
      </div>
    </>
  );
}
