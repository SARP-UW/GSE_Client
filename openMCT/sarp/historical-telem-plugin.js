function HistoricalTelemetryPlugin() {
    return function install (openmct) {
        var provider = {
            supportsRequest: function (domainObject) {
                return domainObject.type === 'sarp.telemetry';
            },
            request: function (domainObject, options) {
                var url = "http://localhost:"
                if (window._env_.MODE === "SIMULATE") {
                    url += window._env_.SIMULATE_PORT
                } else {
                    url += window._env_.IGS_HISTORY_PORT
                }
                url += '/history/' + 
                    domainObject.identifier.key +
                    '?start=' + options.start +
                    '&end=' + options.end;
                return fetch(url).then(resp => resp.json())
            }
        };
    
        openmct.telemetry.addProvider(provider);
    }
}