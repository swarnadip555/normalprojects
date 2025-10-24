// solver.js
// Exposes: generateMaze(rows, cols) -> grid
// and solver functions: solveBFS(grid, start, end, options), solveDFSIter(grid, start, end, options), solveBacktrack(grid, start, end, options)
// grid: 2D array of 0 (empty) or 1 (wall)
// options: {onVisit(cell), onPath(path), delay(ms), stopToken}

(function(global){
  // directions utilities
  const DIRS = [
    [0,1],[1,0],[0,-1],[-1,0]
  ];

  function inBounds(r,c, R, C){ return r>=0 && c>=0 && r<R && c<C; }

  // Maze generation: randomized DFS (recursive backtracker) on odd-grid (walls between cells).
  // We will generate a grid with walls and corridors. For simplicity use a grid size where playable cells are rows x cols,
  // but internal representation expands to 2*rows+1 by 2*cols+1 to include walls.
  function generateMaze(rows, cols){
    const R = rows * 2 + 1, C = cols * 2 + 1;
    // create all walls
    const grid = Array.from({length:R}, ()=>Array(C).fill(1));
    // mark cells
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        grid[r*2+1][c*2+1] = 0;
      }
    }
    // visited for cell grid
    const visited = Array.from({length:rows}, ()=>Array(cols).fill(false));
    function carve(cr, cc){
      visited[cr][cc] = true;
      // shuffle directions
      const order = [0,1,2,3].sort(()=>Math.random()-0.5);
      for(const d of order){
        const nr = cr + (d===0?0: d===2?0: d===1?1:-1);
        const nc = cc + (d===1?0: d===3?0: d===0?1:-1);
        // Wait: simpler compute using DIRS
      }
    }
    // Better: use DIRS to compute moves on cell grid
    function carve2(cr, cc){
      visited[cr][cc] = true;
      const dirs = DIRS.map((x,i)=>i).sort(()=>Math.random()-0.5);
      for(const i of dirs){
        const dr = DIRS[i][0], dc = DIRS[i][1];
        const nr = cr + dr, nc = cc + dc;
        if(nr>=0 && nr<rows && nc>=0 && nc<cols && !visited[nr][nc]){
          // remove wall between (cr,cc) and (nr,nc)
          const wr = cr*2+1 + dr;
          const wc = cc*2+1 + dc;
          grid[wr][wc] = 0;
          carve2(nr,nc);
        }
      }
    }
    carve2(0,0);
    // choose start and end cells as opposite corners in representation coordinates
    return grid;
  }

  // BFS solver: returns true if path found, and calls hooks
  async function solveBFS(grid, start, end, options = {}){
    const R = grid.length, C = grid[0].length;
    const onVisit = options.onVisit || (()=>{});
    const onPath = options.onPath || (()=>{});
    const delay = options.delay || 30;
    const stopToken = options.stopToken || {stop:false};

    const q = [];
    const from = Array.from({length:R}, ()=>Array(C).fill(null));
    q.push(start);
    const seen = Array.from({length:R}, ()=>Array(C).fill(false));
    seen[start[0]][start[1]] = true;

    while(q.length){
      if(stopToken.stop) return false;
      const [r,c] = q.shift();
      await onVisit(r,c);
      await sleep(delay);
      if(r===end[0] && c===end[1]) break;
      for(const [dr,dc] of DIRS){
        const nr = r+dr, nc = c+dc;
        if(inBounds(nr,nc,R,C) && !seen[nr][nc] && grid[nr][nc]===0){
          seen[nr][nc] = true;
          from[nr][nc] = [r,c];
          q.push([nr,nc]);
        }
      }
    }
    // reconstruct path
    if(!from[end[0]][end[1]] && !(start[0]===end[0] && start[1]===end[1])) return false;
    const path = [];
    let cur = [end[0], end[1]];
    while(cur){
      path.push(cur);
      const p = from[cur[0]][cur[1]];
      cur = p;
    }
    path.reverse();
    for(const p of path){ await onPath(p[0],p[1]); await sleep(Math.max(10, Math.floor(delay/2))); if(stopToken.stop) return false; }
    return true;
  }

  // DFS iterative (stack)
  async function solveDFSIter(grid, start, end, options = {}){
    const R = grid.length, C = grid[0].length;
    const onVisit = options.onVisit || (()=>{});
    const onPath = options.onPath || (()=>{});
    const delay = options.delay || 20;
    const stopToken = options.stopToken || {stop:false};

    const stack = [];
    const from = Array.from({length:R}, ()=>Array(C).fill(null));
    const seen = Array.from({length:R}, ()=>Array(C).fill(false));
    stack.push(start);
    seen[start[0]][start[1]] = true;

    while(stack.length){
      if(stopToken.stop) return false;
      const [r,c] = stack.pop();
      await onVisit(r,c);
      await sleep(delay);
      if(r===end[0] && c===end[1]) break;
      // push neighbors in random-ish order for interesting paths
      const neigh = DIRS.slice().sort(()=>Math.random()-0.5);
      for(const [dr,dc] of neigh){
        const nr=r+dr, nc=c+dc;
        if(inBounds(nr,nc,R,C) && !seen[nr][nc] && grid[nr][nc]===0){
          seen[nr][nc]=true;
          from[nr][nc]=[r,c];
          stack.push([nr,nc]);
        }
      }
    }
    if(!from[end[0]][end[1]] && !(start[0]===end[0] && start[1]===end[1])) return false;
    // reconstruct
    const path=[];
    let cur=[end[0],end[1]];
    while(cur){
      path.push(cur);
      cur = from[cur[0]][cur[1]];
    }
    path.reverse();
    for(const p of path){ await onPath(p[0],p[1]); await sleep(Math.max(10, Math.floor(delay/2))); if(stopToken.stop) return false; }
    return true;
  }

  // Recursive backtracking solver (DFS-style) that returns first found path.
  async function solveBacktrack(grid, start, end, options = {}){
    const R=grid.length, C=grid[0].length;
    const onVisit = options.onVisit || (()=>{});
    const onPath = options.onPath || (()=>{});
    const delay = options.delay || 20;
    const stopToken = options.stopToken || {stop:false};

    const seen = Array.from({length:R}, ()=>Array(C).fill(false));
    const path = [];

    async function dfs(r,c){
      if(stopToken.stop) return false;
      if(!inBounds(r,c,R,C) || grid[r][c]===1 || seen[r][c]) return false;
      seen[r][c]=true;
      await onVisit(r,c);
      await sleep(delay);
      path.push([r,c]);
      if(r===end[0] && c===end[1]) return true;
      for(const [dr,dc] of DIRS){
        const nr=r+dr, nc=c+dc;
        if(await dfs(nr,nc)) return true;
      }
      // backtrack
      path.pop();
      return false;
    }

    const ok = await dfs(start[0],start[1]);
    if(!ok) return false;
    for(const p of path){ await onPath(p[0],p[1]); await sleep(Math.max(10, Math.floor(delay/2))); if(stopToken.stop) return false; }
    return true;
  }

  // small helper sleep
  function sleep(ms){ return new Promise(res => setTimeout(res, ms)); }

  // Export functions
  global.MazeSolver = {
    generateMaze,
    solveBFS,
    solveDFSIter,
    solveBacktrack,
  };

})(window);
