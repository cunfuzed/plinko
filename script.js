/*set-up function for game */
const canvas = document.getElementById("backgroundCanvas");
const ctx = canvas.getContext("2d");

const menuCanvas = document.getElementById("menu-canvas");
const menuCtx = menuCanvas.getContext("2d");

const startButton = document.querySelector(".start-button");

const walletAmount = document.getElementById("wallet-amount");
const ticketWalletAmount = document.getElementById("ticket-wallet-amount");

const redchip = new Image();
const ticket = new Image();
redchip.src = "graphics/redchip.png";
ticket.src = "graphics/ticket.png";


// zoom stuff i needed help on
let BOARD_WIDTH = 1280;
let BOARD_HEIGHT = 1200;
let deviceScale = 1;
let fitScale = 1;

//game variables
let gameState = "menu";
let phase = "home";
let menuSpawnTimer = 0;

//fitting canvas
function resizeCanvas() {
  deviceScale = window.devicePixelRatio || 1;
  canvas.width = Math.round(window.innerWidth * deviceScale);
  canvas.height = Math.round(window.innerHeight * deviceScale);
  menuCanvas.width = Math.round(window.innerWidth * deviceScale);
  menuCanvas.height = Math.round(window.innerHeight * deviceScale);
  menuCtx.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
  fitScale = Math.min(
    1,
    (window.innerWidth - 32) / BOARD_WIDTH,
    (window.innerHeight - 32) / BOARD_HEIGHT
  );
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

//distance function
function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

//random function
function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

//plinko chip
let chips = [];
let auto = false;
function chip(x, y, type){
  this.x = x;
  this.y = y;
  this.vx = 0;
  this.vy = 0;
  this.type = type;
  this.hitFrame = 20;
  this.value = 1;
  this.rotationAmount = 0;
}
chip.prototype.draw = function(){
  switch(this.type){
    case "gameChip":
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotationAmount);
      ctx.fillStyle = "#111";
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      if(redchip.complete && redchip.naturalWidth > 0){
        ctx.drawImage(redchip, -10, -10, 20, 20);
      }
      ctx.restore();
    break;
    case "menuChip":
      menuCtx.save();
      menuCtx.translate(this.x, this.y);
      menuCtx.rotate(this.rotationAmount);
      menuCtx.scale(3, 3);
      menuCtx.fillStyle = "#c51f3a";
      menuCtx.beginPath();
      menuCtx.arc(0, 0, 10, 0, Math.PI * 2);
      menuCtx.fill();
      if(redchip.complete && redchip.naturalWidth > 0){
        menuCtx.drawImage(redchip, -10, -10, 20, 20);
      }
      menuCtx.restore();
    break;
    case "ticketChip":
      if(gameState == "menu"){
        menuCtx.save();
        menuCtx.translate(this.x, this.y);
        menuCtx.rotate(this.rotationAmount);
        menuCtx.scale(3, 3);
        menuCtx.fillStyle = "#c51f3a";
        menuCtx.beginPath();
        menuCtx.arc(0, 0, 10, 0, Math.PI * 2);
        menuCtx.fill();
        if(ticket.complete && ticket.naturalWidth > 0){
          menuCtx.drawImage(ticket, -10, -10, 20, 20);
        }
        menuCtx.restore();
      }else{
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotationAmount);
        ctx.scale(3, 3);
        ctx.fillStyle = "#c51f3a";
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        if(ticket.complete && ticket.naturalWidth > 0){
          ctx.drawImage(ticket, -10, -10, 20, 20);
        }
        ctx.restore();
      }
    break;
  }
}
chip.prototype.update = function(){
  this.draw();
  this.x += this.vx;
  this.y += this.vy;

  this.rotationAmount += this.vx * 0.1;

  if(this.type == "menuChip"||this.type == "ticketChip"){
    this.rotationAmount += 0.08 + (random(0, 10))/100;
  }

  this.vy+=0.08;

  if(this.hitFrame < 40){
    this.hitFrame++;
  }

  const removalY = BOARD_HEIGHT+250;
  if(this.y >= removalY){
    chips.splice(chips.indexOf(this), 1);
  }

}

//pegs
let pegs = [];
function peg(x, y){
  this.x = x;
  this.y = y;
}
peg.prototype.draw = function(){
  ctx.beginPath();
  ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
  ctx.fillStyle = "white";
  ctx.fill();
}
peg.prototype.update = function(){
  this.draw();
  for(let i = 0; i < chips.length; i++){
    if(chips[i].type !== "gameChip") continue;
    if(distance(this.x, this.y, chips[i].x, chips[i].y) < 20 && chips[i].hitFrame > 39){
      chips[i].hitFrame = 0;
      let alterAmount = random(-1, 1);
      while(alterAmount == 0){
        alterAmount = random(-1, 1);
      }
      chips[i].vx = alterAmount;
      chips[i].vy = 0;
      chips[i].x = this.x;
      chips[i].y = this.y-20;
    }
  }
}

//multipliers
let chipsAmount = 10;
let tickets = 2;
let multipliers = [];
function multiplier(x, y, multiplier){
  this.x = x;
  this.y = y;
  this.multiplier = multiplier;
}
function chipOverlapsMultiplier(chip, multiplier) {
  const width = 85;
  const height = 30;
  const radius = 10;
  const left = multiplier.x - width / 2;
  const right = multiplier.x + width / 2;
  const top = multiplier.y - height / 2;
  const bottom = multiplier.y + height / 2;
  const closestX = Math.max(left, Math.min(chip.x, right));
  const closestY = Math.max(top, Math.min(chip.y, bottom));
  return distance(chip.x, chip.y, closestX, closestY) <= radius;
}
multiplier.prototype.draw = function(){
  const width = 70;
  const height = 30;
  ctx.fillStyle = "white";
  ctx.fillRect(this.x - width/2, this.y - height/2, width, height);
  ctx.font = "14px Courier New";
  ctx.fillStyle = "black";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(this.multiplier + "x", this.x, this.y);
}
multiplier.prototype.update = function(){
  this.draw();
  for(let i = 0; i < chips.length; i++){
    if(chips[i].type !== "gameChip") continue;
    if(chipOverlapsMultiplier(chips[i], this) && chips[i].hitFrame > 39){
      if(this.multiplier > 1){
        chipsAmount += chips[i].value * this.multiplier;
      }
      if(this.multiplier == 1){
        chipsAmount += chips[i].value;
      }
      console.log(this.multiplier);
      chips[i].hitFrame = 0;
      chips.splice(i, 1);
      i--;
    }
  }
}

//loop
function update(){
  for(let i = 0; i < pegs.length; i++){
    pegs[i].update();
  }
  for(let i = 0; i < chips.length; i++){
    chips[i].update();
  }
  for(let i = 0; i < multipliers.length; i++){
    multipliers[i].update();
  }
}

function updateMenu() {
  if(gameState !== "menu") return;

  menuCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  menuCtx.fillStyle = "#333333";
  menuCtx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  if(random(0,20) == 0){
    chips.push(new chip(random(0, window.innerWidth), -20, "menuChip"));
    if(random(0, 100)==0){
      chips.push(new chip(random(0, window.innerWidth), -20, "ticketChip"));
    }
  }
}

//generate plinko setup
let multiplierValues = [];
function generatePlinko(type){
  pegs = [];
  multipliers = [];
  multiplierValues = [];
  switch(type){
    case "florr" :
      BOARD_HEIGHT = 1200;
      for(let j = 0;j < 16;j++){
        for(let i = 0;i < j+1;i++){
          pegs.push(new peg((BOARD_WIDTH / 2) - (j * 37.5) + (i * 75), 100 + (j * 60)));
        }
      }
      multiplierValues = [1000, 20, 5, 3, 2, 0, 1, 1, 1, 1, 1, 0, 2, 3, 5, 20, 1000];
      for(let i = 0; i < 17; i++){
        const rowWidth = (multiplierValues.length - 1) * 37.5;
        multipliers.push(new multiplier((BOARD_WIDTH / 2) - (rowWidth/2)*2 + i * 37.5 * 2,100 + (16 * 60) +40,multiplierValues[i]));
      }
    break;
    case "basic":
      BOARD_HEIGHT = 500;
      for(let j = 0;j < 6;j++){
        for(let i = 0;i < j+1;i++){
          pegs.push(new peg((BOARD_WIDTH / 2) - (j * 37.5) + (i * 75), 100 + (j * 60)));
        }
      }
      multiplierValues = [10,3,2,0,2,3,10];
      for(let i = 0; i < 7; i++){
        const rowWidth = (multiplierValues.length - 1) * 37.5;
        multipliers.push(new multiplier((BOARD_WIDTH / 2) - (rowWidth/2)*2 + i * 37.5 * 2,100 + (6 * 60) +40,multiplierValues[i]));
      }
    break;
  }
}

for(let i = 0;i<0;i++){chips.push(new chip(BOARD_WIDTH / 2, 50, "gameChip"));}
generatePlinko("basic");

function gameLoop(){
  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;
  const scale = fitScale;
  const boardWidth = BOARD_WIDTH * scale;
  const boardHeight = BOARD_HEIGHT * scale;
  const left = (viewWidth - boardWidth) / 2;
  const top = (viewHeight - boardHeight) / 2;

  ctx.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
  ctx.clearRect(0, 0, viewWidth, viewHeight);
  ctx.fillStyle = "#012039";
  ctx.fillRect(0, 0, viewWidth, viewHeight);

  updateMenu();

  //fitting
  ctx.save();
  ctx.translate(left, top);
  ctx.scale(scale, scale);
  update();
  ctx.restore();

  requestAnimationFrame(gameLoop);
  walletAmount.innerHTML = chipsAmount;
  ticketWalletAmount.innerHTML = tickets;
  
  //loop
  if(random(0,0)==0){
    //for(let i = 0;i<2;i++){chips.push(new chip(BOARD_WIDTH / 2, 50, "gameChip"));}
  }
  if(auto){
    if(chipsAmount>0 && gameState == "game"){
      chipsAmount--;
      chips.push(new chip(BOARD_WIDTH / 2, 50, "gameChip"));
    }
  };

}
gameLoop();

//detect clicks
canvas.addEventListener("click", function(event){
  if(chipsAmount>0){
    chipsAmount--;
    chips.push(new chip(BOARD_WIDTH / 2, 50, "gameChip"));
  }
});

//open shop
document.addEventListener('mousemove', (event) => {
  const x = event.clientX;
  const y = event.clientY;

  if(x > window.innerWidth * 0.8){
    document.querySelector(".shop-container").classList.add("active");
  }else{
    document.querySelector(".shop-container").classList.remove("active");
  }
});

//start game
startButton.addEventListener("click", function(){
  document.querySelector(".menu-screen").classList.add("animate-out");
  menuCanvas.classList.add("animate-out");
  gameState = "home";
  chips = [];
});
