// script.js
// UI + wiring for solver.js

const boardEl = document.getElementById('board');
const genBtn = document.getElementById('genBtn');
const solveBtn = document.getElementById('solveBtn');
const clearBtn = document.getElementById('clearBtn');
const rowsInput = document.getElementById('rowsInput');
const colsInput = document.getElementById('colsInput');
const algoSelect = document.getElementById('algoSelect');
const speedRange = document.getElementById('speedRange');

let grid = [];
let rows = parseInt(rowsInput.value,10);
let cols = parseInt(colsInput.value,10);
let R=0,C=0;
let cellEls = []; // flattened DOM elements
let stopToken = {stop:false};
let startPos = null;
let endPos = null;

// render grid into board
function renderGrid(g){
  boardEl.innerHTML = '';
  R = g.length; C = g[0].length;
  boardEl.style.gridTemplateColumns = `repeat(${C}, auto)`;
  boardEl.style.width = 'fit-content';
  cellEls = [];
  for(let r=0;r<R;r++){
    for(let c=0;c<C;c++){
      const el = document.createElement('div');
      el.className='cell';
      if(g[r][c] === 1) el.classList.add('wall');
      else el.classList.add('empty');
      el.dataset.r = r; el.dataset.c = c;
      el.addEventListener('click', onCellClick);
      boardEl.appendChild(el);
      cellEls.push(el);
    }
  }
}

// create and generate initial maze
function createMaze(){
  rows = Math.max(10, Math.min(60, parseInt(rowsInput.value,10)||25));
  cols = Math.max(10, Math.min(60, parseInt(colsInput.value,10)||25));
  grid = MazeSolver.generateMaze(rows, cols);
  R = grid.length; C = grid[0].length;
  // auto choose start and end (top-left open cell, bottom-right open cell)
  startPos = findFirstOpen();
  endPos = findLastOpen();
  renderGrid(grid);
  markStartEnd();
  setStatus('Maze generated ('+R+'×'+C+')');
}

function findFirstOpen(){
  for(let r=0;r<R;r++){
    for(let c=0;c<C;c++){
      if(grid[r][c]===0) return [r,c];
    }
  }
  return [1,1];
}
function findLastOpen(){
  for(let r=R-1;r>=0;r--){
    for(let c=C-1;c>=0;c--){
      if(grid[r][c]===0) return [r,c];
    }
  }
  return [R-2,C-2];
}

function markStartEnd(){
  if(!startPos || !endPos) return;
  clearMarks();
  const [sr,sc]=startPos, [er,ec]=endPos;
  const startEl = getCellEl(sr,sc);
  const endEl = getCellEl(er,ec);
  if(startEl) startEl.classList.add('start');
  if(endEl) endEl.classList.add('end');
}

function clearMarks(){
  cellEls.forEach(el=>{
    el.classList.remove('visited','path','start','end');
  });
}

function getCellEl(r,c){
  const idx = r*C + c;
  return cellEls[idx];
}

function setStatus(msg){
  const el = document.querySelector('.panel .muted') || null;
  // small ephemeral status — use console if no element
  console.log(msg);
}

// user can click to set start/end by Shift or Ctrl
function onCellClick(e){
  const r = parseInt(e.currentTarget.dataset.r,10);
  const c = parseInt(e.currentTarget.dataset.c,10);
  if(grid[r][c] === 1) return; // can't set on wall
  if(e.shiftKey){
    // set start
    startPos = [r,c];
    markStartEnd();
    setStatus('Start set');
  } else if(e.ctrlKey || e.metaKey){
    endPos = [r,c];
    markStartEnd();
    setStatus('End set');
  } else {
    // toggle wall / empty for editing
    if(e.currentTarget.classList.contains('wall')){
      e.currentTarget.classList.remove('wall');
      e.currentTarget.classList.add('empty');
      grid[r][c] = 0;
    } else {
      e.currentTarget.classList.remove('empty');
      e.currentTarget.classList.add('wall');
      grid[r][c] = 1;
    }
  }
}

// visualization hooks
async function onVisit(r,c){
  const el = getCellEl(r,c);
  if(!el) return;
  if(!el.classList.contains('start') && !el.classList.contains('end')){
    el.classList.add('visited');
  }
}
async function onPath(r,c){
  const el = getCellEl(r,c);
  if(!el) return;
  el.classList.remove('visited');
  if(!el.classList.contains('start') && !el.classList.contains('end')){
    el.classList.add('path');
  }
}

// stop any running solve
function stopSolve(){
  stopToken.stop = true;
  stopToken = {stop:false};
}

// clear visual marks (visited/path)
clearBtn.addEventListener('click', ()=>{
  stopSolve();
  clearMarks();
  // reapply start/end
  markStartEnd();
  setStatus('Cleared marks');
});

// generate button
genBtn.addEventListener('click', ()=>{
  stopSolve();
  createMaze();
});

// solve button
solveBtn.addEventListener('click', async ()=>{
  stopSolve();
  clearMarks();
  if(!grid || !grid.length) { setStatus('Generate a maze first'); return; }
  const algo = algoSelect.value;
  const delay = Math.max(1, 120 - parseInt(speedRange.value,10)); // convert to ms: higher range = faster -> smaller delay
  const options = {
    onVisit: onVisit,
    onPath: onPath,
    delay: delay,
    stopToken: stopToken
  };
  // ensure start and end inside open cells
  if(!startPos || grid[startPos[0]][startPos[1]]===1) startPos = findFirstOpen();
  if(!endPos || grid[endPos[0]][endPos[1]]===1) endPos = findLastOpen();
  markStartEnd();
  setStatus('Solving with ' + algo.toUpperCase());
  let ok = false;
  if(algo === 'bfs'){
    ok = await MazeSolver.solveBFS(grid, startPos, endPos, options);
  } else if(algo === 'dfs_iter'){
    ok = await MazeSolver.solveDFSIter(grid, startPos, endPos, options);
  } else {
    ok = await MazeSolver.solveBacktrack(grid, startPos, endPos, options);
  }
  if(ok) setStatus('Path found!');
  else setStatus('No path found');
});

// initialize
createMaze();
