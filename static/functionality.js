const SHADES = [0.85, 1, 0.1, 0.5];
const DEFAULT_COLOR = "#505050"

const VIEWS = ["select", "direction", "proportion", "text"]

let COLOR = "#000000";
let COLOR_COMP = {R: 0, G: 0, B: 0};

let SOCKET = undefined;

let VIEW = "select"; // of SELECT, DIRECTION, PROPORTION, TEXT

let LOCKED = false;

let PAGE_LIST = {};
let SELECTED_PAGE = "";

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
        case "page_select":
            console.log("recieved page select");
            SELECTED_PAGE = m.payload;
            console.log(SELECTED_PAGE);
            render.info.txt = "This page has no hints.";
            clearInfo();
            break;
        case "help_text":
            render.info.txt = m.payload;
            renderInfoRecieved();
    }
}

function socketClose() {
    console.log("websocket closed...");
    SOCKET = undefined;
    recolor(DEFAULT_COLOR);
    connect();
}

function sendPacket(typ, src, dst, payload) {
    if(SOCKET != undefined && SOCKET.readyState == 1) {
        SOCKET.send(JSON.stringify({"type": typ, "source": src, 
            "destination": dst, "payload": payload}));
        console.log("sent packet....");
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
    render.updateRequired = true;
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

function scaleColor(color, scale) {
    let comp = colorToComp(color);
    comp.R = Math.floor(comp.R * scale);
    comp.G = Math.floor(comp.G * scale);
    comp.B = Math.floor(comp.B * scale);
    comp.R = Math.min(Math.max(comp.R, 0), 255);
    comp.G = Math.min(Math.max(comp.G, 0), 255);
    comp.B = Math.min(Math.max(comp.B, 0), 255);
    return compToColor(comp);
}

function themeColors(color) {
    let colors = [];
    for (let shade of SHADES) {
        colors.push(scaleColor(color, shade));
    }
    return colors;
}

/*----------- RENDERING -----------*/

function setupRendering() {
    scaleCanvas();
    render.DOM = [];
    render.updateRequired = false;
    
    render.sel = {};
    render.sel.left = new Image();
    render.sel.left.src = "img/arrow-left.png";
    render.sel.right = new Image();
    render.sel.right.src = "img/arrow-right.png";

    render.dir = {};
    render.dir.up = new Image();
    render.dir.up.src = "img/drag-up.png";
    render.dir.down = new Image();
    render.dir.down.src = "img/drag-down.png";
    render.dir.left = new Image();
    render.dir.left.src = "img/drag-left.png";
    render.dir.right = new Image();
    render.dir.right.src = "img/drag-right.png";
    render.dir.bg = new Image();
    render.dir.bg.src = "img/direction-bg.png";

    render.joy = {};
    render.joy.head = new Image();
    render.joy.head.src = "img/joystick-head.png";
    render.joy.ring = new Image();
    render.joy.ring.src = "img/joystick-ring.png";
    render.joy.bg = new Image();
    render.joy.bg.src = "img/joystick-bg.png";

    render.txt = {};

    render.info = {}
    render.info.txt = "This page has no hints.";
    render.info.shown = false;
}

function scaleCanvas() {
    console.log("scaled!");
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;
    ctx.imageSmoothingEnabled=false;
    render.updateRequired = true;
}

function renderView(view) {
    renderClear();
    render.updateRequired = true;
    switch (view) {
        case "select":
            setupSelect();
            requestAnimationFrame(renderSelect);
            break;
        case "direction":
            setupDirection();
            requestAnimationFrame(renderDirection);
            break;
        case "proportion":
            setupProportion();
            requestAnimationFrame(renderProportion);
            break;
        case "text":
            setupText();
            requestAnimationFrame(renderText);
            break;
    }
}

function renderClear() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i of render.DOM) {
        i.remove();
    }
    for (let i of document.getElementsByClassName("temporary")) {
        i.remove();
    }
    render.DOM = [];
    render.updateRequired = true;
}

// SELECT PAGE
function setupSelect() {
    render.sel.y = 0;
    render.sel.v = 0;
    render.sel.names = [];
    render.sel.values = [];
    render.sel.trimmed_names = [];
    render.sel.texts = []
    const max_len = 32;

    for (const [key, value] of Object.entries(PAGE_LIST)) {
        render.sel.names.push(key);
        render.sel.values.push(value);
        render.sel.trimmed_names.push(key.substr(0, max_len));
        render.sel.texts.push(makeDiv("select_text", key.substr(0, max_len)));
    }
}
function renderSelect() {
    // schedule the next frame unless the view has changed
    if (VIEW == "select") {        
        requestAnimationFrame(renderSelect);
    }

    if (render.updateRequired || render.sel.v != 0 || input.touch || input.mouse) {
        const offset = 45; // dist between lines of text
        const frict = 0.8; // scale velocity each step
        
        // clear 
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(render.sel.left, canvas.width/2 + 150 - 10, canvas.height/2 - 20, 20, 36);
        ctx.drawImage(render.sel.right, canvas.width/2 - 150 - 10, canvas.height/2 - 20, 20, 36);

        // clamp values (no overscroll)
        if (render.sel.y > 10) {
            render.sel.y = 10;
        }
        if (render.sel.y < -1 * offset * render.sel.names.length + offset - 10){
            render.sel.y = -1 * offset * render.sel.names.length + offset - 10; 
        }

        // place all the texts
        for (let i = 0; i < render.sel.names.length; i++) {
            let d = render.sel.texts[i]; // get the div
            let y = canvas.height / 2 + offset * i + render.sel.y; // calc position
            let col = "#3535DD";
            if (render.sel.values[i] == SELECTED_PAGE) {
                col = "#6e6eff";
            }
            if (y <= canvas.height / 2 + offset / 2 && y > canvas.height / 2 - offset / 2) {
                // this div is centered, highlight as selection
                col = scaleColor(col, 1.2);
                render.sel.selected = render.sel.names[i];
            }
            col = scaleColor(col, 1 - (Math.abs(y - canvas.height / 2) / (canvas.height / 2)));
            // move it
            setPos(d, canvas.width/2, Math.min(y, canvas.height - 20));
            d.style.color = col;
        }

        const alignment = (((-1 * render.sel.y) + 22) % 45) - 22;
        if (alignment > 0.5 && !input.mouse && !input.touch){
            render.sel.v += 0.2 * Math.min(Math.sqrt(Math.abs(alignment)), 5);
        }
        if (alignment < -0.5 && ! input.mouse && !input.touch){
            render.sel.v -= 0.2 * Math.min(Math.sqrt(Math.abs(alignment)), 5);
        }
        // retain velocity after user stops interacting
        if (!input.mouse && !input.touch && Math.abs(render.sel.v) > 0) {
            render.sel.y += render.sel.v;
            render.sel.v *= frict;
        }
        if (Math.abs(render.sel.v) < 0.0001) { // floats are floaty
            render.sel.v = 0;
        }
    }

}

// DIRECTION PAGE

function setupDirection() {
    
}
function renderDirection() {
    if (VIEW == "direction") {
        requestAnimationFrame(renderDirection)
    }
    
    if (render.updateRequired || Object.keys(input.touches).length > 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bg_scale = 4;
        ctx.globalAlpha = 0.3;
        ctx.drawImage(render.dir.bg, canvas.width/2 - 36 * bg_scale, canvas.height/2 - 8 * bg_scale, 72 * bg_scale, 16 * bg_scale);
        ctx.globalAlpha = 1;
        for(const [k, v] of Object.entries(input.touches)) {
            const scale = 6;
            const x = v.start.x - 7 * scale;
            const y = v.start.y - 7 * scale;
            if ( v.state == "" && Date.now() - v.ts > 300) {
                ctx.drawImage(render.dir.up, x, y - 11 * scale, 14 * scale, 13 * scale);
                ctx.drawImage(render.dir.down, x, y + 13 * scale, 14 * scale, 13 * scale);
                ctx.drawImage(render.dir.left, x - 11 * scale, y, 12 * scale, 15 * scale);
                ctx.drawImage(render.dir.right, x + 12 * scale, y, 12 * scale, 15 * scale);

                // render all small arrows
            }
            if ( v.state != "") {
                switch (v.state) {
                    case "up"://14x13
                        ctx.drawImage(render.dir.up, x, y - 11 * scale, 14 * scale, 13 * scale);
                        break;
                    case "down"://14x13
                        ctx.drawImage(render.dir.down, x, y + 13 * scale, 14 * scale, 13 * scale);
                        break;
                    case "left"://12x15
                        ctx.drawImage(render.dir.left, x - 11 * scale, y, 12 * scale, 15 * scale);
                        break;
                    case "right":
                        ctx.drawImage(render.dir.right, x + 12 * scale, y, 12 * scale, 15 * scale);
                        break;
                }
            }
        }
    }
}

// JOYSTICK PAGE
function setupProportion() {

}
function renderProportion() {
    if (VIEW == "proportion") {
        requestAnimationFrame(renderProportion);
    }
    
    if (render.updateRequired || Object.keys(input.touches).length > 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const bg_scale = 4;
        ctx.globalAlpha = 0.3;
        ctx.drawImage(render.joy.bg, canvas.width/2 - 32 * bg_scale, canvas.height/2 - 4 * bg_scale, 64 * bg_scale, 8 * bg_scale);
        ctx.globalAlpha = 1;

        const scale = 5;
        const w_head = 18;
        const w_ring = 24;
        const rad_ring = (w_ring - 4) / 2;
        
        for(const [k, v] of Object.entries(input.touches)) {
            let x = v.loc.x;
            let y = v.loc.y;
            if (v.d.c > scale * rad_ring) {
                x = v.start.x + (rad_ring * scale) * (v.d.x / v.d.c);
                y = v.start.y + (rad_ring * scale) * (v.d.y / v.d.c);
            }

            ctx.drawImage(render.joy.ring, v.start.x - scale * w_ring / 2, v.start.y - scale * w_ring / 2, w_ring * scale, w_ring * scale);
            ctx.drawImage(render.joy.head, x - scale * w_head / 2, y - scale * w_head / 2, w_head * scale, w_head * scale);
        }
    }
}


//TODO
//keyboard inputs (joy)
//use instructions

//TEXT PAGE
function setupText() {
    render.txt.input = makeInput("text_input");
    render.txt.input.id = "text-input";
    render.txt.input.addEventListener("keyup", e => {
        if (e.key === "Enter") {
            submitText();
        }
    });
    render.txt.btn = makeImg("text_btn", "img/text-btn.png");
    render.txt.input.id = "text-btn";
    render.txt.btn.style.backgroundColor = COLOR;
    render.txt.btn.classList.add("crisp");
    render.txt.btn.onclick = submitText;
    setPos(render.txt.input, canvas.width/2, canvas.height/4 + 20);
    setPos(render.txt.btn, canvas.width/2, canvas.height/2 + 20);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function renderText() {
    if (VIEW == "text") {
        requestAnimationFrame(renderText);
    }
    if (render.updateRequired) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        render.txt.btn.style.backgroundColor = COLOR;
        setPos(render.txt.input, canvas.width/2, canvas.height/4 + 20);
        setPos(render.txt.btn, canvas.width/2, canvas.height/2 + 20);
    }
}
function submitText() {
    let text = render.txt.input.value;
    if (text != "") {
        sendPacket("input", COLOR, "host", {type: "text", content: text});
        render.txt.input.value = "";
    }
    render.txt.btn.style.opacity = "0.5";
    setTimeout(resetTextButton, 400);
}
function resetTextButton() {
    let btn = document.getElementById("text-btn");
    render.txt.btn.style.opacity = "1";
}

// INFO PAGE
function renderInfoRecieved() {
    if (!render.info.shown) {
        let btn = document.getElementById("btn-info");
        btn.src = "img/info-icon-message.png";
    } else {
        clearInfo();
        showInfo();
    }
}
function showInfo() {
    if (!render.info.shown) {
        let btn = document.getElementById("btn-info");
        btn.src = "img/info-icon-selected.png";
        let d = document.createElement("div");
        let theme = themeColors(COLOR);
        d.innerText = render.info.txt;
        d.className = "infobox";
        document.body.appendChild(d);
        d.id = "infobox";
        d.style.backgroundColor = theme[2];
        d.style.borderBottomColor = theme[0];
        d.style.color = "#FFFFFF";
        d.height = "" + (window.innerheight - 72) + "px";
        render.info.shown = true;
    }
    else {
        clearInfo()
    }
}
function clearInfo() {
    let d = document.getElementById("infobox");
    let btn = document.getElementById("btn-info");
    btn.src = "img/info-icon.png";
    if (d != null) {
        d.remove();
        render.DOM.splice(render.DOM.indexOf(d), 1);
    }
    render.info.shown = false;
}

/*------------ DOM ------------*/

function makeDiv(clazz, text) {
    let obj = document.createElement("div");
    obj.innerText = text;
    obj.className = clazz;
    obj.classList.add("temporary");
    document.getElementById("screen-box").appendChild(obj);
    render.DOM.push(obj);
    return obj;
}

function makeInput(clazz) {
    let obj = document.createElement("input");
    obj.className = clazz;
    obj.classList.add("temporary");
    document.body.appendChild(obj);
    render.DOM.push(obj);
    return obj;
}

function makeImg(clazz, src) {
    let obj = document.createElement("img");
    obj.className = clazz;
    obj.classList.add("temporary");
    obj.src = src;
    document.body.appendChild(obj);
    render.DOM.push(obj);
    return obj;
}

function makeButton(clazz, text, callback) {
    let obj = document.createElement("button");
    obj.innerText = text;
    obj.className = clazz;
    obj.classList.add("temporary");
    obj.onclick = callback;
    document.getElementById("screen-box").appendChild(obj);
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
            render.sel.v = delta.y / dt;
            break;
    }
}

function touchChanged(id) {
    let touch = input.touches[id];
    let state = touch.state;
    const threshold = 30;
    switch (VIEW) {
        case "direction":
            if (Math.abs(touch.d.x) > Math.abs(touch.d.y)) { 
                if (touch.d.x > threshold) {
                    touch.state = "right";
                }
                if (touch.d.x < -1 * threshold) {
                    touch.state = "left";
                }
            } else {
                if (touch.d.y > threshold) {
                    touch.state = "down";
                }
                if (touch.d.y < -1 * threshold) {
                    touch.state = "up";
                }
            }
            if (Math.abs(touch.d.x) < threshold && Math.abs(touch.d.y) < threshold) {
                touch.state = "";
            }
            if (touch.state != state) {
                if (state != "") {
                    sendPacket("input_end", COLOR, "host", state);
                    console.log("end input")
                }
                if (touch.state != "") {
                    sendPacket("input_start", COLOR, "host", touch.state);
                    console.log("start input");
                }
            }
            break;
        case "proportion":
            let a = Math.atan2(touch.d.y, touch.d.x);
            let s = Math.min(touch.d.c / 50, 1); // MAGIC VALUE, see proportion display
            sendPacket("input", COLOR, "host", 
                {type: "proportion", angle: a, strength: s, id: touch.lid});
            break;
    }
}

function touchEnded(id){
    let touch = input.touches[id];
    let state = touch.state;
    const threshold = 30;
    switch (VIEW) {
        case "direction":
            if (state != "") {
                sendPacket("input_end", COLOR, "host", state);
                console.log("end input");
            }
            break;
    }
}

function tap(loc) {
    console.log("TAP!");
    switch (VIEW) {
        case "select":
            sendPacket("load_page", COLOR, "server", PAGE_LIST[render.sel.selected]);
            break;
        case "direction":
        case "proportion":
            sendPacket("input", COLOR, "host", {type:"tap"});
            break;
    }
}

function addEventListeners() {
    const body = document.getElementById("screen-box");
    const tapThreshold = 250; // ms
    const dragThreshold = 30;
    input.mouse = false;
    input.touch = false;
    input.touches = {};
    input.lidpool = [1, 1, 1, 1];
    
    /*------  MOUSE CONTROLS ---------*/
    body.addEventListener('mousemove', e => {
        let loc = {x: e.clientX, y: e.clientY};
        if (e.buttons != 0) {
            translation(loc, {x: loc.x - input.lastMouse.x, y: loc.y - input.lastMouse.y}, 1);
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
        let changed = updateTouches(e.touches);
        for (let touch of changed) {
            translation(touch.l, touch.dt, 1);
            touchChanged(touch.id);
        }
        e.preventDefault();
        //figure out which touch and where, record delta
    }, { passive: false});

    body.addEventListener('touchstart', e => {
        updateTouches(e.touches);
        //add new touch to list, record t
        let t = e.touches[0]
        input.touch = true;
        e.preventDefault();
    });
    body.addEventListener('touchend', e => {
        //figure out which touch ended, find movement and dt to detect tap
        for (touch of e.changedTouches) {
            let t = input.touches[touch.identifier];
            if (Date.now() - t.ts < tapThreshold &&
                t.d.c < dragThreshold) {
                tap(t.loc);
            }
            else {
                touchEnded(touch.identifier);
            }
            input.lidpool[t.lid] = 1;
            delete input.touches[touch.identifier];
        }
        input.touch = input.touches.length > 0;
    });

    document.onkeydown = e => {
        let loc = { x: canvas.width / 2 , y : canvas.height / 2 };
        const strength = 45;
        switch(e.keyCode) {
            case 37: //left
                translation(loc, {x: -1 * strength, y: 0}, 25);
                break;
            case 38: //up
                translation(loc, {x: 0, y: -1 * strength}, 25);
                break;
            case 39: //right
                translation(loc, {x: strength, y: 0}, 25);
                break;
            case 40://down
                translation(loc, {x: 0, y: strength}, 25);
                break;
            case 13://enter
            case 32://space
                tap(loc);
                break;
        }
        if (VIEW == "direction") {
            switch(e.keyCode) {
                case 37: //left
                    sendPacket("input_start", COLOR, "host", "left");
                    break;
                case 38: //up
                    sendPacket("input_start", COLOR, "host", "up");
                    break;
                case 39: //right
                    sendPacket("input_start", COLOR, "host", "right");
                    break;
                case 40://down
                    sendPacket("input_start", COLOR, "host", "down");
                    break;
            }
        }
    }
    
    document.onkeyup = e => {
        if (VIEW == "direction") {
            switch(e.keyCode) {
                case 37: //left
                    sendPacket("input_end", COLOR, "host", "left");
                    break;
                case 38: //up
                    sendPacket("input_end", COLOR, "host", "up");
                    break;
                case 39: //right
                    sendPacket("input_end", COLOR, "host", "right");
                    break;
                case 40://down
                    sendPacket("input_end", COLOR, "host", "down");
                    break;
            }
        }
    }
     

    document.getElementById("btn-select").addEventListener("click", e => {
        changeView("select");
    });
    document.getElementById("btn-direction").addEventListener("click", e => {
        changeView("direction");
    });
    document.getElementById("btn-joystick").addEventListener("click", e => {
        changeView("proportion");
    });
    document.getElementById("btn-text").addEventListener("click", e => {
        changeView("text");
    });
    document.getElementById("btn-info").addEventListener("click", e => {
        showInfo();
    });

    window.addEventListener("resize", scaleCanvas);
    window.addEventListener("orientationchange", scaleCanvas);
    
    // 37< 38^ 39> 40v 13E 32[ ]
}

function updateTouches(newTouches) {
    changed = [];
    for (let touch of newTouches) {
        let t = input.touches[touch.identifier];
        if (t != undefined) {
            if(t.loc.x != touch.clientX || t.loc.y != touch.clientY) {
                t.dt = {x: touch.clientX - t.loc.x, y: touch.clientY - t.loc.y};
                t.loc = {x: touch.clientX, y: touch.clientY};
                t.d = {x: t.loc.x - t.start.x, y: t.loc.y - t.start.y};
                t.d.c = Math.sqrt(t.d.x * t.d.x + t.d.y * t.d.y);
                changed.push({l: t.loc, dt: t.dt, id: t.id});
            }
        } else {
            newTouch(touch.clientX, touch.clientY, touch.identifier);
        }
    }
    return changed;
}

function nextLID() {
    let i = 0;
    while (input.lidpool[i] == 0) {
        i++;
    }
    input.lidpool[i] = 0;
    return i;
}

function newTouch(x, y, id) {
    let touch = {};
    touch.start = {x: x, y: y};
    touch.loc = {x: x, y: y};
    touch.d = {x: 0, y: 0, c: 0};
    touch.dt = {x: 0, y: 0};
    touch.id = id;
    touch.ts = Date.now();
    touch.state = "";
    touch.lid = nextLID();
    input.touches[id] = touch;
}

