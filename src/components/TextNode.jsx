import React, { useRef, useState, useEffect } from "react";
import {
  Handle,
  useStoreApi,
  useReactFlow,
  useStore,
  updateEdge,
} from "reactflow";
import dagre from "dagre";
import useNodeHelpers from "@/util/useNodeHelpers";
import askAI from "@/util/askAI";
import toast from "react-hot-toast";
import "reactflow/dist/style.css";
import {
  docState,
  searchResultsState,
  searchState,
  settingsState,
  userState,
} from "@/util/data";
import { useRecoilValue } from "recoil";
import stringToColor from "@/util/stringToColor";
import promptAI from "@/util/promptAI";

import Color from "colorjs.io";
import { XYZ_D65, OKLCH } from "colorjs.io/fn";

import getNodeHeightFromText from "@/util/getNodeHeightFromText";
import getNodeClassification from "@/util/getNodeClassification";
import Image from "next/image";
import reloadSvg from "@/icons/reload.svg";
import deleteSvg from "@/icons/delete.svg";
import { PurposeColors, ToneColors } from "@/util/tonesAndPurposes";
import { useClassification } from "@/hooks/useTopicClassifier";

export default function Wrapper(props) {
  const helpers = useNodeHelpers(props.id);
  const node = helpers.getNode(props.id);
  if (!node) {
    return null;
  }
  return <TextUpdaterNode {...props} />;
}

const zoomSelector = (s) => s.transform[2] <= 0.5;

function TextUpdaterNode({ id, data, selected }) {
  const { ydoc } = useRecoilValue(docState);
  const search = useRecoilValue(searchState);
  const user = useRecoilValue(userState);
  const helpers = useNodeHelpers();
  const focusMap = ydoc.getMap("focus");
  const { colorNodes } = useRecoilValue(settingsState);
  const [highlightedBy, setHighlightedBy] = useState(
    Object.keys(focusMap.get(id) || {})
  );
  const { fitView } = useReactFlow();
  // const zoomedOut = useStore(zoomSelector);

  const thisNode = helpers.getNode(id);
  const {
    data: { text = "", loading, author, authorId, color, tone, topic, purpose },
    width,
    height,
    targetPosition,
    sourcePosition,
  } = thisNode;

  const { addSelectedNodes } = useStoreApi().getState();

  function selectThisNode() {
    addSelectedNodes([id]);
  }

  const isAuthor = user.id === authorId;

  const textAreaRef = useRef(null);
  const selection = useSelectionState(textAreaRef);
  const [focused, setFocused] = useState(false);
  const textChanged = useRef(false);
  const [summarizing, setSummarizing] = useState(null);

  useEffect(() => {
    if (textAreaRef.current) {
      function stopPropagation(e) {
        // Is zoom and not just scroll
        if (e.ctrlKey || e.metaKey) return;

        if (selected || focused) {
          e.stopPropagation();
        }
      }

      function onFocus(e) {
        selectThisNode();
        focusOnNode(id);
        setFocused(true);
      }
      function onBlur() {
        setFocused(false);

        // Todo: If text changes
        if (textChanged.current || !text) {
          textChanged.current = false;
          summarize();
        }
      }

      // TODO: Allow drag passthrough, but click edits...

      textAreaRef.current.addEventListener("wheel", stopPropagation, {
        passive: true,
      });
      textAreaRef.current.addEventListener("focus", onFocus);
      textAreaRef.current.addEventListener("blur", onBlur);
      return () => {
        if (textAreaRef.current) {
          textAreaRef.current.removeEventListener("wheel", stopPropagation);
          textAreaRef.current.removeEventListener("focus", onFocus);
          textAreaRef.current.removeEventListener("blur", onBlur);
        }
      };
    }
  }, [
    textAreaRef,
    focused,
    selected,
    setFocused,
    helpers,
    id,
    textChanged,
    selectThisNode,
    text,
  ]);

  // window.store = useStoreApi();

  function onChange(evt) {
    textChanged.current = true;
    helpers.updateNodeData(id, { text: evt.target.value });
  }

  async function generate() {
    // const fullText = helpers.getTextToNode(id, true);
    const NODE_CONTEXT_LIMIT = 5; // TODO: Replace with text length filter

    const fullText = helpers
      .getNodeAndIncomers(id, 10)
      .filter((n, i) => i < NODE_CONTEXT_LIMIT || n.data.summary)
      .map((n, i) => ({
        author: n.data.author,
        content: `ID: ${n.id}; REPLY-TO: ${n.replyTo.join(", ")}; ${
          i > NODE_CONTEXT_LIMIT ? "SUMMARY" : "MESSAGE"
        }: ${i > NODE_CONTEXT_LIMIT ? n.data.summary : n.data.text}`,
      }))
      .reverse();

    const newNode = helpers.addNodeBelow(id, "Loading...", {
      loading: true,
      author: `AI`,
      authorId: user.id,
    });

    textAreaRef?.current?.blur?.();
    addSelectedNodes([]);
    focusOnNode(newNode.id);

    try {
      const RETRY_LIMIT = 3;
      for (let i = 0; i < RETRY_LIMIT; i++) {
        const rawResponse = await askAI(fullText);

        const response = rawResponse.split("; MESSAGE: ").pop();

        // It replied with SUMMARY: once--
        // ID: 7ef409c7-7a79-4e34-a9bd-908847fcb167; REPLY-TO: 91061296-ab09-42d7-bc7f-d2c9596c35cf; SUMMARY: Acknowledgment of the complexities of navigating communication styles in real life situations similar to gameplay scenarios
        if (!response.includes("REPLY-TO:")) {
          helpers.updateNodeData(newNode.id, {
            loading: false,
            text: response.trim(),
            // text: response,
          });
          break;
        } else {
          helpers.updateNodeData(newNode.id, {
            text: `Retrying ${i+1} of ${RETRY_LIMIT}...`,
            // text: response,
          });
        }
        if (i === RETRY_LIMIT) {
          helpers.updateNodeData(newNode.id, {
            text: `ERROR! Response failed. Here's what we got for the last request: \n\n${rawResponse}`,
            // text: response,
          });
        }
      }

      setTimeout(async () => {
        helpers.updateNodeData(newNode.id, { summarizing: true });
        const [node, ...incomers] = helpers.getNodeAndIncomers(newNode.id);
        const summary = await getNodeClassification(node, incomers);
        helpers.updateNodeData(newNode.id, { ...summary, summarizing: false });
      }, 1);

      return newNode;
    } catch (e) {
      if (e.message.includes("API Key")) {
        toast(
          "You have to add an API key to get AI completions.\n\nClick the + button and the ⚙️ to open the settings.",
          {
            duration: 10000,
          }
        );
      } else {
        toast.error(e.message);
      }
    }

    return newNode;
  }

  async function generateNew() {
    const newNode = helpers.addNodeBelow(id, "", {
      loading: true,
      author: `AI (${user.name})`,
      authorId: user.id,
    });

    try {
      const response = await promptAI(
        `
        You're a helpful assistant. This is a conversation already in progress.

      \`\`\`
      ${JSON.stringify(
        helpers.getNodeAndIncomers(id, 5).map((n) => ({
          id: n.id,
          author: n.data.author,
          replyTo: n.replyTo,
          text: n.data.text,
        }))
      )}
      \`\`\`

      Join in on the conversation. Please say something relevant to the conversation.

      `,
        localStorage.getItem("systemMessage") || null
      );

      helpers.updateNodeData(newNode.id, {
        loading: false,
        text: response.trim(),
        // text: response,
      });
    } catch (e) {
      if (e.message.includes("API Key")) {
        toast(
          "You have to add an API key to get AI completions.\n\nClick the + button and the ⚙️ to open the settings.",
          {
            duration: 10000,
          }
        );
      } else {
        toast.error(e.message);
      }
    }
  }

  async function summarize() {
    if (!text) {
      helpers.updateNodeData(id, {
        topic: null,
        tone: null,
        purpose: null,
        summary: null,

        // TODO: Move from local state to node state, completely
        summarizing: true,
      });
      return;
    }

    // const { text } = node.data.text;
    setSummarizing(text);
    const [node, ...incomers] = helpers.getNodeAndIncomers(id);
    try {
      const result = await getNodeClassification(node, incomers);
      if (!summarizing || summarizing === text) {
        helpers.updateNodeData(id, { ...result, summarizing: false });
        setSummarizing(null);

        // TODO: Trigger coloring based on topic
      }
    } catch (e) {
      if (summarizing === text) {
        setSummarizing(null);
      }
      toast.error(e.message);
    }
  }

  function copy() {
    copyTextToClipboard(getTextToHere());
  }

  async function onKeyDown(e) {
    let newNode = null;

    if (e.key === "Escape") {
      textAreaRef?.current?.blur?.();
    } else if (e.metaKey && e.keyCode == 13) {
      textAreaRef?.current?.blur?.();
      generate();
    } else if (e.altKey && e.shiftKey && e.keyCode === 13) {
      // TODO: Should it do something different when a selection is made, vs when the caret is just sitting somewhere?
      // TODO: Also, need to handle auto-focus when adding a new node. It should typically follow the action. For
      //       instance, it should follow the quote, reply, split, and spread. But, there might be other actions that
      //       make sense for it to go somewhere elese. Should think about that and make it intuitive.
      newNode = helpers.spreadNode(id, textAreaRef.current.selectionStart);
    } else if (e.altKey && e.keyCode === 13) {
      if (selection) {
        newNode = helpers.addNodeBelow(id, selection, {
          author: user.name,
          authorId: user.id,
        });
      } else {
        newNode = helpers.splitNode(id, textAreaRef.current.selectionStart);
      }
    }
    newNode && focusOnNode(newNode.id);
  }

  function getNodeColor() {
    if (color) {
      return color;
    }

    if (Object.keys(searchResults).length) {
      if (searchResults[id]) {
        return `rgba(${255 * searchResults[id].score},0,0)`;
      } else {
        return "gray";
      }
    }

    return "";
  }

  function getAuthorColor() {
    if (author.match(/^AI/)) {
      return "grey";
    }
    return stringToColor(author);
  }

  function quote() {
    const newNode = helpers.addNodeBelow(
      id,
      `${selection
        .trim()
        .split("\n")
        .map((n) => `> ${n}`)
        .join("\n")}\n\n`,
      {
        authorId: user.id,
        author: user.name,
      }
    );
    focusOnNode(newNode.id);
  }

  function reply() {
    const newNode = helpers.addNodeBelow(id, "", {
      authorId: user.id,
      author: user.name,
    });
    focusOnNode(newNode.id);
  }

  // useEffect(() => {
  //   if (focused || selected) {
  //     const set = focusMap.get(id) || {};
  //     set[user.name] = true;
  //     focusMap.set(id, set);
  //     setHighlightedBy(Object.keys(set));
  //   } else {
  //     const set = focusMap.get(id) || {};
  //     delete set[user.name];
  //     focusMap.set(id, set);
  //     setHighlightedBy(Object.keys(set));
  //   }

  //   function observer() {
  //     setHighlightedBy(Object.keys(focusMap.get(id) || {}));
  //   }
  //   focusMap.observe(observer);
  //   return () => focusMap.unobserve(observer);
  // }, [focused, selected, focusMap]);
  const searchResults = useRecoilValue(searchResultsState);

  const matchesSearch =
    text.toLowerCase().includes(search.toLowerCase()) || searchResults[id];

  // const highlightedByInitials = highlightedBy.map(name => name.split(/\s+/).map(c => c[0]).join(''));

  function focusOnNode(id) {
    setTimeout(() => {
      const textEl = document.getElementById(`${id}_textarea`);
      textEl.focus();
      textEl.selectionStart = textEl.value.length;
      textEl.selectionEnd = textEl.value.length;
      fitView({
        nodes: [{ id }],
        padding: 0.005,
        maxZoom: 1.25,
        duration: 300,
      });
    }, 100);
  }

  const classificationColor = useClassification(topic);
  const nodeColor =
    colorNodes && topic ? lowerColorfulness(classificationColor, 1.2) : "";

  return (
    <div>
      <div
        className="absolute top-0 left-0 translate-y-[-100%] rounded-full inline-block p-1 px-4"
        style={{
          background: getAuthorColor(),
          color: getTextColor(getAuthorColor()),
        }}
      >
        {author}
      </div>

      <Classification
        className="absolute top-0 right-0 translate-y-[-100%]"
        color={color}
        loading={loading}
        summarizing={summarizing || thisNode.data.summarizing}
        tone={tone}
        topic={topic}
        purpose={purpose}
        selected={selected}
        reload={summarize}
        text={text}
      />

      <div
        className={`mt-3 h-full w-full flex flex-col gap-2 rounded relative border border-1`}
        style={{
          // border: selected ? "2px solid gray" : "2px solid transparent",
          height: getNodeHeightFromText(text),
          width: 600,
        }}
      >
        <Handle type="target" position={targetPosition || "top"} />
        <div className="flex-1 flex flex-col">
          <textarea
            id={`${id}_textarea`}
            ref={textAreaRef}
            style={{
              outline: "none",
              overscrollBehavior: "contain",
              resize: "none",
              background: nodeColor,
              color: colorNodes ? getTextColor(nodeColor) : "",
            }}
            onKeyDown={isAuthor ? onKeyDown : () => {}}
            name="text"
            onChange={isAuthor ? onChange : () => {}}
            className="nodrag w-full h-full py-2 px-2 leading-6 rounded flex-1 dark:bg-gray-800 text-black dark:text-white"
            value={text}
            placeholder={loading ? text || "Loading..." : "Type here"}
            disabled={loading}
          />
        </div>
        <Handle type="source" position={sourcePosition || "bottom"} />
        {selected && authorId === user.id && (
          <div className="absolute right-[-36px] top-0 bottom-0 flex flex-col justify-center">
            <Image
              src={deleteSvg}
              height={24}
              width={24}
              className="cursor-pointer"
              onClick={() => helpers.deleteNode(id)}
            />
          </div>
        )}
      </div>

      {selected && (
        <div className="flex-0 flex flex-row justify-between mt-3">
          <button
            className="bg-gray-600 text-white px-2 py-1 border rounded disabled:opacity-50 hover:bg-gray-500"
            disabled={!text}
            onClick={generate}
          >
            Ask AI
          </button>

          <div className="flex flex-row gap-2">
            {selection && (
              <button
                className="bg-gray-600 text-white px-2 py-1 border rounded hover:bg-gray-500"
                onClick={quote}
              >
                Quote
              </button>
            )}
            <button
              className="bg-gray-600 text-white px-2 py-1 border rounded hover:bg-gray-500"
              onClick={reply}
            >
              Reply
            </button>
          </div>

          {/* <button
              className="bg-transparent px-2 py-1 border rounded disabled:opacity-50"
              disabled={!text || !data.summary}
              onClick={() => toast(data.summary)}
            >
              Show summary
            </button> */}
        </div>
      )}
    </div>
  );
}

function lowerColorfulness(color, multiplier = 1) {
  const c = new Color(color || "gray");
  c.to("oklch");
  c.oklch.c = 0.15 / multiplier;
  return c.toString("hex");
}

function Classification(props) {
  const tone =
    props.loading || props.tone ? (
      <span style={{ color: lowerColorfulness(ToneColors[props.tone]) }}>
        {props.tone}
      </span>
    ) : (
      "\u00A0"
    );
  const purpose =
    props.loading || props.purpose ? (
      <span style={{ color: lowerColorfulness(PurposeColors[props.purpose]) }}>
        {props.purpose}
      </span>
    ) : (
      "\u00A0"
    );

  const toneAndPurpose =
    !props.tone && !props.purpose ? (
      <em className="opacity-50">No tone or purpose</em>
    ) : (
      <>
        {tone} {purpose}
      </>
    );

  let topic = props.summarizing ? (
    "Classifying..."
  ) : !props.topic ? (
    <em className="opacity-50">No topic</em>
  ) : (
    props.topic
  );

  // This is hokey. Maybe I'll do some visual fine-tuning later...
  // if (props.topic && (props.topic.length > 25)) {
  //   for (let i = (props.topic.length / 2) | 0 + 1; i >= 0; i--) {
  //     const char = props.topic[i];
  //     if (char === " ") {
  //       topic = (
  //         <>
  //           <span>{props.topic.slice(0, i)}</span>
  //           <br />
  //           <span>{props.topic.slice(i)}</span>
  //         </>
  //       );
  //       break;
  //     }
  //   }
  // }
  const classificationColor = useClassification(props.topic);
  const topicColor = (props.topic && !props.summarizing)
    ? lowerColorfulness(classificationColor)
    : classificationColor;

  if (props.loading) {
    return null;
  }

  return (
    <div className={`text-right ${props.className || ""}`}>
      <p className="text-gray-400 leading-none mb-1">
        {props.summarizing ? "\u00A0" : toneAndPurpose}
      </p>
      <p
        className="text-gray-600 text-lg leading-none"
        style={{
          // fontWeight: "bold",
          color: props.loading ? "gray" : topicColor,
          maxWidth: 260,
          // textOverflow: "ellipsis",
          // overflow: "hidden",
          // whiteSpace: "nowrap",
        }}
      >
        {topic}
      </p>
      {props.selected && !props.summarizing && props.text && (
        <div className="absolute right-[-36px]  top-0 bottom-0 flex flex-col justify-center">
          <Image
            onClick={props.reload}
            src={reloadSvg}
            height={24}
            width={24}
            className="text-gray-600 hover:text-gray-500  opacity-50 hover:opacity-40 cursor-pointer"
          />
        </div>
      )}
    </div>
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
          strokeWidth="1.5"
        />
        <line
          x1="20.5303"
          y1="0.53033"
          x2="0.53033"
          y2="20.5303"
          stroke="black"
          strokeWidth="1.5"
        />
        <line
          x1="20.4705"
          y1="9.70398"
          x2="9.80379"
          y2="20.3706"
          stroke="black"
          strokeWidth="1.5"
        />
        <line
          x1="20.5303"
          y1="14.223"
          x2="14.5303"
          y2="20.223"
          stroke="black"
          strokeWidth="1.5"
        />
        <line
          x1="20.5303"
          y1="18.71"
          x2="19.197"
          y2="20.0433"
          stroke="black"
          strokeWidth="1.5"
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

function getTextColor(color) {
  const c = new Color(color || "#666666");
  return c.luminance > 0.5 ? "black" : "white";
}

function getTextColorFromHex(hex) {
  var c = hex.substring(1); // strip #
  var rgb = parseInt(c, 16); // convert rrggbb to decimal
  var r = (rgb >> 16) & 0xff; // extract red
  var g = (rgb >> 8) & 0xff; // extract green
  var b = (rgb >> 0) & 0xff; // extract blue

  var luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709

  if (luma < 40) {
    return "black";
  }

  return "white";
}
