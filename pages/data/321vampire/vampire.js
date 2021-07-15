let players = [];
let playermap = {};
let guess_queue = [];
let half_guess = null;
let waiting = false;
let round = 0;

const guess1 = document.getElementById("guess1");
const guess2 = document.getElementById("guess2");
const equals = document.getElementById("equals");

const hidden_guess = "∙∙∙∙∙∙∙∙∙∙∙∙∙∙"
const hist_len = 8;

HOST.view = "text";
HOST.help = "Try to input the same word or phrase as another player without communicating.  Use past responses as clues!";
HOST.ontext = textHandler;
HOST.onuserjoin = joinHandler;
HOST.onuserleave = leaveHandler;
HOST.init();


// GAMEPLAY ----------------
function processGuess() {
    if (guess_queue.length == 0 || waiting) {
        return;
    }
    let guess = guess_queue[0];
    guess_queue.splice(0, 1);
    
    if (half_guess == null) {
        setDOMVal(guess1, hidden_guess.substr(0, guess.string.length), guess.player);
        setBackground(guess1, "#292929");
        half_guess = guess;
    } else {
        if (guess.player == half_guess.player) { // no double-guessing
            processGuess();
            return;
        }
        setDOMVal(guess1, half_guess.string, "#FFFFFF");
        setDOMVal(guess2, guess.string, "#FFFFFF");
        if (guessMatch(guess.string, half_guess.string)) {
            setBackground(guess1, "#323908");
            setBackground(guess2, "#323908");
            equals.innerText = "="
            playermap[guess.player].matches += 1;
            playermap[half_guess.player].matches += 1;

        } else {
            setBackground(guess1, "#9e3a3a");
            setBackground(guess2, "#9e3a3a");
            equals.innerText = "≠"
            playermap[guess.player].guesses += 1;
            playermap[half_guess.player].guesses += 1;
        }
        updatePlayer(playermap[guess.player])
        updatePlayer(playermap[half_guess.player])
        waiting = true;
        setTimeout(advanceRound, 750);
    }
}

function advanceRound() {
    addOldGuess(guess1.innerText, guess2.innerText, guessMatch(guess1.innerText, guess2.innerText));
    guess1.innerText = "//";
    guess2.innerText = "//";
    equals.innerText = "≠"
    setBackground(guess1, "#292929");
    setBackground(guess2, "#292929");
    
    round += 1;
    displayRound();

    half_guess = null;
    waiting = false;
    processGuess();
}

function guessMatch(one, two) {
    one = one.toLowerCase().replace(/[^0-9a-z]/gi, '');
    two = two.toLowerCase().replace(/[^0-9a-z]/gi, '');
    if (two == one) {
        return true;
    }
    if (two.indexOf(one) != -1 || one.indexOf(two) != -1) {
        return true;
    }

    return false
}



// DOM ---------------------
function addPlayer(player) {
    player.div = document.createElement("div");
    player.div.innerHTML = document.getElementById("player-left-t").innerHTML;
    if (players.length % 2 == 1) { // left
        player.div.innerHTML = document.getElementById("player-left-t").innerHTML;
        document.getElementById("left").appendChild(player.div);
    }
    else { // right
        player.div.innerHTML = document.getElementById("player-right-t").innerHTML;
        document.getElementById("right").appendChild(player.div);
    }
    player.div.style.color = player.color;
    updatePlayer(player);
}

function removePlayer(player) {
    player.div.remove();
}

function updatePlayer(player) {
    if (player.div.children[0].className == "players_l") { // left
        player.div.children[0].children[1].children[0].innerText = guesses(player);
        player.div.children[0].children[1].children[1].innerText = matches(player);

    } else { // right
        player.div.children[0].children[0].children[0].innerText = guesses(player);
        player.div.children[0].children[0].children[1].innerText = matches(player);
    }
}

function addOldGuess(guess1, guess2, correct) {
    let guess = document.createElement("div");
    if (!correct) {
        guess.innerHTML = document.getElementById("inputs-small-t").innerHTML;
    } else {
        guess.innerHTML = document.getElementById("inputs-small-t-match").innerHTML;
    }
    guess.children[0].children[0].innerText = guess1;
    guess.children[0].children[2].innerText = guess2

    let guessHolder = document.getElementById("oldguessholder");
    guessHolder.appendChild(guess);
    if(guessHolder.children.length >= hist_len) {
        guessHolder.children[0].remove();
    }
    let l = guessHolder.children.length
    for (let i = 0; i < l; i++) {
        console.log((i + (l - hist_len)) / hist_len);
        guessHolder.children[i].style.opacity = (i + (hist_len - l)) / hist_len;
    }
}

function setDOMVal(domObj, text, color) {
    domObj.style.color = color;
    domObj.innerText = text;
}

function setBackground(domObj, color) {
    domObj.style.backgroundColor = color;
}

function displayRound() {
    document.getElementById("roundnum").innerText = round;
}


// HANDLERS -----------------------------
function joinHandler(e) {
    let p = Player(e.uid);
    players.push(p);
    playermap[e.uid] = p;
    addPlayer(p);
}

function leaveHandler(e) {
    removePlayer(playermap[e.uid])
    for (let i = 0; i < players.length; i++) {
        if (e.uid == players[i].color) {
            players.splice(i, 1);
            delete playermap[e.uid];
            return;
        }
    }
}


function textHandler(e) {
    guess_queue.push(Guess(e.text, e.uid));
    processGuess();
}


// DATA -----------------------

function Player(color) {
    return {guesses: 0, matches: 0, color: color, div: null};
}

function guesses(player) {
    if (player.guesses == 1) {
        return "" + player.guesses + " Guess";
    }
    return "" + player.guesses + " Guesses";
}

function matches(player) {
    if (player.matches == 1) {
        return "" + player.matches + " Match";
    }
    return "" + player.matches + " Matches";
}

function Guess(string, id) {
    return {string: string, player: id};
}
