/*
 simulate_rocket.js simulates a small spacecraft generating telemetry.
*/

function Rocket() {
    // this.state = {
    //     "prop.fuel": 77,
    //     "prop.thrusters": "OFF",
    //     "comms.recd": 0,
    //     "comms.sent": 0,
    //     "pwr.temp": 245,
    //     "pwr.c": 8.15,
    //     "pwr.v": 30
    // };
    this.state = {
        "fc.he_bottle_pres": 779,
        "fc.n2o_bottle1_pre": 803,
        "fc.n2o_bottle2_pre": 608,
        "fc.n2o_line_pres": 534,
        "fc.connected": "CONNECTED",
        "fc.hard_armed": "HARD_DISARMED",
        "fc.soft_armed": "SOFT_DISARMED",
        "pc.connected": "CONNECTED",
        "pc.hard_armed": "HARD_DISARMED",
        "pc.soft_armed": "SOFT_DISARMED",
        "pc.n2o_tank_pres": 829,
        "pc.he_tank_pres": 432,
        "mfc.connected": "CONNECTED",
        "pc.combustion_chamber_pres": 381
    };
    this.history = {};
    this.listeners = [];
    Object.keys(this.state).forEach(function (k) {
        this.history[k] = [];
    }, this);

    setInterval(function () {
        this.updateState();
        this.generateTelemetry();
    }.bind(this), 1000);

    console.log("Welcome to pacific impulse");
    console.log("Press enter to toglle arm state");

    process.stdin.on('data', function () {
        if (this.state['fc.hard_armed'] === "HARD_DISARMED") {
            console.log("Armed!")
        } else {
            console.log("Disarmed!")
        }
        this.state['fc.hard_armed'] =
            (this.state['fc.hard_armed'] === "HARD_DISARMED") ? "HARD_ARMED" : "HARD_DISARMED"
        this.state['fc.soft_armed'] =
            (this.state['fc.soft_armed'] === "SOFT_DISARMED") ? "SOFT_ARMED" : "SOFT_DISARMED"
        this.state['pc.hard_armed'] =
            (this.state['pc.hard_armed'] === "HARD_DISARMED") ? "HARD_ARMED" : "HARD_DISARMED"
        this.state['pc.soft_armed'] =
            (this.state['pc.soft_armed'] === "SOFT_DISARMED") ? "SOFT_ARMED" : "SOFT_DISARMED"
        this.generateTelemetry();
    }.bind(this));
};

Rocket.prototype.updateState = function () {
    this.state["pc.combustion_chamber_pres"] = Math.min(
        1000,
        this.state["pc.combustion_chamber_pres"] + 
            (this.state["pc.hard_armed"] === "HARD_ARMED" ? Math.random() * 5 : 0)
    );
    this.state["pc.n2o_tank_pres"] = Math.min(
        1000,
        this.state["pc.n2o_tank_pres"] -
            (this.state["pc.hard_armed"] === "HARD_ARMED" ? Math.random() * 5 : 0)
    );
    this.state["pc.he_tank_pres"] = Math.min(
        1000,
        this.state["pc.he_tank_pres"] + 
            (this.state["pc.hard_armed"] === "HARD_ARMED" ? Math.random() * 5 : 0)
    );
    this.state["fc.he_bottle_pres"] = this.state["fc.he_bottle_pres"]
        + Math.sin(Math.random()-0.5);
    this.state["fc.n2o_bottle1_pre"] = this.state["fc.n2o_bottle1_pre"]
        + Math.sin(Math.random()-0.5);
    this.state["fc.n2o_bottle2_pre"] = this.state["fc.n2o_bottle2_pre"]
        + Math.sin(Math.random()-0.5);
    this.state["fc.n2o_line_pres"] = this.state["fc.n2o_line_pres"]
        + Math.sin(Math.random()-0.5);
    // if (this.state["prop.thrusters"] === "ON") {
    //     this.state["pwr.c"] = 8.15;
    // } else {
    //     this.state["pwr.c"] = this.state["pwr.c"] * 0.985;
    // }
    // this.state["pwr.v"] = 30 + Math.pow(Math.random(), 3);
};

/**
 * Takes a measurement of spacecraft state, stores in history, and notifies 
 * listeners.
 */
Rocket.prototype.generateTelemetry = function () {
    var timestamp = Date.now(), sent = 0;
    Object.keys(this.state).forEach(function (id) {
        var state = { timestamp: timestamp, value: this.state[id], id: id};
        this.notify(state);
        this.history[id].push(state);
        // this.state["comms.sent"] += JSON.stringify(state).length;
    }, this);
};

Rocket.prototype.notify = function (point) {
    this.listeners.forEach(function (l) {
        l(point);
    });
};

Rocket.prototype.listen = function (listener) {
    this.listeners.push(listener);
    return function () {
        this.listeners = this.listeners.filter(function (l) {
            return l !== listener;
        });
    }.bind(this);
};

module.exports = function () {
    return new Rocket()
};