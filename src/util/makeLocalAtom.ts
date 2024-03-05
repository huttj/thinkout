import { atom } from "recoil";


function getLocalStorage(key: string) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch (e) {
    return null;
  }
}

export default function makeLocalAtom<T>(key: string, defaults?: T) {
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
