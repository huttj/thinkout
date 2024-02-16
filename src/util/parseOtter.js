export default function parseTranscriptWithEdges(transcript) {
  const entryPattern = /^(.+?)\s+(\d+:\d+)\s*$/;
  let lines = transcript.split('\n');
  let nodes = [];
  let edges = [];
  let previousNodeId = null;

  lines.forEach(line => {
      let match = line.match(entryPattern);
      if (match) {
          if (previousNodeId !== null) {
              // Create an edge from the previous node to the current node
              const currentNodeId = Math.floor(Math.random() * 1000000);
              edges.push({
                  id: `${previousNodeId}-${currentNodeId}`,
                  source: previousNodeId,
                  target: currentNodeId
              });
              previousNodeId = currentNodeId;
          } else {
              previousNodeId = Math.floor(Math.random() * 1000000);
          }

          // Start a new node with the matched author and timestamp
          nodes.push({
              id: previousNodeId,
              data: {
                  author: match[1].trim(),
                  text: '',
                  timestamp: match[2].trim()
              }
          });
      } else if (nodes.length > 0) {
          // Append text to the last node's text
          nodes[nodes.length - 1].data.text += (nodes[nodes.length - 1].data.text ? ' ' : '') + line.trim();
      }
  });

  return {
      nodes,
      edges
  };
}