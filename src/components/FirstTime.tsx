import { settingsState } from "@/util/data";
import React, { useState } from "react";
import { useRecoilState } from "recoil";

export default function FirstTime(props: any) {
  const [settings, setSettings] = useRecoilState(settingsState);
  const [hide, setHide] = useState(!!localStorage.getItem('key'));

  if (hide) {
    return;
  }

  function close() {
    setSettings({ ...settings });
    setHide(true);
  }

  function openSettings() {
    setSettings({ ...settings, open: true });
    setHide(true);
  }

  return (
    <div className="fixed top-0 bottom-0 left-0 right-0 flex items-center justify-center backdrop-blur the-backdrop">
      <div className="bg-white dark:bg-black p-4 rounded-lg flex flex-col w-[500px] max-w-[90vw] relative max-h-[90vh] overflow-auto">
        <p
          className="absolute top-0 right-0 m-3 cursor-pointer"
          onClick={close}
        >
          ❌
        </p>

        <h1 className="text-lg mb-4">Hello!</h1>

        <p className="mb-2">Welcome to ThinkOut.</p>
        <p className="mb-2">
          It's a non-linear tool for thought. It works for discussions, too,
          either with real people or AI.
        </p>

        <p className="mb-2">
          To get the most out of it, add an LLM connection in settings. This
          will be used to classify your text and to enable AI responses to what
          you write.
        </p>

        <div className="text-center m-4 mb-8">
          <button className="border p-2 inline-block rounded hover:bg-gray-100" onClick={openSettings}>
            Open settings
          </button>
        </div>

        <p>
          <span className="font-bold">Note:</span> We don't save what you write.
          It stays on your device, unless you share the URL with a friend, in
          which case the data is shared peer-to-peer.
        </p>
      </div>
    </div>
  );
}
