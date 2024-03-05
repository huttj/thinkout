import React, { useRef, useState } from "react";
import parseTranscriptWithEdges from "@/util/parseOtter";
import toast from "react-hot-toast";
import { useRecoilState } from "recoil";
import { settingsState, userState } from "@/util/data";

export default function Modal(props: {
  open?: boolean;
  close?: any;
  children?: any;
}) {
  const backdrop = useRef(null);

  if (!props.open) {
    return null;
  }

  return (
    <div
      className="fixed top-0 bottom-0 left-0 right-0 flex items-center justify-center backdrop-blur"
      ref={backdrop}
      onMouseDown={(e) => e.target === backdrop.current && props?.close?.()}
    >
      <div className="bg-white dark:bg-black p-4 rounded-lg flex flex-col w-[500px] max-w-[90vw] relative max-h-[90vh] overflow-auto">
        <p
          className="absolute top-0 right-0 m-3 cursor-pointer"
          onClick={props?.close}
        >
          ❌
        </p>

        {props.children}
      </div>
    </div>
  );
}
