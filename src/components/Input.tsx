import React from "react";

export default function Input(props: any) {

  return (
    <div className="mb-5">
      <label className="block mb-1">{props.label}</label>
      <input
        placeholder={props.placeholder || props.label}
        value={props.value}
        onChange={e => props.onChange(e.target.value)}
        className="border p-2 dark:bg-gray-900 rounded w-full"
      />
    </div>
  );
}
