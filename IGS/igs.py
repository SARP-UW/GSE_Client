import threading
import socket
import time
import queue
import logging
from resources import Resource
from websocket_server import WebsocketServer
from fill_codec import FillTelemCodec
from prop_codec import PropTelemCodec
# from sarp_utils.fill_telem_codec import FillTelemCodec
# from sarp_utils.fill_command_codec import FillCommandCodec
# from sarp_utils.prop_telem_codec import PropTelemCodec
# from sarp_utils.prop_command_codec import PropCommandCodec
from sarp_utils.flight_data_codec import FlightDataCodec
from data_codec import DataCodec
from sarp_utils.network_node import SendNode, ReceiveNode
from sarp_utils.bitfield_utils import Utils
import json
import pdb
from time import sleep
from flask import Flask, request, Response, jsonify

app = Flask(__name__)

# Telemetry Receiver to receive telemetry from prop controller
# and fill controller and upate the stored telem
class TelemetryReceiver:
    def __init__(self, bind_addr, codec, resources):
        self.tlm_receiver = ReceiveNode(bind_addr, codec)
        self.resources = resources
        threading.Thread(target=self.service_tlm).start()

    def service_tlm(self):
        count = 0
        while True:
            # receive telem
            frame, src_addr = self.tlm_receiver.receive()
            if frame is not None:
                self.resources.update(frame)
                count += 1
                debug = "Framecount: " + str(count) + "\nFrame: " + str(frame)
                print("Frame " + str(count) + " from " + str(src_addr) + " received at " + str(time.time()))
                print(debug)
                print()


# a websocket server listening to input from client 
# client can send command to controllers or subscribe to telemetry
class WSServer:
    def __init__(self, resource, queue):
        self.resource = resource
        self.queue = queue
        self.subscribe_map = {}
        server = WebsocketServer(12345, host='127.0.0.1', loglevel=logging.INFO)
        server.set_fn_message_received(self.on_message)
        server.set_fn_client_left(self.client_left)
        webSocketServer = threading.Thread(target=self.start_server, args=(server,))
        webSocketServer.start()

    def client_left(self, client, server):
        if client['id'] in self.subscribe_map:
            self.subscribe_map[client['id']] = "STOP"

    def on_message(self, client, server, message):
        # receive message from client here
        token = message.split(" ")
        if token[0] == "subscribe":
            print("hello new subscriber")
            threading.Thread(target=self.send_telem_to_client, args=(client, server, token[1:])).start()
        elif token[0] == "send":
            self.queue.put(token[1:])  # TODO: we should adhere to token[1:] = [controller_state_id, command_channel, command]
        else:
            print("Can't recognize command: " + str(token))

    def start_server(self, server):
        server.run_forever()

    # telem is a list of telemetry client wants to subscribe
    def send_telem_to_client(self, client, server, telem):
        if client['id'] in self.subscribe_map and self.subscribe_map[client['id']] != "STOP":
            self.subscribe_map[client['id']].append(telem)
        else:
            self.subscribe_map[client['id']] = [telem]
            # count = 0
            while True:
                # add a lock for subscribe_map to avoid race condition?
                telems = self.subscribe_map[client['id']]
                # resource_lock.acquire()
                # get telem resource accordingly
                # resource_lock.release()
                if telems == "STOP": break

                for telem in telems:
                    # send each telem point to client
                    # server.send_message(client, json.dumps(self.resource.pa))
                    #print(telem)
                    if (len(telem) == 1):
                        telem = telem[0]
                        data = self.resource.get_single(telem)
                    else:
                        data = self.resource.get(telem)
                    server.send_message(client, json.dumps(self.resource.pack_subscriber_telem(telem, data)))
                    # print(str(self.resource.pack_subscriber_telem(telem, data)))

                
                #server.send_message(client, json.dumps(datas))
                # server.send_message(client, json.dumps(self.resource.pack_subscriber_telem(telem, datas)))
                # print(str(self.resource.pack_subscriber_telem(telem, datas)))

                #server.send_message(client, {"foo":1})
                # server.send_message(client, "The count is " + str(count))
                # print("server echo")
                # count += 1
                time.sleep(.5)

# send command to fill controller or prop controller
def send_command(resource, q, command_map):
    while True:
        command = q.get() # blocks until queue != empty
        cmd_target = command[0]
        channel = command[1]
        value = int(command[2])
        # if cmd_target in command_map and (value == 1 or value == 0):
        if cmd_target in command_map:
            #print("received")
            state_request = {}
            state = resource.get_single(command_map[cmd_target][1])
            if state is not None:
                if cmd_target == 'pc' and channel == 'fire':
                        state_request[command_map[cmd_target][6]] = True
                        state_request[command_map[cmd_target][2]] = resource.get_single(command_map[cmd_target][2])
                        state_request[command_map[cmd_target][1]] = Utils.num(state) # maintain current relay state
                        state_request[command_map[cmd_target][3]] = resource.get_single(command_map[cmd_target][3]) #maintain redlines state
                        print(resource.get_single(command_map[cmd_target][3]))
                elif channel == 'arm':
                    state_request[command_map[cmd_target][2]] = value
                    state_request[command_map[cmd_target][1]] = Utils.num(state) # maintain current relay state
                    state_request[command_map[cmd_target][3]] = resource.get_single(command_map[cmd_target][3]) #maintain redlines state
                elif channel == 'pulse':
                    state_request[command_map[cmd_target][2]] = resource.get_single(command_map[cmd_target][2]) # maintain arm state
                    state_request[command_map[cmd_target][1]] = Utils.num(state) # maintain current relay state
                    state_request[command_map[cmd_target][3]] = resource.get_single(command_map[cmd_target][3]) #maintain redlines state
                    state_request[command_map[cmd_target][4]] = value
                    pulse_delay = int(command[3])
                    state_request[command_map[cmd_target][5]] = pulse_delay
                elif int(channel) <= 13:
                    channel = int(channel)
                    state_request[command_map[cmd_target][2]] = resource.get_single(command_map[cmd_target][2]) # maintain arm state
                    state_request[command_map[cmd_target][3]] = resource.get_single(command_map[cmd_target][3])
                    state[channel] = value
                    state_request[command_map[cmd_target][1]] = Utils.num(state)
                    
                else:
                    print("Some kind of error")

                if channel != 'pulse':
                    # fill pulse fields
                    state_request[command_map[cmd_target][4]] = -1
                    state_request[command_map[cmd_target][5]] = 0

                if cmd_target == 'pc' and channel != 'fire':
                    # This is not a fire command, but we must fill the field
                    state_request[command_map[cmd_target][6]] = False

                print("Sending state request")
                # state_request["fc_redlines_armed"] = True
                print(state_request)
                command_map[cmd_target][0].send(state_request)
                print("-------")
                print("command target: ", command_map[cmd_target][0])
                print("---------")
            else:
                print("No state data to modify.")
        q.task_done()
        
@app.route("/history/<telem_id>")
def get_history_telem(telem_id):
    # spin up a server to return old telemetry
    #openMCT requesting past telem, okay to return empty set of telem
    start = request.args.get('start')
    end = request.args.get('end')
    # get historical data based on telem_id, start, end

    result = json.dumps([])
    resp = Response(response=result, status=200)
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp

if __name__ == "__main__":
    pc_cmd_addr = ('10.0.1.2', 31002)
    pc_cmd_bind_addr = ('', 31001)
    pc_tlm_bind_addr = ('', 31000)
    #fc_cmd_addr = ('192.168.1.69', 30001)
    fc_cmd_addr = ('10.0.1.2', 30001)
    fc_cmd_bind_addr = ('', 30001)
    fc_tlm_bind_addr = ('', 30000)
    fd_tlm_bind_addr = ('', 29000)
    resource = Resource()
    # receivers = [TelemetryReceiver(fc_tlm_bind_addr, DataCodec("telemetry"), resource),
    #              TelemetryReceiver(fd_tlm_bind_addr, FlightDataCodec(), resource),
    #              TelemetryReceiver(pc_tlm_bind_addr, DataCodec("telemetry"), resource)]

    receivers = [TelemetryReceiver(fc_tlm_bind_addr, FillTelemCodec(), resource),
                 TelemetryReceiver(fd_tlm_bind_addr, FlightDataCodec(), resource),
                 TelemetryReceiver(pc_tlm_bind_addr, PropTelemCodec(), resource)]

    # maps cmd_targets (received via websocket to sendNodes) to a tuple of SendNode, stateID (for pulling status)
    command_map = {"fc": (SendNode(fc_cmd_bind_addr, fc_cmd_addr, DataCodec("command")), "fc_state", "fc_soft_armed", "fc_redlines_armed", "fc_pulse", "fc_pdelay"),
                   "pc": (SendNode(pc_cmd_bind_addr, pc_cmd_addr, DataCodec("command")), "pc_state", "pc_soft_armed", "pc_redlines_armed", "pc_pulse", "pc_pdelay", "pc_fire")}
    q = queue.Queue()
    threading.Thread(target=send_command, args=(resource, q, command_map)).start()

    # server websocket server
    ws = WSServer(resource, q)

    # Turn off logging for flask (flask has tons of logging)
    # Since we're not really using history telem endpoint at this point, 
    # it is okay to disable the log from flask.
    app.logger.disabled = True
    log = logging.getLogger('werkzeug')
    log.disabled = True

    # serve telemetry end point
    app.run(port='23456')
