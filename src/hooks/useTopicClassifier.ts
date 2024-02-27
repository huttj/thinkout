import { docState } from "@/util/data";
import { atom, useRecoilState, useRecoilValue } from "recoil";
import getEmbeddings from "@/util/getEmbeddings";
import { useCallback, useEffect, useState } from "react";
import kMeans from "@/util/kMeans";
import { MemoryVectorStore } from "langchain/vectorstores/memory";

const classifierState = atom({
  key: 'classifier',
  default: {
    classifier: null,
  }
});

export function useClassification(topic: string) {
  const [color, setColor] = useState('#666666');
  const { getColor } = useTopicClassifier();
  useEffect(() => {
    if (topic) {
      getColor(topic)
        .then(setColor)
        .catch(() => setColor('#666666'));
    } else {
      setColor('#666666');
    }
  }, [topic, getColor]);
  return color;
}

export default function useTopicClassifier() {
  const { ydoc } = useRecoilValue(docState);
  const embeddings = ydoc?.getMap("embeddings");
  const [{ classifier }, setClassifier] = useRecoilState<any>(classifierState);

  const loadEmbedding = useCallback(
    async function loadEmbedding(topic: string) {
      const lowerCaseTopic = topic.toLowerCase();
      if (!embeddings?.get(lowerCaseTopic)) {
        const embedding = await getEmbeddings(lowerCaseTopic);
        embeddings?.set(lowerCaseTopic, embedding);
        return embedding;
        // TODO: Cluster
      }
      return embeddings?.get(lowerCaseTopic);
    },
    [ydoc]
  );

  useEffect(() => {
    function updateClassifier() {
      setClassifier({
        classifier: getEmbeddingClassifier([...(embeddings?.values() as any)]),
      });
    }
    updateClassifier();
    embeddings?.observe(updateClassifier);
    return () => embeddings?.unobserve(updateClassifier);
  }, [ydoc]);

  const getColor = useCallback(
    async (topic: string) => {
      const embedding = await loadEmbedding(topic);
      if (classifier) {
        const color = await classifier(embedding);
        return color;
      }
      return "gray";
    },
    [loadEmbedding, classifier]
  );

  return {
    loadEmbedding,
    classifier,
    getColor,
  };
}

// TODO: Pick more colors and dynamically determine cluster size
function cluster(embeddings: number[]) {
  const k = 3; // Number of clusters
  const { centroids, assignments } = kMeans(embeddings, k);
  return centroids;
}

function centroidsToColorStore(centroids: number[][]) {
  const colorStore = new MemoryVectorStore({
    // @ts-ignore
    async embedDocuments(texts: string[]) {},
    // @ts-ignore
    async embedQuery(text: string) {},
  });

  colorStore.addVectors(
    centroids,
    ["red", "blue", "green"].map((color) => ({
      pageContent: color,
      metadata: {
        id: color,
      },
    }))
  );

  return colorStore;
}



function colorSearchToColor(results: any[]) {
  const map = results.reduce((acc, n) => {
    acc[n[0].pageContent] = n[1] * 255;
    return acc;
  }, {});
  return `rgb(${map.red || 0}, ${map.green || 0}, ${map.blue || 0})`;
}

function getEmbeddingClassifier(embeddings: number[]) {
  if (!embeddings?.length) return async () => "gray";
  const centroids = cluster(embeddings);
  const colorStore = centroidsToColorStore(centroids);
  return async (embedding: number[]) =>
    colorSearchToColor(
      await colorStore.similaritySearchVectorWithScore(embedding, 10)
    );
}


// TODO: Add N colors to a list and use Colors.js to interpolate (or get RGB values for each and just do weighted average based on matches)
function euclideanDistance(vec1: number[], vec2: number[]) {
  return Math.sqrt(
    vec1.reduce((acc, val, i) => acc + Math.pow(val - vec2[i], 2), 0)
  );
}

function calculateSumOfSquaredDistances(
  vectors: number[][],
  centroids: number[][],
  assignments: number[],
) {
  let sum = 0;
  vectors.forEach((vec, i) => {
    const centroid = centroids[assignments[i]];
    const distance = euclideanDistance(vec, centroid);
    sum += distance * distance;
  });
  return sum;
}

function findBestK(vectors: number[][], minK: number, maxK: number) {
  const results = [];
  for (let k = minK; k <= maxK; k++) {
    const { centroids, assignments } = kMeans(vectors, k);
    const sumOfSquaredDistances = calculateSumOfSquaredDistances(
      vectors,
      centroids,
      assignments
    );
    results.push({ k, centroids, sumOfSquaredDistances });
  }
  results.sort((a, b) => a.sumOfSquaredDistances - b.sumOfSquaredDistances);
  return results[0];
}

