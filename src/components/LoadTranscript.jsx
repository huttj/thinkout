import React, { useState } from "react";
import parseTranscriptWithEdges from "@/util/parseOtter";
import toast from "react-hot-toast";

export default function LoadTranscript(props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

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
      <button className={props.className} onClick={() => setTimeout(() => setOpen(true), 1)}>📑</button>
    );
  }

  return (
    <>
      <button className={props.className} onClick={() => setTimeout(() => setOpen(true), 1)}>📑</button>;
      <div className="fixed top-0 bottom-0 left-0 right-0 flex items-center justify-center backdrop-blur">
        <div className="bg-white dark:bg-black p-4 rounded flex flex-col">
          <textarea
            placeholder={`Speaker 1 0:10\nBlah blah\n\nSpeaker 2 1:23\nBlah boop beep`}
            className="w-[50vw] h-[50vw] block mb-4 rounded p-2 px-3 border"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex flex-row gap-4 justify-end">
            <button
              className="text-right self-end border p-1 px-4 rounded"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
              }}
            >
              Cancel
            </button>
            <button
              className="text-right self-end  border border-white p-1 px-4 rounded bg-gray-500 text-white"
              onClick={load}
            >
              Load
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
