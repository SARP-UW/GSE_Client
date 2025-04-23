# openMCT (version: v1.4.1)


## Config
- Add environment variables into `.env` to import in the codebase
- If `MODE=SIMULATE` in `.env`, it will start simulate server in port `SIMULATE_PORT` and 
openMCT will fetch data from `localhost:<SIMULATE_PORT>`.

## Run
1. Ensure the script `env.sh` has the permission to run.
```
chmod 777 env.sh
```
2. Run the code.
```
npm start
```


## Update openMCT

We pointed the webapp to v1.4.1 openMCT in `dist` and will **not** keep up to date with upstream openMCT repository until the new version is confirmed to be working. Therefore, openMCT version will be updated manually.

1. Do `npm install` (Remove the original `node_module` if needed)
2. Find `node_modules/openMCT/dist`
3. Replace the `dist` in root directory with the one in `node_modules`

Make sure to test thoroughly before updating openMCT. One way to test it is to point the script and asset to `node_modules/openMCT/dist` in `index.html` and launch openMCT. 

## Simulate Server
The current simulation server produces mock data and allows client (openMCT) to fetch data. Need to manually add new data points in the simulate server if needed (When we update `sarp/dictionary.json`).

Only need to change `server/simulate-rocket.js` if we want to add more data points. There's no need to change `realtime-server.js` and `history-server.js` unless we're changing the interface of the aggregator.

## Historical Telemetry
openMCT gets historical telemetry by fetching from `localhost:<data source port>/history/` with two parameters `start` and `end` with the value being the timestamps. 

## Realtime Telemetry
openMCT sends `subscirbe <telem id>` to `ws://localhost:<data source port>/realtime/`, expecting the server to return the telemetry of `telem id` periodically. openMCT sends `unsubscirbe <telem id>` to unsubscirbe.