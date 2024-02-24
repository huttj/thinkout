import { searchResultsState, searchState, vectorStoreState } from "@/util/data";
import React, { useEffect, useRef } from "react";
import { useRecoilState, useRecoilValue } from "recoil";

export default function Search() {
  const [search, setSearch] = useRecoilState(searchState);
  const vectorStore = useRecoilValue(vectorStoreState);
  const [searchResults, setSearchResults] = useRecoilState(searchResultsState);
  const searching = useRef(false);

  // console.log(searchResults);

  useEffect(() => {
    if (!search) {
      setSearchResults({});
      return;
    }

    if (searching.current) return;

    let timeout = setTimeout(() => {
      searching.current = true;
      vectorStore
        .similaritySearchWithScore(search)
        .then((results) => {
          console.log('Search results', results);

          setSearchResults(
            results.reduce((acc: any, result) => {
              const [
                {
                  metadata: { id },
                },
                score,
              ] = result;
              acc[id] = {
                id,
                score,
              };
              return acc;
            }, {})
          );

          searching.current = false;
        })
        .catch((e) => {
          console.error(e);
          searching.current = false;
        });
    }, 1000);
    return () => clearTimeout(timeout);
  }, [search, searching, vectorStore]);

  useEffect(() => {
    function onKeyDown(e: any) {
      if (e.metaKey && e.key === "f") {
        document.getElementById("search")?.focus?.();
        e.preventDefault();
        e.stopPropagation();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
  return (
    <div className="relative inline-block">
      <input
        id="search"
        className="p-2 rounded text-black border border-gray-800 dark:bg-gray-800 dark:text-white dark:border-white"
        placeholder="Search nodes"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {search && (
        <p
          className="absolute right-2 top-[-2px] cursor-pointer p-3"
          onClick={() => setSearch("")}
        >
          X
        </p>
      )}
    </div>
  );
}
