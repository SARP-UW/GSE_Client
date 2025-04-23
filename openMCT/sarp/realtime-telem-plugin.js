function RealtimeTelemetryPlugin() {
    return function (openmct) {
        var url = "ws://localhost:"
        if (window._env_.MODE === "SIMULATE") {
            url += window._env_.SIMULATE_PORT
        } else {
            url += window._env_.IGS_REAL_TIME_PORT
        }
        url += "/realtime"
        var socket = new WebSocket(url);
        var listener = {};
    
        socket.onmessage = function (event) {
            point = JSON.parse(event.data);
            if (listener[point.id]) {
                listener[point.id](point);
            }
        };
        
        var provider = {
            supportsSubscribe: function (domainObject) {
                return domainObject.type === 'sarp.telemetry';
            },
            subscribe: function (domainObject, callback) {
                listener[domainObject.identifier.key] = callback;
                socket.send('subscribe ' + domainObject.identifier.key);
                return function unsubscribe() {
                    delete listener[domainObject.identifier.key];
                    socket.send('unsubscribe ' + domainObject.identifier.key);
                };
            }
        };
        
        openmct.telemetry.addProvider(provider);
    }
}