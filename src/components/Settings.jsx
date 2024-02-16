import React, { useState } from "react";
import parseTranscriptWithEdges from "@/util/parseOtter";
import toast from "react-hot-toast";

function useLocalStorage(key) {
  const [value, setValue] = useState(localStorage.getItem(key) || "");

  function update(newValue) {
    localStorage.setItem(key, newValue);
    setValue(newValue);
  }

  return [value, update];
}

export default function Settings(props) {
  const [open, setOpen] = useState(false);
  const [key, setKey] = useLocalStorage("key");
  const [systemMessage, setSystemMessage] = useLocalStorage("systemMessage");

  function load() {
    try {
      props?.onLoad(parseTranscriptWithEdges(text));
      setOpen(false);
    } catch (e) {
      toast.error(`Failed to parse transcript: ${e.message}`);
    }
  }

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
        <div className="bg-white dark:bg-black p-4 rounded flex flex-col w-[500px] max-w-[90vw] relative">
          <p
            className="absolute top-0 right-0 m-2 mr-3 cursor-pointer"
            onClick={() => setOpen(false)}
          >
            ❌
          </p>

          <h1 className="text-lg mb-4">Settings</h1>

          <p className="mb-1">LLM Selection</p>
          <label>
            <input type="radio" checked /> OpenAI{" "}
          </label>
          <label>
            <input type="radio" disabled /> Claude{" "}
          </label>
          <label>
            <input type="radio" disabled /> Ollama (Local){" "}
          </label>

          <input
            placeholder="API Key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="border p-2 mt-4"
          />

          <textarea
            placeholder="System message"
            value={systemMessage}
            onChange={(e) => setSystemMessage(e.target.value)}
            className="border rounded my-4 p-2 max-h-[50vh]"
            rows="5"
          />

          <p className="text-gray-800">
            <strong>Note:</strong>{" "}
            <span>
              This key and your notes are all saved on LocalStorage, not on our
              servers. (We don't have any.)
            </span>
          </p>
        </div>
      </div>
    </>
  );
}
