
let HOST = {};

HOST.socket = undefined;
HOST.user_data = {};
HOST.users = [];

HOST.view = "";
HOST.help = "";

HOST.ontext = noop; //text input
HOST.ontap = noop;  //tap input
HOST.ondirection = noop;    //direction (swipe) input
HOST.onjoystick = noop;     //joystick input

HOST.onmessage = noop;      //incoming message catchall

HOST.onuserjoin = noop; //user joins
HOST.onuserleave = noop;//user leaves

HOST.onconnect = noop;  //connection to python server opened

HOST.init = function () {
    HOST.socket = new WebSocket("ws://localhost:8081/hostconnect");
    HOST.socket.onopen = e => {
        console.log("connected to local python server.")
        HOST.onconnect({});
    };
    HOST.socket.onclose = e => {
        console.error("Lost connection to local python server");
        HOST.init();
    };
    HOST.socket.onmessage = message => {
        const m = JSON.parse(message.data);
        let e = {};
        let user_data = undefined;
        e.packet = m;
        e.type = e.packet.type;
        if (m.source != "server") {
            e.uid = m.source;
            user_data = HOST.user_data[m.source];
        }
        
        switch (m.type) {
            case "input":
                switch (m.payload.type) {
                    case "tap":
                        HOST.ontap(e);
                        break;
                    case "text":
                        e.text = m.payload.content;
                        HOST.ontext(e);
                        break;
                    case "proportion":
                        e.id = m.payload.id;
                        e.angle - m.payload.angle;
                        e.strength = m.payload.strength;
                        HOST.onjoystick(e);
                        break;
                }
                break;
            case "input_start":
                e.left = user_data.left || m.payload == "left";
                e.right = user_data.right || m.payload == "right";
                e.up = user_data.up || m.payload == "up";
                e.down = user_data.down || m.payload == "down";
                user_data.left = e.left;
                user_data.right = e.right;
                user_data.up = e.up;
                user_data.down = e.down;
                HOST.ondirection(e);
                break;
            case "input_end":
                // legacy support, no type means direction.
                if(m.payload.type == undefined) {
                    e.left = user_data.left && m.payload != "left";
                    e.right = user_data.right && m.payload != "right";
                    e.up = user_data.up && m.payload != "up";
                    e.down = user_data.down && m.payload != "down";
                    user_data.left = e.left;
                    user_data.right = e.right;
                    user_data.up = e.up;
                    user_data.down = e.down;
                    HOST.ondirection(e);
                } else {
                    switch (m.payload.type) {
                        case "proportion":
                            e.id = m.payload.id;
                            e.angle - m.payload.angle;
                            e.strength = m.payload.strength;
                            e.end = true;
                            HOST.onjoystick(e);
                            break;
                    }
                }
                break;

            case "user_register":
                console.log("registering user...");
                e.uid = m.payload;
                HOST.users.push(e.uid);
                HOST.user_data[e.uid] = makeUserData();
                HOST.onuserjoin(e);
                if (HOST.view != ""){
                    console.log("sending user data...");
                    sendPacket("switch_view", "host", e.uid, HOST.view);
                    sendPacket("help_text", "host", e.uid, HOST.help);
                }
                break;
            case "user_deregister":
                e.uid = m.payload;
                HOST.users.splice(HOST.users.indexOf(e.uid), 1);
                delete HOST.user_data[e.uid];
                HOST.onuserleave(e);
                break;
        }

        HOST.onmessage(e);

    };
}

function sendPacket(t, s, d, p) {
    if (HOST.socket != undefined && HOST.socket.readyState == 1) {
        HOST.socket.send(JSON.stringify({"type": t, "source": s,
            "destination": d, "payload": p}));
    }
}

function broadcastPacket(t, s, p) {
    if (HOST.socket != undefined && HOST.socket.readyState == 1) {
        HOST.socket.send(JSON.stringify({"type": t, "source": s,
            "destination": "broadcast", "payload": p}));
        console.log("broadcast message?");
    }
}

function noop(e) {}

function makeUserData() {
    let u = {};
    u.left = false;
    u.right = false;
    u.up = false;
    u.down = false;
    return u;
}
