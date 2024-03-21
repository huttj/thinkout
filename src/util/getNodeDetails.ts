import getNodeClassification from "./getNodeClassification";
import getNodeFacts from "./getNodeFacts";

export default async function getNodeDetails(...props: any) {
  const [classification, facts] = await Promise.all([
    getNodeClassification.apply(null, props).catch((_) => ({})),
    getNodeFacts.apply(null, props).catch((_) => ({})),
  ]);
  return { ...classification, ...facts };
}
