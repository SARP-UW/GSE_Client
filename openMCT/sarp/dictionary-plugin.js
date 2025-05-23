function getDictionary() {
    return fetch('./sarp/dictionary.json')
            .then(response => response.json());
}

var objectProvider = {
    get: function (identifier) {
        return getDictionary().then(function (dictionary) {
            if (identifier.key === 'spacecraft') {
                return {
                    identifier: identifier,
                    name: dictionary.name,
                    type: 'folder',
                    location: 'ROOT'
                };
            } else {
                var measurement = dictionary.measurements.filter(function (m) {
                    return m.key === identifier.key;
                })[0];
                console.log(measurement);
                return {
                    identifier: identifier,
                    name: measurement.name,
                    type: 'sarp.telemetry',
                    telemetry: {
                        values: measurement.values
                    },
                    location: 'sarp.rocket:spacecraft'
                };
            }
        });
    }
}

var compositionProvider = {
    appliesTo: function (domainObject) {
        return domainObject.identifier.namespace === 'sarp.rocket' &&
               domainObject.type === 'folder';
    },
    load: function (domainObject) {
        return getDictionary()
            .then(function (dictionary) {
                return dictionary.measurements.map(function (m) {
                    return {
                        namespace: 'sarp.rocket',
                        key: m.key
                    };
                });
            });
    }
};

function DictionaryPlugin() {
    return function install(openmct) {
        openmct.objects.addRoot({
            namespace: 'sarp.rocket',
            key: 'spacecraft'
        });

        openmct.objects.addProvider('sarp.rocket', objectProvider);

        openmct.composition.addProvider(compositionProvider);

        openmct.types.addType('sarp.telemetry', {
            name: 'SARP Telemetry Point',
            description: 'Example telemetry point for our rocket.',
            cssClass: 'icon-telemetry'
        });

    }
}