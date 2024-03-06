import React, { useState } from "react";
import Modal from "./Modal";
import makeLocalAtom from "@/util/makeLocalAtom";
import { atom, useRecoilState } from "recoil";
import Input from "./Input";
import { v4 } from "uuid";
import { INSPECT_MAX_BYTES } from "buffer";
import TextArea from "./TextArea";
import Checkbox from "./Checkbox";
import getHeight from "@/util/getNodeHeightFromText";

export type Agent = {
  id: string;
  name: string;
  pictureUrl: string;
  type: "openai" | "ollama";
  model: string;
  systemPrompt: string;
};

export const agentsState = makeLocalAtom<Agent[]>("agents", []);

const showAgentListState = atom({
  key: "showAgentList",
  default: false,
});

export function AgentListButton(props: any) {
  const [, setShowAgentList] = useRecoilState(showAgentListState);
  return (
    <button
      className={props.className}
      onClick={() => setTimeout(() => setShowAgentList(true), 1)}
    >
      🤖
    </button>
  );
}

export default function AgentList(props: any) {
  const [showAgentList, setShowAgentList] = useRecoilState(showAgentListState);
  const [agents, setAgents] = useRecoilState(agentsState);
  const [editing, setEditing] = useState<any>(null);

  function deleteAgent(a: any) {
    setAgents(agents.filter((b: any) => b.id !== a.id));
  }

  if (!showAgentList) {
    return null;
  }

  return (
    <Modal open close={() => setShowAgentList(false)}>
      <h1 className="text-2xl mb-2">Agents</h1>
      <p>
        Agents are personas you can interact with in the graph. You can
        customize your agents' look and prompts.
      </p>

      <hr className="m-4 opacity-25" />

      {!editing && (
        <div>
          <div className="text-right">
            <button
              className="border p-1 px-4 rounded mb-4"
              onClick={() => setEditing({ id: v4() })}
            >
              New Agent
            </button>
          </div>

          <div>
            {agents.map((a: any) => (
              <div className="flex flex-row justify-between items-center">
                <div className="flex flex-row">
                  {a.pictureUrl && (
                    <div
                      className="inline-block mr-2"
                      style={{
                        backgroundImage: `url(${a.pictureUrl})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center center",
                        height: 24,
                        width: 24,
                        borderRadius: 100,
                      }}
                    />
                  )}
                  <p>{a.name}</p>
                </div>
                <div>
                  <button
                    className="border p-1 px-4 rounded mb-4"
                    onClick={() => {
                      confirm(`Really delete ${a.name}?`) && deleteAgent(a);
                    }}
                  >
                    Delete
                  </button>
                  <button
                    className="border p-1 px-4 rounded mb-4 ml-2"
                    onClick={() => setEditing(a)}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editing && (
        <div>
          <EditAgent
            agent={editing}
            save={(updated: any) => {
              console.log(updated);
              setAgents([
                ...agents.filter((a: any) => a.id !== updated.id),
                updated,
              ]);
              setEditing(null);
            }}
            cancel={() => setEditing(null)}
          />
        </div>
      )}
    </Modal>
  );
}

function getCurrentAISetting() {
  const ai = localStorage.getItem("ai");
  switch (ai) {
    case "ollama":
      return "Ollama";

    case "openai":
      return "OpenAI";
    case "groq":
      return "Groq";
    default:
      return "Not set up";
  }
}

function EditAgent(props: any) {
  const [agent, setAgent] = useState(props.agent);

  return (
    <div>
      <PropInput label="Name" prop="name" agent={agent} update={setAgent} />
      <PropInput
        label="Picture URL"
        prop="pictureUrl"
        agent={agent}
        update={setAgent}
      />

      <div className="mb-4">
        <p>Type</p>
        <Checkbox
          label={`Default (${getCurrentAISetting()})`}
          checked={agent.type === "default"}
          className="mr-4"
          onChange={() => setAgent({ ...agent, type: "default" })}
        />
        <Checkbox
          label="Open AI"
          checked={agent.type === "openai"}
          className="mr-4"
          onChange={() => setAgent({ ...agent, type: "openai" })}
          />
        <Checkbox
          label="Groq"
          className="mr-4"
          checked={agent.type === "groq"}
          onChange={() => setAgent({ ...agent, type: "groq" })}
        />
        <Checkbox
          label="Ollama"
          checked={agent.type === "ollama"}
          onChange={() => setAgent({ ...agent, type: "ollama" })}
        />
      </div>

      {agent.type !== "default" && (
        <PropInput label="Model" prop="model" agent={agent} update={setAgent} />
      )}

      <TextArea
        height={getHeight(agent.systemPrompt)}
        label="System Prompt"
        value={agent.systemPrompt}
        onChange={(val: any) => setAgent({ ...agent, systemPrompt: val })}
      />

      <div className="flex flex-row justify-between">
        <button className="border p-1 px-4 rounded" onClick={props.cancel}>
          Cancel
        </button>
        <button
          className="border p-1 px-4 rounded"
          onClick={() => props.save(agent)}
        >
          Save
        </button>
      </div>
    </div>
  );
}

function PropInput(props: any) {
  return (
    <Input
      label={props.label}
      placeholder={props.placeholder}
      value={props.agent[props.prop]}
      onChange={(val: any) =>
        props.update({ ...props.agent, [props.prop]: val })
      }
    />
  );
}
