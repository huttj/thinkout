import { atom, selector } from "recoil";
import { v4 } from "uuid";
import { Doc, UndoManager } from "yjs";
import { WebrtcProvider } from "y-webrtc";
import generateRandomAnimal from "random-animal-name";
import stringToColor from "./stringToColor";
import { OpenAIEmbeddings } from "@langchain/openai";



export const docState = atom<{
  id: string | null,
  ydoc: Doc | null;
  provider: WebrtcProvider | null;
  // undo: UndoManager | null,
}>({
  key: "doc",
  default: {
    id: null,
    ydoc: null,
    provider: null,
    // undo: null
  },
  dangerouslyAllowMutability: true,
});

const userId = v4();
const animalName = generateRandomAnimal();
const userColor = stringToColor(animalName);

export const userState = makeLocalAtom("user", {
  id: userId,
  name: animalName,
  color: userColor,
});

export const settingsState = makeLocalAtom("settings", {
  open: false,
  llm: "openid",
  apiKey: "",
  systemMessage: "",
  colorNodes: false,
});

export const savedGraphs = makeLocalAtom('savedGraphs', []);

export const searchState = atom({
  key: 'search',
  default: '',
});

import { MemoryVectorStore } from "langchain/vectorstores/memory";
import getEmbeddings from "./getEmbeddings";

const memoryStore = new MemoryVectorStore({
  async embedDocuments(texts: string[]) {
    const results = [];
    for (const text of texts) {
      results.push(await getEmbeddings(text));
    }
    return results;
  },
  embedQuery(text: string) {
    return getEmbeddings(text);
  }
} as any);

export const vectorStoreState = atom({
  key: 'vector',
  dangerouslyAllowMutability: true,
  default: memoryStore,
});

export const searchResultsState = atom({
  key: 'searchResults',
  default: {},
});

function getLocalStorage(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch (e) {
    return null;
  }
}

function makeLocalAtom(key: string, defaults?: any) {
  return atom({
    key,
    default: getLocalStorage(key) || defaults,
    effects: [
      ({ onSet }) => {
        onSet((newValue) => {
          localStorage.setItem(key, JSON.stringify(newValue));
        });
      },
    ],
  });
}
