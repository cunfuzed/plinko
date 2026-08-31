/*set-up function for game */
const canvas = document.getElementById("backgroundCanvas");
const ctx = canvas.getContext("2d");

const menuCanvas = document.getElementById("menu-canvas");
const menuCtx = menuCanvas.getContext("2d");

const startButton = document.querySelector(".start-button");

const walletAmount = document.getElementById("wallet-amount");
const ticketWalletAmount = document.getElementById("ticket-wallet-amount");

const shopContainer = document.querySelector(".shop-container");

const displayRoundStats = document.querySelector(".display-round-stats")

const payOffDebtButton = document.querySelector(".pay-off-debt");

const shopArrow = document.querySelector(".shop-arrow");

const redchip = new Image();
const ticket = new Image();
const logo = new Image();
redchip.src = "graphics/redchip.png";
ticket.src = "graphics/ticket.png";
logo.src = "graphics/gambler's-symbol.png";


// zoom stuff i needed help on
let BOARD_WIDTH = 1280;
let BOARD_HEIGHT = 1200;
let deviceScale = 1;
let fitScale = 1;
let logoScale = 2;

//game variables
let gameState = "menu";
let phase = "home";
let lives = 10;
let roundNumber = 0;
let debtToBePaid = 15;
let debts = [15, 40, 60, 100, 150, 300, 500, 1000, 2500];
let allMultiplierValues = [[5,3,1,0,1,3,5],[10,5,3,1,0,1,3,5,10],[50,10,5,0,2,0,2,0,5,10,50],[50,10,5,3,0,1,1,1,0,3,5,10,50],[50,10,5,3,2,1,1,0,1,1,2,3,5,10,50]];
let roundsLeft = 3;
let badPegs = 3;
let menuSpawnTimer = 0;

//modifiers
let maxRoundsLeft = 3;
let maxLives = 10;
let maxBadPegs = 3;
let profitMultiplier = 1;
let debtMultiplier = 1;

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
  this.destination = "random";
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
let landingChances = [-1,-1,-1,-1,-1,1,1,1,1,1,-1,-1,-1,-1,-1,1,1,1,1,1];
function peg(x, y){
  this.x = x;
  this.y = y;
  this.isBad = false;
}
peg.prototype.draw = function(){
  ctx.beginPath();
  ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
  ctx.fillStyle = "white";
  if(this.isBad){ctx.fillStyle = "red";}
  ctx.fill();
}
peg.prototype.update = function(){
  this.draw();
  for(let i = 0; i < chips.length; i++){
    if(chips[i].type !== "gameChip") continue;
    if(distance(this.x, this.y, chips[i].x, chips[i].y) < 20 && chips[i].hitFrame > 39){
      onChipBounce(chips[i],this);
      chips[i].hitFrame = 0;
      let alterAmount = 0;
      if(chips[i].destination == "random"){
        alterAmount = landingChances[random(0, landingChances.length-1)];
        chips[i].vx = alterAmount;
        chips[i].vy = 0;
        chips[i].x = this.x;
        chips[i].y = this.y-20;
        if(this.isBad){
          if(gameState == "game"){
            lives--;
          }
          rerollBadPegs();
        }
      }
      if(chips[i].destination == "jackpot"){
        alterAmount = 1;
        chips[i].vx = alterAmount;
        chips[i].vy = 0;
        chips[i].x = this.x;
        chips[i].y = this.y-20;
      }
    }
  }
}

//multipliers
let chipsAmount = 10;
let tickets = 3;
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
        chipsAmount += Math.floor(chips[i].value * this.multiplier * profitMultiplier);
      }
      if(this.multiplier == 1){
        chipsAmount += Math.floor(chips[i].value * profitMultiplier);
        rerollBadPegs();
      }
      console.log(this.multiplier);
      chips[i].hitFrame = 0;
      onChipLanding(chips[i], this);
      chips.splice(i, 1);
      i--;
    }
  }
}

//triggers for trinkets
function onChipLanding(landedChip, multiplier){
  if(trinkets.includes("evasive-chip") && multiplier.multiplier == 0){
    if(random(0, 5) == 0){
      chips.push(new chip(BOARD_WIDTH / 2, 50, "gameChip"));
      console.log("evaded");
    }
  }
}
function onTrinketBought(trinket){
  if(trinket == "tilt-screen-left"){
    landingChances.push(-1);
  }
  if(trinket == "tilt-screen-right"){
    landingChances.push(1);
  }
  if(trinket == "greed"){
    profitMultiplier += 0.3;
    maxLives -= 4;
    lives -= 4;
  }
  if(trinket == "blood-supplement"){
    maxLives += 5;
    lives += 5;
  }
}
function onChipDropped(){
  if(trinkets.includes("one-trick-pony")){
    chips[chips.length-1].destination = "jackpot";
    trinkets.splice(trinkets.indexOf("one-trick-pony"), 1);
  }
}
function onChipBounce(bouncedChip,landedPeg){
  if(trinkets.includes("tainted-chip")){
    if(landedPeg.isBad){
      bouncedChip.value *= 1.5;
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
    if(random(0, 500)==0){
      chips.push(new chip(random(0, window.innerWidth), -20, "ticketChip"));
    }
  }
}

//reroll bad pegs
function rerollBadPegs(){
  for(let j = 0; j < pegs.length; j++){
    pegs[j].isBad = false;
  }
  for(let j = 0; j < badPegs; j++){
    let randomPeg = random(0, pegs.length-1);
    while(pegs[randomPeg].isBad){
      randomPeg = random(0, pegs.length-1);
    }
    pegs[randomPeg].isBad = true;
  }
}

//rounds
function advanceDebtRound(){
  roundNumber++;
  tickets += (roundsLeft * 2) + roundNumber;
  roundsLeft = maxRoundsLeft;
  debtToBePaid = debts[roundNumber];
  payOffDebtButton.innerHTML = `Pay off debt (${debtToBePaid})<img src="graphics/redchip.png" alt="chip(s)">`;
  lives = maxLives;
  pegs = [];
  multipliers = [];
  generatePlinko("basic");
  generateTrinkets();
  badPegs += 1 * (Math.min(roundNumber/2));
  rerollBadPegs();
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
      BOARD_HEIGHT = 500 + (200 * roundNumber);
      for(let j = 0;j < 6 + (2 * roundNumber);j++){
        for(let i = 0;i < j+1;i++){
          pegs.push(new peg((BOARD_WIDTH / 2) - (j * 37.5) + (i * 75), 100 + (j * 60)));
        }
      }
      multiplierValues = allMultiplierValues[roundNumber];
      for(let i = 0; i < allMultiplierValues[roundNumber].length; i++){
        const rowWidth = (multiplierValues.length - 1) * 37.5;
        multipliers.push(new multiplier((BOARD_WIDTH / 2) - (rowWidth/2)*2 + i * 37.5 * 2,100 + ( (6 + (2 * roundNumber) ) * 60) +40,multiplierValues[i]));
      }
    break;
  }
}

//generate trinkets
let trinkets = [];
let trinketTypes = {
  "one-trick-pony":{
    "title": "One Trick Pony",
    "description": "Generates a chip with the special attribute of \"jackpot\" next game, discards itself afterwards",
    "flavortext": "gold gold gold gold gold gold GOLD GOLD GOLD GOOOOOLDDDD",
    "image": "graphics/one-trick-pony.png",
    "price": 3,
  },
  "tilt-screen-left":{
    "title": "Tilt Screen Left",
    "description": "Increases chances for chip to fall left",
    "flavortext": "Tilting the board is proven to work, so why shouldn't it work on a computer?",
    "image": "graphics/tilt-left.png",
    "price": 1
  },
  "tilt-screen-right":{
    "title": "Tilt Screen Right",
    "description": "Increases chances for chip to fall right",
    "flavortext": "h(t)=h\u2080 - 4.9gt\u00b2 - SliverNickel",
    "image": "graphics/tilt-right.png",
    "price": 1
  },
  "evasive-chip":{
    "title": "Evasive Chip",
    "description": "Upon a chip landing in a 0x, will have a 20% to reroll chip",
    "flavortext": "\"A net loss? Unacceptable!\"",
    "image": "graphics/evasive-chip.png",
    "price": 2
  },
  "greed":{
    "title": "Greed",
    "description": "You will start each round with 4 less health, but rewards multiplier is increased by 0.3",
    "flavortext": "\"A heartless solution to an impending problem\"",
    "image": "graphics/greed.png",
    "price": 3
  },
  "blood-supplement":{
    "title": "Blood Supplement",
    "description": "You start each round with 5 points more health",
    "flavortext": "\"A fresh batch of O- blood!\"",
    "image": "graphics/blood-supplement.png",
    "price": 4
  },
  "tainted-chip":{
    "title": "Tainted Chip",
    "description": "Chips which land on a bad peg will have 1.5x the value",
    "flavortext": "Compensation prize",
    "image": "graphics/tainted-chip.png",
    "price": 3
  }
}
let hiddenTrinkets = {
  "tilt-all":{
    "title": "Tilt All",
    "description": "Increases chances for chip to fall away from the center",
    "flavortext": "Hmmm... I wonder what happens if I tilt the board to the left AND the right?",
    "image": "graphics/tilt-all.png",
    "price": 2,
  }
}

let trinketsOnDisplay = [];
function generateTrinkets() {
  shopContainer.innerHTML = "";
  trinketsOnDisplay = [];

  const keys = Object.keys(trinketTypes);
  const selectableKeys = keys.filter(key => !trinkets.includes(key));

  if (selectableKeys.length > 0) {
    const selectedKeys = [];
    const targetCount = Math.min(3, selectableKeys.length);

    while (selectedKeys.length < targetCount) {
      const randomKey = selectableKeys[random(0, selectableKeys.length - 1)];
      if (!selectedKeys.includes(randomKey)) {
        selectedKeys.push(randomKey);
        trinketsOnDisplay.push(randomKey);
      }
    }

    selectedKeys.forEach((key) => {
      const trinket = trinketTypes[key];

      const trinketElement = document.createElement("div");
      trinketElement.classList.add("shop-tab");
      trinketElement.setAttribute("data-trinket", key);
      trinketElement.innerHTML = `
        <h3>${trinket.title}</h3>
        <p>${trinket.description}</p>
        <p style="font-size:10px"><i>${trinket.flavortext}</i></p>
        <img src="${trinket.image}" alt="${trinket.title}" class="trinket-image">
        <p class="price-tag">
          <span>${trinket.price}</span>
          <img src="graphics/ticket.png" alt="ticket" class="ticket-icon">
        </p>
      `;

      trinketElement.addEventListener("click", () => {
        if (tickets >= trinket.price) {
          tickets -= trinket.price;
          trinkets.push(key);
          trinketElement.remove();
          onTrinketBought(key);
          const index = trinketsOnDisplay.indexOf(key);
          if (index !== -1) {
            trinketsOnDisplay.splice(index, 1);
          }
        }
      });

      shopContainer.appendChild(trinketElement);
    });
  }

  const switchBtn = document.createElement("button");
  switchBtn.classList.add("shop-switch-modes");
  switchBtn.innerHTML = "Show Owned Trinkets";
  switchBtn.addEventListener("click", generateOwnedTrinkets);
  shopContainer.appendChild(switchBtn);
}
function displayTrinkets() {
  shopContainer.innerHTML = "";
  let selectedKeys = trinketsOnDisplay;
  selectedKeys.forEach((key) => {
    const trinket = trinketTypes[key];

    const trinketElement = document.createElement("div");
    trinketElement.classList.add("shop-tab");
    trinketElement.setAttribute("data-trinket", key);
    trinketElement.innerHTML = `
      <h3>${trinket.title}</h3>
      <p>${trinket.description}</p>
      <p style="font-size:10px"><i>${trinket.flavortext}</i></p>
      <img src="${trinket.image}" alt="${trinket.title}" class="trinket-image">
      <p class="price-tag">
        <span>${trinket.price}</span>
        <img src="graphics/ticket.png" alt="ticket" class="ticket-icon">
      </p>
    `;
    shopContainer.appendChild(trinketElement);
  });

  const switchBtn = document.createElement("button");
  switchBtn.classList.add("shop-switch-modes");
  switchBtn.innerHTML = "Show Owned Trinkets";
  switchBtn.addEventListener("click", generateOwnedTrinkets);
  shopContainer.appendChild(switchBtn);
}
function generateOwnedTrinkets() {
  shopContainer.innerHTML = "";

  trinkets.forEach((key) => {
    const trinket = trinketTypes[key];

    const trinketElement = document.createElement("div");
    trinketElement.classList.add("shop-tab");
    trinketElement.setAttribute("data-trinket", key);
    trinketElement.innerHTML = `
      <h3>${trinket.title}</h3>
      <p>${trinket.description}</p>
      <p style="font-size:10px"><i>${trinket.flavortext}</i></p>
      <img src="${trinket.image}" alt="${trinket.title}" class="trinket-image">
    `;

    shopContainer.appendChild(trinketElement);
  });

  const switchBtn = document.createElement("button");
  switchBtn.classList.add("shop-switch-modes");
  switchBtn.innerHTML = "Show Shop";
  switchBtn.addEventListener("click", displayTrinkets);
  shopContainer.appendChild(switchBtn);
}
generateTrinkets();

for(let i = 0;i<0;i++){chips.push(new chip(BOARD_WIDTH / 2, 50, "gameChip"));}
generatePlinko("basic");
rerollBadPegs();


//important loop
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
  ctx.fillStyle = "#151515";
  ctx.fillRect(0, 0, viewWidth, viewHeight);


  updateMenu();
  //game stuff
  if(gameState == "home"){
    if(chips.length == 0 && chipsAmount < debtToBePaid && roundsLeft == 0){
      triggerGameOver();
    }
  }
  if(gameState == "game"){
    if(chipsAmount == 0 && chips.length == 0){
      triggerGameOver();
    }
  }
  
  if (gameState === "game") {
    if (lives <= 0) {
      gameState = "home";
      lives = maxLives;
      roundsLeft--;
      startRoundButton.innerHTML = "Start Round";
      pegs = [];
      multipliers = [];
      generatePlinko("basic");
      rerollBadPegs();
    }
  } else if (gameState === "dying") {
    updateDeathAnimation();
  }
  displayRoundStats.innerHTML = "Rounds left: " + roundsLeft + "<br> Lives left: " + lives;

  // fitting
  ctx.save();
  ctx.translate(left, top);
  ctx.scale(scale, scale);
  if(logo.complete && logo.naturalWidth > 0){
    ctx.drawImage(logo, (BOARD_WIDTH - logo.width*logoScale)/2, (BOARD_HEIGHT - logo.height*logoScale)/2, logo.width*logoScale, logo.height*logoScale);
  }
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
  if(gameState == "game"){
    if(chipsAmount>0){
      chipsAmount--;
      chips.push(new chip(BOARD_WIDTH / 2, 50, "gameChip"));
      onChipDropped();
    }
  }
});

//open shop
document.addEventListener('mousemove', (event) => {
  const x = event.clientX;
  const y = event.clientY;

  if(x > window.innerWidth * 0.8 && gameState !== "dying"){
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

//start round
const startRoundButton = document.querySelector(".start-round-button");
startRoundButton.addEventListener("click", function(){
  if(gameState == "home"){
    gameState = "game";
    startRoundButton.innerHTML = "Round in progress";
  }
});

//kill player if they didn't pay of debt by end of deadline
const walletChipImage = document.querySelector(".wallet-chip-image");
const walletTicketImage = document.querySelector(".ticket-wallet-image");
const ticketWalletDisplay = document.querySelector(".ticket-wallet-display");
const walletDisplay = document.querySelector(".wallet-display");
function triggerGameOver() {
  gameState = "dying";
  chips = [];
  multipliers = [];

  shopArrow.remove();
  payOffDebtButton.remove();
  startRoundButton.remove();
  displayRoundStats.remove();
  walletChipImage.remove();
  walletTicketImage.remove();
  ticketWalletDisplay.remove();
  walletDisplay.remove();
}
function updateDeathAnimation() {
  if (pegs.length > 0 && random(0, 15) == 0) {
    const randomIndex = random(0, pegs.length - 1);
    pegs.splice(randomIndex, 1);
  }

  logoScale += 0.005;

  if (pegs.length==0) {
    const blackScreenElement = document.createElement("div");
    blackScreenElement.classList.add("black-screen");
    blackScreenElement.innerHTML = `RUN OVER<br><i>and so ends the dream of glory</i>`;
    document.body.appendChild(blackScreenElement);
  }
}

//open menu to pay off debt
payOffDebtButton.addEventListener("click", function(){
  if(gameState == "game")return;
  const debtMenuElement = document.createElement("div");
  debtMenuElement.classList.add("debt-menu");
  debtMenuElement.innerHTML = `
  <h3>Pay off debt</h3>
  <p>You need to pay off a debt of (${debtToBePaid}) chips in (${roundsLeft}) rounds.</p>
  <p>You currently have (${chipsAmount}) chips.</p>
  <button>Pay off full debt</button><button>Pay off partial debt (50% rounded down)</button><button>Cancel</button>
  `;
  document.body.appendChild(debtMenuElement);
  
  const [payFullBtn, payPartialBtn, cancelBtn] = debtMenuElement.querySelectorAll("button");

  payFullBtn.addEventListener("click", function(){
    if (chipsAmount >= debtToBePaid) {
      chipsAmount -= debtToBePaid;
      debtToBePaid = 0;
      debtMenuElement.remove();
      advanceDebtRound();
    }
  });

  payPartialBtn.addEventListener("click", function(){
    const payment = Math.min(Math.floor(chipsAmount / 2), debtToBePaid);
    chipsAmount -= payment;
    debtToBePaid -= payment;
    debtMenuElement.remove();
    if (debtToBePaid <= 0) {
      advanceDebtRound();
    }
    payOffDebtButton.innerHTML = `Pay off debt (${debtToBePaid})<img src="graphics/redchip.png" alt="chip(s)">`;
  });

  cancelBtn.addEventListener("click", function(){
    debtMenuElement.remove();
  });
});
