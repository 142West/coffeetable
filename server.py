import asyncio
from concurrent.futures import ThreadPoolExecutor

import collections
import random
import json
import run

from sanic import Sanic
from sanic.response import text
from sanic.websocket import WebSocketProtocol


user_tuple = collections.namedtuple("user_tuple", ["id", "ws"]) ## Not necessary?

user_index = {}
host_socket = None

app = Sanic("CoffeetableApp")

def assign_user_id():#websocket):
    color = random.randint(0, 0xFFFFFF)
    while (not color_acceptable(color)):
        color = random.randint(0, 0xFFFFFF)
    new_id = '#' + ("000000" + hex(color)[2:])[-6:]
    return new_id

def color_acceptable(color):
    R = color >> 16
    G = color >> 8 & 255
    B = color & 255
    brightness = R + G + B
    avg = (R + G + B) / 255
    sat = abs(R - avg) + abs(G - avg) + abs(B - avg)

    if brightness < 30 or brightness > 600: # nothing too white or too black
        return False
    if sat < 200:   # nothing too gray
        return False
    for c in user_index.keys(): # avoid colors too similar to existing ones
        Rc = int(c[2:3], 16)
        Gc = int(c[4:5], 16)
        Bc = int(c[6:7], 16)
        diff = abs(Rc - R)
        diff += abs(Gc - G)
        diff += abs(Bc - B)
        if diff < 80:
            return False

    return True

def make_packet(src, typ, dst, pld):
    return {
            "source": src,
            "type": typ,
            "destination": dst,
            "payload": pld
            }

#OUTBOUND

async def send_json(socket, data):
    await socket.send(json.dumps(data))

async def recv_json(socket):
    packet = await socket.recv()
    return json.loads(packet)

async def broadcast(typ, pld):
    #TODO MAKE THIS LESS JANK?
    #tasks = []
    #executor = ThreadPoolExecutor(len(user_index))
    #loop = asyncio.get_event_loop();
    print("broadcasting...")
    for uid in user_index.keys():
        packet = make_packet("server", typ, uid, pld);
        await send_json(user_index[uid], packet);
        #executor.submit(user_index[uid].send, json.dumps(packet))
        #executor.submit(send_json, user_index[uid], packet)
        #loop.run_in_executor(executor, send_json(user_index[uid], packet))
    #await executor.shutdown()

## INBOUND

async def serve_connect(request, socket):
    global host_socket, user_index
    print("Processing user connection...")
    # generate ID
    uid = assign_user_id()
    user_index[uid] = socket
    try:
        print("Informing client...")
        # inform client
        response_packet = make_packet("server", "user_register", uid, uid)
        await send_json(socket, response_packet)

        # inform server
        if host_socket is not None and host_socket.open:
            print("Informing server...")
            register_packet = make_packet("server", "user_register", "host", uid)
            await send_json(host_socket, register_packet)
        
        # send page list
        pages_packet = make_packet("server", "page_list", uid, app.config.TABLE.pages)
        await send_json(socket, pages_packet)

        # send selected page
        page_pack = make_packet("server", "page_select", uid, app.config.TABLE.current_page);
        await send_json(socket, page_pack)
        print("sent selected page packet");

        # handle comms
        print("Starting watch loop...")
        while True:
            packet = await recv_json(socket)

            if packet["destination"] == "host" and host_socket is not None and host_socket.open:
                await send_json(host_socket, packet)

            elif packet["destination"] == "server":
                if packet["type"] == "load_page":
                    if app.config.TABLE.load_page(packet["payload"]) != None:
                        await broadcast("page_select", packet['payload'])
                # TODO HANDLE REQUESTS TO SERVER

    finally:
        print(f"User {uid} disconnected.")
        print("Removing from user index...")
        del(user_index[uid])
        print("Informing server...")
        if host_socket is not None and host_socket.open:
            deregister_packet = make_packet("server", "user_deregister", "host", uid)
            await send_json(host_socket, deregister_packet)

async def serve_host_connect(request, socket):
    global host_socket, user_index
    # TODO check for permission
    if (socket.remote_address[0] != socket.local_address[0]):
        print("HOST CONNECTION FAILED: INVALID AUTHENTICATION")
        await socket.close()
        return
    host_socket = socket
    try:
        for uid in user_index.keys():
            register_packet = make_packet("server", "user_register", "host", uid)
            await send_json(socket, register_packet)

        while True:
            packet = await recv_json(socket)

            if packet["destination"] in user_index.keys(): # passthrough to client
                await send_json(user_index[packet["destination"]], packet)

            elif packet['destination'] == "broadcast":
                await broadcast(packet["type"], packet["payload"]);

            elif packet["destination"] == "server": # host wants something from server
                pass # TODO HANDLE THE SERVER REQUEST?
    finally:
        print("HOST DISCONNECTED")
        #host_socket = None
        # inform users of the hosts's passing?

@app.main_process_start
async def start_runner(app, loop):
    app.config.TABLE = run.TableRunner()

def init():
    app = Sanic.get_app("CoffeetableApp")

    app.static("/","static")
    app.static("", "static/index.html")

    app.add_websocket_route(serve_connect, "/connect")
    app.add_websocket_route(serve_host_connect, "/hostconnect")

    app.run(host="0.0.0.0", port=8081, protocol=WebSocketProtocol, debug=False, workers=1)

if __name__ == "__main__":
    init()
