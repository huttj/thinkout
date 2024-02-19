"use client";
import { docState } from "@/util/data";
import React, { useEffect } from "react";
import { RecoilRoot, useRecoilState } from "recoil";
import { WebrtcProvider } from "y-webrtc";
import { IndexeddbPersistence } from "y-indexeddb";
import { Doc } from "yjs";
import Graph from "@/components/Graph";

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
      signaling: [
        "wss://ws.thinkout.app",
      ],
    });
    const persistence = new IndexeddbPersistence(id, ydoc);

    setDoc({
      id,
      provider,
      ydoc,
    });

    return () => {
      setDoc({
        id: null,
        ydoc: null,
        provider: null,
      });

      provider.destroy();
      ydoc.destroy();
      persistence.destroy();
    };
  }, [id, setDoc]);

  if (!ydoc) {
    return <div>Loading...</div>;
  }

  return <Graph />;
}
