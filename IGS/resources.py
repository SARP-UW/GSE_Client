import threading
import time
import pdb
from sarp_utils.bitfield_utils import Utils

class Resource:
    def __init__(self):
        self.lock = threading.Lock()
        self.state = {}
        self.history = []

    def update(self, new_telem):
        '''
        arg: a list of tuples of (id, data) to update

        id does not need to exist before the update
        '''
        self.history.append(self.state)
        self.lock.acquire()
        # what is new telem? a dict or a list
        # assuming a list of tuples
        for id in new_telem:
            #if (type(new_telem[id] == float)):
                # Create unfiltered rate telem items for all float data
                # !!! This is based on received timestamp 

            self.state[id] = new_telem[id]
            if (id == "fc_state" or id == "pc_state"):
                # Unpack states into separate fields for granular subscriber access
                state = Utils.bitfield(new_telem[id])
                for i in range(0, len(state)):
                    self.state[id + "_" + str(i)] = state[i]

        self.lock.release()

    def pack_subscriber_telem(self, id, value):
        # Formats with IGS timestamp and required OpenMCT pieces
        # NOTE: Timestamp comes from IGS, for device timestamp access field
        return {"timestamp": int(time.time() * 1000), "value": value, "id": id}

    def get(self, ids):
        '''
        arg: a list of telemetry ids wanted
            or "all_state"

        return: a dict of id:data
            or for "all_state" {"fc_state":[relay_states], "prop_state":[relay, states], "fc_soft_armed":?,
            "fc_hard_armed":?, "prop_soft_armed":?, "prop_hard_armed":?}
        '''
        self.lock.acquire()
        result = {}

        for id in ids:
            if id not in self.state:
                # print(f"{id} does not exist in resource.")
                continue
            result[id] = self.state[id]
            if (id == "fc_state" or id == "pc_state"):
                result[id] = Utils.bitfield(result[id])
        self.lock.release()
        return result

    def get_single(self, id):
        self.lock.acquire()
        if id not in self.state:
            # print(f"{id} does not exist in resource :(")
            res = None
        else:
            res = self.state[id]
            if (id == "fc_state" or id == "pc_state"):
                res = Utils.bitfield(res)
        self.lock.release()
        return res


    def get_history(self):
        print("to be refined")
        return self.history
