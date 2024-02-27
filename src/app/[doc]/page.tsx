"use client";
import { docState } from "@/util/data";
import React, { useEffect } from "react";
import { RecoilRoot, useRecoilState } from "recoil";
import { WebrtcProvider } from "y-webrtc";
import { IndexeddbPersistence } from "y-indexeddb";
import { Doc, UndoManager } from "yjs";
import Graph from "@/components/Graph";
import usePreventZoom from "@/hooks/usePreventZoom";
import FirstTime from "@/components/FirstTime";
import Settings from "@/components/Settings";

export default function DocPage(props: any) {
  return (
    <RecoilRoot>
      <Loader {...props} />
    </RecoilRoot>
  );
}

function Loader(props: any) {
  const id = props.params.doc;
  const [{ ydoc, provider }, setDoc] = useRecoilState(docState);

  useEffect(() => {
    const ydoc = new Doc({ guid: id });

    const provider = new WebrtcProvider(`thinkout-${id}`, ydoc, {
      signaling: ["wss://ws.thinkout.app", "ws://localhost:4444"],
    });
    const persistence = new IndexeddbPersistence(id, ydoc);
    // const undo = new UndoManager([ydoc.getMap('nodes'), ydoc.getMap('edges')]);

    // function onKeyDown(e: any) {
    //   if (e.metaKey && e.shiftKey && e.key === 'z') {
    //     console.log('redo');
    //     undo.redo();
    //   } else if (e.metaKey && e.key === 'z') {
    //     console.log('undo');
    //     undo.undo();
    //   }
    // }

    setDoc({
      id,
      provider,
      ydoc,
      // undo,
    });

    // document.addEventListener('keydown', onKeyDown);

    return () => {
      setDoc({
        id: null,
        ydoc: null,
        provider: null,
        // undo: null,
      });

      provider.destroy();
      ydoc.destroy();
      persistence.destroy();
      // undo.destroy();
      // document.removeEventListener('keydown', onKeyDown);
    };
  }, [id, setDoc]);

  usePreventZoom();

  if (!ydoc) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Graph />
      <Settings />
      <FirstTime />
    </>
  );
}
