import { atom, selector } from "recoil";
import { v4 } from "uuid";
import { Doc } from "yjs";
import { WebrtcProvider } from "y-webrtc";
import generateRandomAnimal from "random-animal-name";
import stringToColor from "./stringToColor";

export const docState = atom<{
  id: string | null,
  ydoc: Doc | null;
  provider: WebrtcProvider | null;
}>({
  key: "doc",
  default: {
    id: null,
    ydoc: null,
    provider: null,
  },
  dangerouslyAllowMutability: true,
});

const userId = v4();
const animalName = generateRandomAnimal();
const userColor = stringToColor(animalName);

// export const userState = atom({
//   key: "user",
//   default: {
//     id: userId,
//     name: animalName,
//     color: userColor,
//   },
// });

export const userState = makeLocalAtom("user", {
  id: userId,
  name: animalName,
  color: userColor,
});

export const settingsState = makeLocalAtom("settings", {
  llm: "openid",
  apiKey: "",
  systemMessage: "",
});

export const savedGraphs = makeLocalAtom('savedGraphs', []);

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
