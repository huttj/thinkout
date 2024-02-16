import React, { useRef, useState, useEffect } from "react";
import {
  Handle,
  NodeResizeControl,
  useStoreApi,
  useUpdateNodeInternals,
} from "reactflow";
import axios from "axios";
import dagre from "dagre";
import getColorForUser from "@/util/getColorForUser";
import llamaTokenizer from "llama-tokenizer-js";
import useNodeHelpers from "@/util/useNodeHelpers";
import * as rb from "rangeblock";
import askAI from "@/util/askAI";
import toast from "react-hot-toast";
import "reactflow/dist/style.css";

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

export default function TextUpdaterNode({ id, data, selected }) {
  const helpers = useNodeHelpers();
  const {
    data: { text, loading, author },
    width,
    height,
    targetPosition,
    sourcePosition,
  } = helpers.getNode(id);

  const textAreaRef = useRef(null);
  const selection = useSelectionState(textAreaRef);
  const updateNodeInternals = useUpdateNodeInternals();
  const [textHeight, setTextHeight] = useState(height);
  const [focused, setFocused] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (textAreaRef.current) {
      function onFocus() {
        setFocused(true);
      }
      function onBlur() {
        setFocused(false);
      }
      textAreaRef.current.addEventListener("focus", onFocus);
      textAreaRef.current.addEventListener("blur", onBlur);
      return () => {
        if (textAreaRef.current) {
          textAreaRef.current.removeEventListener("focus", onFocus);
          textAreaRef.current.removeEventListener("blur", onBlur);
        }
      };
    }
  }, [textAreaRef, setFocused]);

  // window.store = useStoreApi();

  function onChange(evt) {
    helpers.updateNodeData(id, { text: evt.target.value });
  }

  async function generate() {
    const fullText = helpers.getTextToNode(id, true);

    console.log(fullText);

    const newNode = helpers.addNodeBelow(id, "", {
      loading: true,
      author: "AI",
    });

    // const result = await axios({
    //   url: 'https://api.openai.com/v1/chat/completions',
    //   method: 'POST',
    //   headers: {
    //     Authorization: `Bearer <TOKEN>`,
    //   },
    //   data: {
    //     "model": "gpt-3.5-turbo",
    //     "messages": [
    //       {
    //         "role": "system",
    //         "content": "You are a helpful assistant."
    //       },
    //       ...fullText.map(n => ({ role: n.author === 'AI' ? 'assistant' : n.author, content: n.content })),
    //     ]
    //   }
    // })
    try {
      const response = await askAI(fullText);
      // const response = result.data['choices'][0]['message']['content'];

      helpers.updateNodeData(newNode.id, {
        loading: false,
        text: response.trim(),
        // text: response,
      });
    } catch (e) {
      if (e.message.includes("API Key")) {
        toast(
          "You have to add an OpenAI API key to get AI completions.\n\nClick the + button and the ⚙️ to open the settings.",
          {
            duration: 10000,
          }
        );
      } else {
        toast.error(e.message);
      }
    }
  }

  function copy() {
    copyTextToClipboard(getTextToHere());
  }

  function onKeyDown(e) {
    if (e.metaKey && e.keyCode == 13) {
      generate();
    } else if (e.altKey && e.shiftKey && e.keyCode === 13) {
      // TODO: Should it do something different when a selection is made, vs when the caret is just sitting somewhere?
      // TODO: Also, need to handle auto-focus when adding a new node. It should typically follow the action. For
      //       instance, it should follow the quote, reply, split, and spread. But, there might be other actions that
      //       make sense for it to go somewhere elese. Should think about that and make it intuitive.
      helpers.spreadNode(id, textAreaRef.current.selectionStart);
    } else if (e.altKey && e.keyCode === 13) {
      if (selection) {
        helpers.addNodeBelow(id, selection, {
          author: "user",
        });
      } else {
        helpers.splitNode(id, textAreaRef.current.selectionStart);
      }
    }
  }

  useEffect(() => {
    if (!textAreaRef.current || textHeight === null) return;

    const outerHeight = textAreaRef.current.offsetHeight;
    const extraHeight = height - outerHeight;

    const targetHeight = textAreaRef.current.scrollHeight;

    setTextHeight(Math.min(600, targetHeight + extraHeight));
  }, [height, text, helpers, textAreaRef]);

  useEffect(() => {}, [height]);

  function clearSize() {
    setTextHeight(null);
  }

  // window.helpers = helpers;

  // TODO: Want to make new replies and new quotes, especially when triggered via keyboard, focus on the new textarea
  // useEffect(() => {
  //   setTimeout(() => {
  //     if (textAreaRef) {
  //       textAreaRef.current.focus();
  //     }
  //   }, 10)
  // }, [])

  function focus() {
    setFocused(true);
    setTimeout(() => textAreaRef.current?.focus?.(), 1);
  }

  return (
    <>
      <NodeResizeControl
        style={{
          background: "transparent",
          border: "none",
        }}
        minWidth={600}
        minHeight={200}
        onResize={clearSize}
        onResizeEnd={(_, params) => helpers.updateNode(id, params)}
      >
        <ResizeIcon />
      </NodeResizeControl>
      <Handle type="target" position={targetPosition || "top"} />
      <div
        className={`p-1 pt-4 border border-1 h-full w-full flex flex-col gap-2 rounded`}
        style={{
          border: selected ? "2px solid gray" : "2px solid transparent",
          minHeight: textHeight,
          minWidth: 600,
          background: getColorForUser(author),
        }}
      >
        <div className="flex flex-row justify-between">
          <p className="px-2 pb-2 text-xl font-bold">{author}</p>
          {deleting ? (
            <div className="flex flex-row gap-4 mr-3 cursor-pointer ">
              <div onClick={() => setDeleting(false)}>❌</div>
              <div onClick={() => helpers.deleteNode(id)}>✅</div>
            </div>
          ) : (
            <div
              className="cursor-pointer mr-3"
              onClick={() => setDeleting(true)}
            >
              🗑️
            </div>
          )}
        </div>
        <div className="flex-1 flex flex-col">
          <textarea
            autoFocus
            ref={textAreaRef}
            style={{
              overscrollBehavior: "contain",
              resize: "none",
              // display: focused ? "block" : "none",
            }}
            onKeyDown={onKeyDown}
            id="text"
            name="text"
            onChange={onChange}
            className="nodrag nowheel w-full h-full py-2 px-2 leading-6 rounded flex-1 dark:bg-gray-800"
            value={text}
            placeholder={loading ? "Loading" : "Type here"}
            disabled={loading}
            // rows={Math.max((text.length / 80 + 2) | 0, 10)}
            // cols={80}
          />
          {/* <div className="flex-1 w-full h-full" style={{ display: focused ? "none" : "block", }} onClick={focus}>{text ? text.split('\n').map((line, i) => <p key={i}>{line}</p>) : <em>Empty</em>}</div> */}
        </div>
        <div className="flex flex-row justify-between gap-2 flex-0 items-center">
          <div className="flex-0 flex flex-row gap-2">
            <button
              className="bg-transparent px-2 py-1 border rounded"
              onClick={() =>
                helpers.addNodeBelow(
                  id,
                  selection ? `> ${selection}\n\n` : "",
                  {
                    author: "user",
                  }
                )
              }
            >
              {selection ? "Quote" : "Reply"}
            </button>

            <button
              className="bg-transparent px-2 py-1 border rounded disabled:opacity-50"
              disabled={!text}
              onClick={generate}
            >
              Ask AI
            </button>
          </div>
          {/* Add to a right-click menu or select toolbar */}
          {/* <button onClick={copy}>Copy thread</button>  */}

          <div className="text-sm mr-4 flex-1 text-right">
            <span className="opacity-70">
              {text.length === 0 ? 0 : text.split(" ").length.toLocaleString()}{" "}
              words,{" "}
            </span>
            <span className="opacity-70">
              {llamaTokenizer.encode(text).length.toLocaleString()} tokens
            </span>
          </div>
        </div>
      </div>
      <Handle type="source" position={sourcePosition || "bottom"} />
    </>
  );
}

function ResizeIcon() {
  return (
    <div className="absolute bottom-0 right-0 p-[2px] opacity-25 hover:opacity-50">
      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="stroke-black dark:stroke-white"
      >
        <line
          x1="20.3707"
          y1="5.19702"
          x2="5.03733"
          y2="20.5303"
          stroke="black"
          stroke-width="1.5"
        />
        <line
          x1="20.5303"
          y1="0.53033"
          x2="0.53033"
          y2="20.5303"
          stroke="black"
          stroke-width="1.5"
        />
        <line
          x1="20.4705"
          y1="9.70398"
          x2="9.80379"
          y2="20.3706"
          stroke="black"
          stroke-width="1.5"
        />
        <line
          x1="20.5303"
          y1="14.223"
          x2="14.5303"
          y2="20.223"
          stroke="black"
          stroke-width="1.5"
        />
        <line
          x1="20.5303"
          y1="18.71"
          x2="19.197"
          y2="20.0433"
          stroke="black"
          stroke-width="1.5"
        />
      </svg>
      {/* <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        strokeWidth="3"
        stroke="black"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
        <polyline points="16 20 20 20 20 16" />
        <line x1="14" y1="14" x2="20" y2="20" />
        <polyline points="8 4 4 4 4 8" />
        <line x1="4" y1="4" x2="10" y2="10" />
      </svg> */}
    </div>
  );
}

function fallbackCopyTextToClipboard(text) {
  var textArea = document.createElement("textarea");
  textArea.value = text;

  // Avoid scrolling to bottom
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.position = "fixed";

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    var successful = document.execCommand("copy");
    var msg = successful ? "successful" : "unsuccessful";
    console.log("Fallback: Copying text command was " + msg);
  } catch (err) {
    console.error("Fallback: Oops, unable to copy", err);
  }

  document.body.removeChild(textArea);
}
function copyTextToClipboard(text) {
  if (!navigator.clipboard) {
    fallbackCopyTextToClipboard(text);
    return;
  }
  navigator.clipboard.writeText(text).then(
    function () {
      console.log("Async: Copying to clipboard was successful!");
    },
    function (err) {
      console.error("Async: Could not copy text: ", err);
    }
  );
}

function useSelectionState(elementRef) {
  const initialValue = elementRef.current
    ? elementRef.current.value.slice(
        elementRef.current.selectionStart,
        elementRef.current.selectionEnd
      )
    : "";
  const [selected, setSelected] = useState(initialValue);

  useEffect(() => {
    const textarea = elementRef.current;
    if (!textarea) return;

    // Detect text selection
    textarea.addEventListener("select", updateSelection);

    // Detect text unselection
    textarea.addEventListener("click", updateSelection);
    textarea.addEventListener("keyup", updateSelection);
    textarea.addEventListener("blur", updateSelection);

    // A function to check if text is selected
    function updateSelection(e) {
      setSelected(
        textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)
      );

      // // measure layouts
      // let block = rb.extractSelectedBlock(window, document);
      // console.log(block);
      // console.info("Text layout: " + JSON.stringify(block.dimensions));

      // representation of the text range
      // console.info("Text layout: " + JSON.stringify(block.rangeMeta));

      // recreate range using RangeMeta
      // let meta :RangeMeta = ... ;
      // block = rb.restoreBlock(window, document, meta);
    }

    return () => {
      textarea.removeEventListener("select", updateSelection);
      textarea.removeEventListener("click", updateSelection);
      textarea.removeEventListener("keyup", updateSelection);
      textarea.removeEventListener("blur", updateSelection);
    };
  }, [elementRef]);

  return selected;
}
