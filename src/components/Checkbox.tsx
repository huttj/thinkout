import React from "react";


export default function Checkbox(props: any) {
  return (
    <label className={props.className}>
      <input
        type="radio"
        checked={props.checked}
        onChange={(e) => props.onChange(e.target.checked)}
      />{" "}
      {` ${props.label}`}
    </label>
  );
}
