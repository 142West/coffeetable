const SHADES = [0.85, 1, 0.1, 0.5];
const DEFAULT_COLOR = "#505050"

const VIEWS = ["select", "direction", "proportion", "text"]

let COLOR = "#000000";
let COLOR_COMP = {R: 0, G: 0, B: 0};

let SOCKET = undefined;

let VIEW = "select"; // of SELECT, DIRECTION, PROPORTION, TEXT

let LOCKED = false;

let PAGE_LIST = {};

const canvas = document.getElementById("screen");
const ctx = canvas.getContext("2d");
let render = {};

let input = {};

document.onselectstart = function() {return false;};

load();

/*----------- LOADING -----------*/
function load() {
    recolor(DEFAULT_COLOR);
    setupRendering();
    addEventListeners();
    connect();
}


/*----------- UTILITY -----------*/
function changeView(view) {
    if (VIEWS.indexOf(view) < 0) {
        console.warn("Attempted to load invalid view.")
        return;
    }
    VIEW = view;
    renderClear();
    renderView(view);

}

/*----------- SOCKETS -----------*/
function connect() {
    if (SOCKET != undefined) {
        console.warn("WARNING: Attempting to reconnect while socket is open!");
        SOCKET.close();
    }
    const socket_path = "ws://" + window.location.host + "/connect";
    console.log(socket_path);
    SOCKET = new WebSocket(socket_path);
    SOCKET.onopen = socketOpen;
    SOCKET.onmessage = socketMessage;
    SOCKET.onclose = socketClose;
}

function socketOpen() {
    console.log("successfully opened socket.");
}

function socketMessage(message) {
    //console.log(message);
    const m = JSON.parse(message.data);
    //console.log(m);
    switch (m.type) {
        case "user_register":
            recolor(m.payload);
            break;
        case "switch_view":
            changeView(m.payload);
            break;
        case "lock_input":
            lockInput();
            break;
        case "unlock_input":
            unlockInput();
            break;
        case "set_mode":
            break;
        case "page_list":
            PAGE_LIST = m.payload;
            changeView("select")
            console.log(m.payload);
            break;
    }
}

function socketClose() {
    console.log("websocket closed...");
    SOCKET = undefined;
    recolor(DEFAULT_COLOR);
}

function sendPacket(typ, src, dst, payload) {
    if(SOCKET != undefined) {
        SOCKET.send(JSON.stringify({"type": typ, "source": src, 
            "destination": dst, "payload": payload}));
    }
}

/*----------- COLORS -----------*/
function recolor(color) {
    COLOR = color;
    COLOR_COMP = colorToComp(color);
    theme = themeColors(color);
    document.getElementById("menubar").style.backgroundColor = theme[0];
    document.getElementById("menubar").style.borderColor = theme[1]
    document.getElementById("screen").style.backgroundColor = theme[2];
    document.getElementById("footer").style.backgroundColor = theme[3];
}

function colorToComp(color) {
    return {R: parseInt(color.substr(1,2), 16), 
        G: parseInt(color.substr(3,2), 16), 
        B: parseInt(color.substr(5,2), 16)};
}

function compToColor(comp) {
    return "#" + ("00" + comp.R.toString(16)).substr(-2) + 
        ("00" + comp.G.toString(16)).substr(-2) + 
        ("00" + comp.B.toString(16)).substr(-2);
}

function themeColors(color) {
    let colors = [];
    for (let shade of SHADES) {
        let comp = colorToComp(color);
        comp.R = Math.floor(comp.R * shade);
        comp.G = Math.floor(comp.G * shade);
        comp.B = Math.floor(comp.B * shade);
        colors.push(compToColor(comp));
    }
    return colors;
}

/*----------- RENDERING -----------*/

function setupRendering() {
    scaleCanvas();
    render.DOM = [];
    
    render.sel = {};
    render.sel.left = new Image();
    render.sel.left.src = "img/arrow-left.png";
    render.sel.right = new Image();
    render.sel.right.src = "img/arrow-right.png";
}

function scaleCanvas() {
    console.log("scaled!");
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;
    ctx.imageSmoothingEnabled=false;
}

function renderView(view) {

    switch (view) {
        case "select":
            setupSelect();
            requestAnimationFrame(renderSelect);
            break;
    }
}

function renderClear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i of render.DOM) {
        i.remove();
    }
    render.DOM = [];
}

// SELECT PAGE
function setupSelect() {
    render.sel.y = 0;
    render.sel.v = 0;
    render.sel.names = [];
    render.sel.trimmed_names = [];
    render.sel.texts = []
    const max_len = 32;

    for (const [key, value] of Object.entries(PAGE_LIST)) {
        render.sel.names.push(key);
        render.sel.trimmed_names.push(key.substr(0, max_len));
        render.sel.texts.push(makeDiv("select_text", key.substr(0, max_len)));
    }
}
function renderSelect() {
    ctx.textAlign = "center";
    ctx.font = "32px Arial";
    ctx.fillStyle = "#BFBFFF";
    const offset = 45; // dist between lines of text
    const frict = 0.8; // scale velocity each step
    
    // clear 
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(render.sel.left, canvas.width/2 + 150 - 10, canvas.height/2 - 20, 20, 36);
    ctx.drawImage(render.sel.right, canvas.width/2 - 150 - 10, canvas.height/2 - 20, 20, 36);

    // clamp values (no overscroll)
    if (render.sel.y > 0) {
        render.sel.y = 0;
    }
    if (render.sel.y < -1 * offset * render.sel.names.length + offset){
        render.sel.y = -1 * offset * render.sel.names.length + offset; 
    }

    // place all the texts
    for (let i = 0; i < render.sel.names.length; i++) {
        let d = render.sel.texts[i]; // get the div
        let y = canvas.height / 2 + offset * i + render.sel.y; // calc position
        if (y <= canvas.height / 2 + offset / 2 && y > canvas.height / 2 - offset / 2) {
            // this div is centered, highlight as selection
            d.style.color = "#6e6eff";
            render.sel.selected = render.sel.names[i];
        } else {
            // otherwise set to background color.  #TODO fade?
            d.style.color = "#3535DD";
        }
        // move it
        setPos(d, canvas.width/2, Math.min(y, canvas.height - 20));
    }   
    // retain velocity after user stops interacting
    if (!input.mouse && !input.touchi && render.sel.v > 0) {
        render.sel.y += render.sel.v;
        render.sel.v *= frict;
        console.log("v...");
    }
    if (render.sel.v < 0.0001) { // floats are floaty
        render.sel.v = 0;
    }
    
    if (VIEW == "select") { // render the next frame unless the view has changed
        requestAnimationFrame(renderSelect);
    }
}

// DIRECTION PAGE
function renderDirection() {

}

function renderProportion() {

}

function renderText() {

}

/*------------ DOM ------------*/

function makeDiv(clazz, text) {
    let obj = document.createElement("div");
    obj.innerText = text;
    obj.className = clazz;
    document.body.appendChild(obj);
    render.DOM.push(obj);
    return obj;
}

function setPos(obj, x, y) {
    obj.style.top = "" + y + "px";
    obj.style.left = "" + x + "px";
}

/*----------- INTERFACE -----------*/

function translation(loc, delta, dt) {
    switch (VIEW) {
        case "select":
            render.sel.y += delta.y;
            render.sel.v = delta.y;
            break;
    }
}

function tap(loc) {
    switch (VIEW) {
        case "select":
            sendPacket("load_page", COLOR, "server", PAGE_LIST[render.sel.selected]);
            console.log(render.sel.selected);
            break;
    }
}

function addEventListeners() {
    const body = document.body;
    const tapThreshold = 250; // ms
    input.mouse = false;
    input.touch = false;
    
    /*------  MOUSE CONTROLS ---------*/
    body.addEventListener('mousemove', e => {
        let loc = {x: e.clientX, y: e.clientY};
        if (e.buttons != 0) {
            translation(loc, {x: loc.x - input.lastMouse.x, y: loc.y - input.lastMouse.y}, 5);
        }
        input.lastMouse = loc;
        //record delta
    });
    body.addEventListener('mouseup', e => {
        input.mouse = false;
        if (Date.now() - input.mouseTS < tapThreshold && 
            Math.pow(e.clientX - input.startMouse.x, 2) + Math.pow(e.clientY - input.startMouse.y, 2) < 100){
            tap({x: e.clientX, y: e.clientY});
        }
    });
    body.addEventListener('mousedown', e => {
        input.lastMouse = {x: e.clientX, y: e.clientY};
        input.startMouse = {x: e.clientX, y: e.clientY};
        input.mouseTS = Date.now();
        input.mouse = true;
    });
    /*-------- TOUCH CONTROLS --------*/
    body.addEventListener('touchmove', e => {
        let t = e.touches[0]
        let loc = {x: t.clientX, y: t.clientY};
        translation(loc, {x: loc.x - input.lastTouch.x, y: loc.y - input.lastTouch.y}, 5);
        input.lastTouch = loc;
        //figure out which touch and where, record delta
    });
    body.addEventListener('touchstart', e => {
        //add new touch to list, record t
        let t = e.touches[0]
        input.lastTouch = {x: t.clientX, y: t.clientY};
        input.touch = true;
    });
    body.addEventListener('touchend', e => {
        //figure out which touch ended, find movement and dt to detect tap
        input.touch = false;
    });

    window.addEventListener("resize", scaleCanvas);
}



