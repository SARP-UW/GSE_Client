require('dotenv').config()
var StaticServer = require('./static-server');
var Rocket = require('./simulate-rocket');
var RealtimeServer = require('./realtime-server');
var HistoryServer = require('./history-server');

var expressWs = require('express-ws');
var app = require('express')();
var sim_app = require('express')();
expressWs(sim_app);

var port = process.env.PORT

var staticServer = new StaticServer();
app.use('/', staticServer);

app.listen(port, function() {
    console.log('OpenMCT hosted at http://localhost:' + port);
})

if (process.env.MODE === "SIMULATE") {
    var rocket = new Rocket();
    var realtimeServer = new RealtimeServer(rocket);
    var historyServer = new HistoryServer(rocket);
    sim_app.use('/realtime', realtimeServer);
    sim_app.use('/history', historyServer);
}


if (process.env.MODE === "SIMULATE") {
    sim_port = process.env.SIMULATE_PORT
    sim_app.listen(sim_port, function () {
        console.log('History hosted at http://localhost:' + sim_port + '/history');
        console.log('Realtime hosted at ws://localhost:' + sim_port + '/realtime');
    })
}
