//let subscribeMsg = "subscribe fc_state prop_state fc_hard_armed fc_soft_armed prop_hard_armed prop_soft_armed"
let subscribeMsg = "subscribe fc_state fc_hard_armed fc_soft_armed pc_state pc_soft_armed pc_hard_armed"

let socket = new WebSocket("ws://localhost:12345");
let EXPECTED_FIELDS = ["fc_state", "pc_state", "fc_hard_armed", "fc_soft_armed", "pc_hard_armed",
                  	   "pc_soft_armed"];
let state = {"fc_state":-1, "pc_state":-1, "fc_hard_armed":-1, "fc_soft_armed":-1, "pc_hard_armed":-1,
                  	   "pc_soft_armed":-1};
let delay = 500
// !!! switched 1 and 0
let control_map = {
	"BV-01": {
		"command_str": "send fc 0",
		"statefield": "fc_state",
		"idx": 0},
	"BV-02": {
		"command_str": "send fc 1",
		"statefield": "fc_state",
		"idx": 1},
	"BV-03": {
		"command_str": "send fc 2",
		"statefield": "fc_state",
		"idx": 2},
	"BV-04": {
		"command_str": "send fc 3",
		"statefield": "fc_state",
		"idx": 3},
	"BV-05": {
		"command_str": "send fc 4",
		"statefield": "fc_state",
		"idx": 4},
	"BV-06": {
		"command_str": "send fc 5",
		"statefield": "fc_state",
		"idx": 5},
	"BV-07": {
		"command_str": "send fc 6",
		"statefield": "fc_state",
		"idx": 6},
	"BV-08": {
		"command_str": "send fc 7",
		"statefield": "fc_state",
		"idx": 7},
	"fuel_vent": {
		"command_str": "send fc 8",
		"statefield": "fc_state",
		"idx": 8},
	"arm_fill": {
		"command_str": "send fc arm",
		"statefield": "fc_soft_armed",
		"idx": -1},
	"arm_prop": {
		"command_str": "send pc arm",
		"statefield": "pc_soft_armed",
		"idx": -1},
	"int_pwr": {
		"command_str": "send pc 4",
		"statefield": "pc_state",
		"idx": 4},
	"ox_vent": {
		"command_str": "send pc 2",
		"statefield": "pc_state",
		"idx": 2},
	"fire": {
		"command_str": "send pc fire 1",
		"statefield": "fire",
		"idx": -1},
	// "pulse_BV-01": {
	// 	"command_str": "send fc pulse 0",
	// 	"statefield": "fc_state",
	// 	"idx": 0},
	// "pulse_BV-02": {
	// 	"command_str": "send fc pulse 1",
	// 	"statefield": "fc_state",
	// 	"idx": 1},
	// "pulse_BV-03": {
	// 	"command_str": "send fc pulse 2",
	// 	"statefield": "fc_state",
	// 	"idx": 2},
	// "pulse_BV-04": {
	// 	"command_str": "send fc pulse 3",
	// 	"statefield": "fc_state",
	// 	"idx": 3},
	// "pulse_BV-05": {
	// 	"command_str": "send fc pulse 4",
	// 	"statefield": "fc_state",
	// 	"idx": 4},
	// "pulse_BV-06": {
	// 	"command_str": "send fc pulse 5",
	// 	"statefield": "fc_state",
	// 	"idx": 5},
	// "pulse_BV-07": {
	// 	"command_str": "send fc pulse 6",
	// 	"statefield": "fc_state",
	// 	"idx": 6},
	// "pulse_BV-08": {
	// 	"command_str": "send fc pulse 7",
	// 	"statefield": "fc_state",
	// 	"idx": 7},
	"pulse_relay-04": {
		"command_str": "send pc pulse 4",
		"statefield": "pc_state",
		"idx": 4},
	// "pulse_BV-02": {
	// 	"command_str": "send fc pulse 1",
	// 	"statefield": "fc_state",
	// 	"idx": 1},
	// "pulse_BV-03": {
	// 	"command_str": "send fc pulse 2",
	// 	"statefield": "fc_state",
	// 	"idx": 2},
	// "pulse_BV-04": {
	// 	"command_str": "send fc pulse 3",
	// 	"statefield": "fc_state",
	// 	"idx": 3},
	// "pulse_BV-05": {
	// 	"command_str": "send fc pulse 4",
	// 	"statefield": "fc_state",
	// 	"idx": 4},
	// "pulse_BV-06": {
	// 	"command_str": "send fc pulse 5",
	// 	"statefield": "fc_state",
	// 	"idx": 5},
	// "pulse_BV-07": {
	// 	"command_str": "send fc pulse 6",
	// 	"statefield": "fc_state",
	// 	"idx": 6},
	// "pulse_BV-08": {
	// 	"command_str": "send fc pulse 7",
	// 	"statefield": "fc_state",
	// 	"idx": 7},
	// "pulse_fuel_vent": {
	// 	"command_str": "send fc pulse 8",
	// 	"statefield": "fc_state",
	// 	"idx": 8},
	"pulse_ox_vent": {
		"command_str": "send pc pulse 2",
		"statefield": "pc_state",
		"idx": 2}
};
				

socket.onopen = function(e) {
	//alert("Connection established.");
	socket.send(subscribeMsg);
};

// Returns the boolean state of a state element
function getElementState(id) {
	if (id == "fire") {
		return 0; // fire has no state
	}
	elementState = state[control_map[id]["statefield"]];
	if (Array.isArray(elementState)) {
		// This is a relay state field, get the element
		elementState = state[control_map[id]["statefield"]][control_map[id]["idx"]];
	}
	return elementState;
}

function commandHandler(id) {
    if (id.startsWith("pulse")) {
        request = control_map[id]["command_str"] + " " + String(delay);
    } else {
        elementState = getElementState(id);
        if (elementState == -1) {
            alert("No state data for " + id);
        }
        // request the opposite of current element state
        desiredElementState = (elementState == 0) ? 1 : 0;
        request = control_map[id]["command_str"] + " " + String(desiredElementState);
    }
	socket.send(request);
	console.log(request);
}

function setDelay(id) {
    delay = document.getElementById("pulse_delay").value;
    document.getElementById("curr_delay").innerHTML = "Delay: "+ String(delay) + " (ms)";
}

function setButtonColor(id, color0, color1, colorInval="grey") {
	let elementState = getElementState(id);
	if (elementState == -1) {
		console.log('this thing:' + id);
		document.getElementById(id).style.backgroundColor = colorInval;
	}
	else if (elementState == 0) {
		document.getElementById(id).style.backgroundColor = color0;
	}
	else if (elementState == 1) {
		document.getElementById(id).style.backgroundColor = color1;
	}
	else {
		//alert("State error: " + id + " state " + elementState);
	}
}

function setButtonColors() {
	for (const [id, info] of Object.entries(control_map)) {
		if (id == "BV-05" || id == "BV-07" || id == "BV-08" || id == "BV-06") {
			setButtonColor(id, "green", "white");
		}
		else if (id == "int_pwr") {
			setButtonColor(id, "yellow", "blue");
		}
		else if (id == "submit_delay") {
		}
		// FIXME!!!
		else if (id == "BV-02") {
			setButtonColor(id, "grey", "grey");
		}
		else {
			setButtonColor(id, "white", "green");
		}
	}
}

socket.onmessage = function(e) {
	let data = JSON.parse(e.data);
	//console.log(data)
	data = data["value"]
	// console.log(data)
	for (let i=0; i < EXPECTED_FIELDS.length; i++) {
		if (data.hasOwnProperty(EXPECTED_FIELDS[i])) {
			// Update state if data exists
			state[EXPECTED_FIELDS[i]] = data[EXPECTED_FIELDS[i]]
		}
		else {
			// No data for this field exists
			state[EXPECTED_FIELDS[i]] = -1;
		}
	}
	setButtonColors();
	console.log(state);
};

socket.onerror = function(error) {
  alert(`[error] ${error.message}`);
};
