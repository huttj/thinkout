import React, { useState } from "react";
import parseTranscriptWithEdges from "@/util/parseOtter";
import toast from "react-hot-toast";

export default function LoadTranscript(props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  function load() {
    try {
      props?.onLoad(parseTranscriptWithEdges(text));
    } catch (e) {
      toast.error(`Failed to parse transcript: ${e.message}`);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setTimeout(() => setOpen(true), 1)}>📑</button>
    );
  }

  return (
    <>
      <button onClick={() => setTimeout(() => setOpen(true), 1)}>📑</button>;
      <div className="fixed top-0 bottom-0 left-0 right-0 flex items-center justify-center backdrop-blur">
        <div className="bg-white dark:bg-black p-4 rounded flex flex-col">
          <textarea
            className="w-[50vw] h-[50vw] block mb-4 rounded p-2 px-3"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex flex-row gap-4 justify-end">
            <button
              className="text-right self-end"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false)
              }}
            >
              Cancel
            </button>
            <button className="text-right self-end" onClick={load}>
              Load
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
