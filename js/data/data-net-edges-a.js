var E = HS_DATA.network.edges;
E.push(
  { a:"marx", b:"engels", type:"cooperation" },
  { a:"marx", b:"league", type:"found" },
  { a:"engels", b:"league", type:"found" },
  { a:"weil", b:"league", type:"join" },
  { a:"marx", b:"intern1", type:"found" },
  { a:"engels", b:"intern1", type:"join" },
  { a:"proudhon", b:"intern1", type:"join" },
  { a:"bakunin", b:"intern1", type:"join" },
  { a:"marx", b:"proudhon", type:"debate" },
  { a:"marx", b:"bakunin", type:"debate" },
  { a:"lafargue", b:"intern1", type:"join" },
  { a:"pottier", b:"commune", type:"join" },
  { a:"intern1", b:"commune", type:"support" },
  { a:"lassalle", b:"spd", type:"found" },
  { a:"bebel", b:"spd", type:"found" },
  { a:"liebknecht", b:"spd", type:"found" }
);
