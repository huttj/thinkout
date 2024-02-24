function euclideanDistance(vec1, vec2) {
  return Math.sqrt(vec1.reduce((acc, val, i) => acc + Math.pow(val - vec2[i], 2), 0));
}

function calculateCentroid(cluster, dimensions) {
  const centroid = new Array(dimensions).fill(0);
  cluster.forEach(vec => {
      vec.forEach((val, i) => {
          centroid[i] += val / cluster.length;
      });
  });
  return centroid;
}

export default function kMeans(vectors, k, maxIterations = 100, tolerance = 0.001) {
  const dimensions = vectors[0].length;
  // Initialize centroids by selecting k random vectors from the dataset
  let centroids = vectors.sort(() => 0.5 - Math.random()).slice(0, k);
  let assignments = new Array(vectors.length).fill(-1);
  let clusterSizes = new Array(k).fill(0);
  let isConverged = false;
  let iteration = 0;

  while (!isConverged && iteration < maxIterations) {
      // Assignment step
      isConverged = true;
      vectors.forEach((vec, vecIndex) => {
          let closestCentroid = centroids.reduce((acc, centroid, i) => {
              const distance = euclideanDistance(vec, centroid);
              return distance < acc.distance ? { index: i, distance } : acc;
          }, { index: -1, distance: Infinity });

          if (assignments[vecIndex] !== closestCentroid.index) {
              assignments[vecIndex] = closestCentroid.index;
              isConverged = false;
          }
          clusterSizes[assignments[vecIndex]]++;
      });

      // Update step
      let newCentroids = centroids.map(() => new Array(dimensions).fill(0));
      vectors.forEach((vec, vecIndex) => {
          const centroidIndex = assignments[vecIndex];
          vec.forEach((val, i) => {
              newCentroids[centroidIndex][i] += val;
          });
      });

      centroids = newCentroids.map((centroid, i) => {
          if (clusterSizes[i] === 0) return centroid; // Avoid division by 0
          return centroid.map(val => val / clusterSizes[i]);
      });

      iteration++;
  }

  return { centroids, assignments };
}
