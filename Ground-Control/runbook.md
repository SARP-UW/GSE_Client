# Pacific Impulse Avionics Runbook

Runbook for most software related setup in the field. Use to supplement checklists.

## Software Install

See Launch Ops software install documentation, this document has many similarities: https://app.nuclino.com/SARP/Avionics/Launch-Ops-Software-Setup-ae75aa6b-415f-4b96-8396-1f12c8822c7a

Ground Control will need to have IGS, Ground Control and OpenMCT cloned onto the local computer.

## Network Configuration

In the field, we'll use the SARPNET router downstairs by the controllers and SARPNET 2 by ground control. 

All controllers, boards and cameras have static IP addresses in the router. These are configured as follows:

- Fill Controller: 10.0.1.1
- MFC: 10.0.1.2
- Propulsion Controller: 10.0.1.3
- Flight Data: 10.0.1.4
- Yagi Pi Zero: 10.0.1.5
- Wyze Cameras: 10.0.1.10, 10.0.1.11, 10.0.1.12

Personal devices including the ground control laptop, etc will start binding at addresses starting at 10.0.1.100. To check network configuration, log into **tplinkwifi.net**, which will show all connected devices. 

Additionally, the Integrated Ground System (IGS) has receiving node IP addresses coded into igs.py. If the IP addresses need to change or be debugged, refer to igs.py to change the IP addresses for the two Launch Ops controllers.

# Running Ground Control

## Start up the Integrated Ground System (IGS)

Start up IGS by running the igs.py script. This opens the webserver receiving and sending telemetry from ground control. You should see the message indicating igs is running. `INFO:websocket_server:Listening on port 12345 for clients..`

If any controllers are running, you should see telemetry packets printing in the console.

## Start up the Ground Control Interface
Navigate to the Ground Control directory and open up `index.html` in your browser. All the buttons should start grey. If any controllers are connected, the corresponding control buttons will light up white.
## Start up OpenMCT dashboards

Once Ground Control is running, start up the OpenMCT dashboard. In the OpenMCT directory, run the command `npm start`. If you're having trouble running this command, make sure `npm` is properly installed. Otherwise, you may need to change `package.json` to reflect your operating system:
    Mac: 			`"start": "./env.sh && node server/server.js"` 
    Windows:	 `"start": "env.sh && node server/server.js"`

In OpenMCT, open up your telemetry template with all the graphs you'd like to have displayed. You shouldn't see anything on the graphs at this point, unless your controllers are connected. If data is coming in (you should see this in IGS), you'll see the data points displayed on the graph.

See the tutorials or official openMCT documentation here: https://nasa.github.io/openmct/documentation/

## Start Controllers + Flight Data

With Ground Control now running, we'll need to start the various controllers. At the time of writing, the various controllers do not run their corresponding scripts on start up. This is for ease of debugging, but we'll need to start the controllers manually.

After powering on the controllers, we'll need to `ssh` into them to start the scripts. For example, to start the Fill Controller, we'll do the following:
`ssh pi@10.0.1.1`
The password is `raspberry`. Navigate to the `controller` directory and run `controller.py`. This will start the controller script and we should start to see the packets being sent in our terminal window. These should be mirrored in the IGS console. We'll see the graphs in openMCT start streaming data and the ground control interface should light up.

Start the remaining controllers and flight data board in the same fashion. If we aren't seeing incoming data, check the controllers are properly connected to the network in the router and debug from there. 

**Notes from experience**
- The controllers send data to a specific IP address (located in `addresses.json`). Make sure this is the same IP as your ground control computer. Generally the first computer to connect to the network will take the spot of 10.0.100, which should be the default configuration. It's generally easier to change the target IP than to change the GC computer address.

## Camera Setup

The Wyze cameras should auto connect to the network when powered. We can verify they're properly streaming by connecting to the RTSP streams. We can view these in VLC media player (or other media players) by connecting to the network stream. See the following RTSP addresses:

rtsp://sarpcam:sarpcam@10.0.1.10/live
rtsp://sarpcam:sarpcam@10.0.1.11/live
rtsp://sarpcam:sarpcam@10.0.1.12/live

The high speed camera should also offer an RTSP stream, although it will not have a fixed IP like theses cameras. You'll need to find the IP address in the router config.

# Fill & Fire Procedures
**Note on controller configuration:**
Propulsion and Avionics teams should verify controller valve configuration prior to all operations. These are are defined the controller directories.Make sure the correct behaviors are 100% accurate before pressure operations.

These are defined in the various JSON files in the controller directories. Recommend a deep dive into how these are configured. Check these during your dry run tests.


**Software and Hardware Arming:**

Software arming is done from the Ground Control interface. Software should be disarmed whenever someone is working on the system. Software disarm prevents any user at ground control from interacting with any buttons to change the system state.

Hardware arm allows power to flow through to the relays on the fill stand. Arming will close any powered close valves on the stand. **NOTE**: Careful when hardware disarming the system, as it will open these powered close valves and let residual pressure in the system vent.

## Valve Actuation Tests

- Software arm and check all relays properly actuate (relays should click and LED lights up)
- Software arm and hardware arm. Check all valves actuate properly from ground control. 
- Run through mock fill/fire procedure with correct valve order
- Check igniter relay circuits + timing
- Modify the network timeout in `controller.py` to a shorter duration than 10 minutes. Disconnect the network and verify the correct safe state. Reminder to reset the network timeout afterwards.

# Notes (Please read)

Lots of small mistakes made over the years, not everything can be kept track of easily. Keep a list of some sort to ease diagnosing weird situations that you might have run into before.

## If you're unsure about anything, speak up
Avionics engineers in the ground control room should have a good understanding of the details of the fill procedures from the Propulsion point of view. I recommend that the person pressing the buttons on the control console verbally repeat all commands as they happen. Furthermore, if something doesn't match with your expectations, call it out.

## How to break electronics 101
Make sure everything is waterproof, if it rains, you need a contingency plan other than to scrap the day. Don't try to fix electronics if you can't ensure it's dry.

Be really really careful with red/black. Don't cause a short. Especially on the launch ops batteries, make sure red to red and black to black. This is how we broke the Launch Ops board last year and it took us too much effort to fix.

Be careful when probing! Check the diagram if you're unsure, get a second opinion. It's really easy to cause shorts. Virtually everyone on Avionics has done it in the past, almost every single lead in the past few years has broken something. 

## Checklists!!!
Prior to leaving to site, check the following:
- Charge camera batteries and controller batteries

Prior to fill/fire, check:
- Generator fuel levels

## Pulse valve (don't pulse for too long)
We added a handy pulse valve feature that allows us to do precise timed open/close. This gets around any possible network/system latency. Input the desired pulse duration. Pressing any of the buttons in the pulse menu will open/close the valve after the desired duration. We use this to slowly add or vent the system. 
**Note:** For longer pulses (5000 ms+?), just open and close the valve manually. Pulsing is currently implemented using system sleep, which messes with the sensor suite if sleeping for too long. Keep pulse duration short. You'll see that the controller script crashes if you do this.

## Controller recovery + network autosafe
Sometimes you might disconnect from the controller due to some bug. Last year we only ran into this when we did the above pulse procedure for too long, which crashed the script and left the relays in a weird state. I recommend the following procedure for recovery:

- Attempt to `ssh` back, verify its still on the network. If not, wait for it to potentially restart and reconnect, after which you can try to `ssh` to rerun the script. 
- If the script has some remote I/O error or breaks, but the controller is still connected, you might see weird behavior where your buttons are unresponsive. I would recommend remotely restarting the controller to stop the script. You'll vent the stand + lines in this way when the powered close valves open, but it's safe. Connect back to it and rerun the script.

If the controllers stop working during pressure procedures, you will hear a vent if there's any pressure in the system. If you lose the network, the system will autosafe after 10 minutes. You will hear a vent if this happens. 

