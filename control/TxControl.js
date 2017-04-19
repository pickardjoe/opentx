var serialport = require('serialport');
var SerialPort = serialport.SerialPort;

var events = require('events');

var TxControlTelemetry = require('./TxControlTelemetry');

/**
 * Creates a new TxControl instance for controlling an OpenTX radio.
 * @constructor 
 * @param {string} serialPort - The name of the serial port the OpenTX radio is plugged into.
 * @param {number} baudRate - The baud rate of the OpenTX radio connection.
 * @param {txControlCreatedOpenedCallback} onOpened - Run when the  serial port to the OpenTX radio is opened.
 * @param {boolean|undefined|txControlTelemetryReceivedCallback} onOpened - True, if telemetry should be enabled. A telemetry data callback can also be used.
 */
function TxControl(serialPort, baudRate, onOpened, telemetry) {
    this.MAX_VALUE = 255;
    this.RESET_VALUE = 181;
    this.CHANNEL_COUNT = 16;
    this._serialPort = serialPort;
    this.debug = [];
    if (baudRate) {
        this._baudRate = baudRate;
    } else {
        this._baudRate = 115200;
    }
    this._channelValues = {};

    for (var i = 0; i < this.CHANNEL_COUNT; ++i) {
        this._channelValues[i] = null;
    }

    this._emitter = new events.EventEmitter();

    if (undefined === telemetry || telemetry) {
        this._useTelemetry = true;
        if ("function" === typeof(telemetry)) {
            this._emitter.on('telemetry', telemetry);
        }
    } else {
        this._useTelemetry = false;
    }

    if (this._useTelemetry) { // Check other read data types here.
        this._useRead = true;
    }


    this.Start(onOpened);
}

/**
 * Called when data is received from the radio.
 * @param {Buffer} line - The line of data recieved.
 */
TxControl.prototype._ProcessLineReceived = function(line) {
    this.DebugOut(line, "serial");
    let matches;
    if ((matches = />tlm: (-?\d), (-?\d)'/.exec(line))) {
        this._emitter.emit('telemetry', {
            id: parseInt(matches[0]),
            value: parseInt(matches[1])
        });
    }
};

/**
 * Called when telemetry data is received.
 * @param {Buffer} line - The line of telemetry data recieved.
 */
TxControl.prototype._ProcessTelemetry = function(line) {
    if (!this._useTelemetry) {
        return;
    }
    var telemetryData = new TxControlTelemetry(line);
    this._emitter.emit("telemetry", telemetryData);
};

/**
 * Opens a connection to the radio.
 * @param {txControlCreatedOpenedCallback} onOpened - Run after the connection is opened.
 */
TxControl.prototype.Start = function(onOpened) {
    var ctl = this;
    this.port = new SerialPort(ctl._serialPort, {
        baudRate: ctl._baudRate,
        dataBits: 8,
        parity: 'none',
        stopBits: 1,
        parser: serialport.parsers.readline('\n')
    }, function() {
        if (onOpened) {
            onOpened(ctl);
        }
    });
    if (this._useRead) {
        this.port.on("data", function(line) {
            ctl._ProcessDataReceived(line);
        });
    }
};

/**
 * Closes an open connection to the radio.
 * @param {txControlClosedCallback} onClosed - Run after the connection is closed.
 */
TxControl.prototype.Stop = function(onClosed) {
    if (this.port) {
        this.port.close(onClosed);
    }
};

/**
 * Displays a message if the message type is one of types that should be displayed.
 * @param {string} msg - The message to display.
 * @param {string | string[]} type - The type or array of types of this message.
 * @returns {boolean} - True if the message was displayed, otherwise false.
 */
TxControl.prototype.DebugOut = function(msg, type) {
    if (Array.isArray(type)) {
        for (var i in type) {
            if (-1 !== this.debug.indexOf(type[i])) {
                console.logG(msg);
                return true;
            }
        }
    } else {
        if (-1 !== this.debug.indexOf("all") || -1 !== this.debug.indexOf(type)) {
            console.log(msg);
            return true;
        }
    }
    return false;
};

/**
 * Adds a listener that is run on any telmetery data recieved.
 * @param {} handler
 * @return {boolean} - True, if the handler was added, otherwise false (telemetry or serial read not enabled).
 */
TxControl.prototype.OnTelemetry = function(handler) {
    if (this._useTelemetry) {
        this._emitter.on("telemetry", handler);
    }
};

/**
 * Tells the radio to update the position of a channel.
 * @param {number} channel - The 1 - based index of the channel.
 * @param {number} value - The position of the channel update (from -1024 to 1024).
 * @param {resolve} txControlResolve - Run if the channel is set sucessfully.
 * @param {reject} txControlReject - Run if the channel is not set sucessfully.
 * @returns {boolean} - True if we were able to successfully write to the port, false if writing failed, and undefined if we don't know yet.
 */
TxControl.prototype._SendChannel = function(channel, value, resolve, reject) {
    var ctl = this;
    if (value < -1024 || value > 1024) {
        reject(new RangeError("_SendChannel: value must be between -1024 and 1024"));
    }

    var success;
    let send = ['sc', channel, value].join(' ');
    console.log(send);
    try {
        this.port.write(send + '\n',
            function() {
                success = true;
                ctl._channelValues[channel] = value;
                ctl.DebugOut("Sent " + value + " to channel " + channel, "status");
                if (resolve) {
                    resolve();
                }
            });
    } catch (e) {
        if (reject) {
            success = false;
            reject(e);
        }
    }
    return success;
};

TxControl.prototype._GetChannelMap = function(channelIn) {
    if (this.channelMap) {
        var channelOut = this.channelMap[channelIn];
        if (channelOut) {
            this.DebugOut("Mapped: " + channelIn + " -> " + channelOut, "input");
            return channelOut;
        }
        return undefined;
    }
    return channelIn;
};

/**
 * Tells the radio to update the position of a channel if the position is different from the last one.
 * @param {number} channel - The 1 - based index of the channel.
 * @param {number} value - The position of the channel update (from 0 to 2048).
 * @param {resolve} txControlResolve - Run if the channel is set sucessfully.
 * @param {reject} txControlReject - Run if the channel is not set sucessfully.
 * @returns {boolean} True, if the channel value was sent successfully, or wasn't sent because it hasn't changed, otherwise false.
 */
TxControl.prototype.SetChannel = function(channel, value, resolve, reject) {
    var channelMapped = this._GetChannelMap(channel);

    if (!channelMapped) {
        return;
    }
    if (0 > channelMapped) {
        channelMapped = -channelMapped;
        value = -value;
    }
    if (this.CHANNEL_COUNT < channelMapped) {
        if (reject) {
            reject(new RangeError("SetChannel: Mapped channel must be between 1 and " + this.CHANNEL_COUNT));
        }
        return false;
    }
    if (value != this._channelValues[channelMapped]) {
        return this._SendChannel(channelMapped, value, resolve, reject);
    }
    return true;
};

/**
 * Sets some channel positions on the radio.
 * @param {object} values - A dictionary of channel values.
 * @param {resolve} txControlResolve - Run for each channel channel that is set sucessfully.
 * @param {reject} txControlReject - Run for each channel that is not set sucessfully.
 */
TxControl.prototype.Set = function(values, resolve, reject) {
    var failed = [];
    var channel;
    var rejectL = function(e) {
        failed.push(channel);
        if (reject) {
            reject(e);
        }
    };
    for (channel in values) {
        this.SetChannel(parseInt(channel), parseInt(values[channel]), resolve, rejectL);
    }
};

/**
 * Sets some channel positions on the radio.
 * @param {object} values - A dictionary of channel values in percent format ( -100 to 100).
 * @param {resolve} txControlResolve - Run for each channel channel that is set sucessfully.
 * @param {reject} txControlReject - Run for each channel that is not set sucessfully.
 */
TxControl.prototype.SetPercent = function(values, resolve, reject) {
    var failed = [];
    var channel;
    var rejectL = function(e) {
        failed.push(channel);
        if (reject) {
            reject(e);
        }
    };
    for (channel in values) {
        this.SetChannel(parseInt(channel), parseInt((parseFloat(values[channel])) * 1024 / 100), resolve, rejectL);
        failed.push(channel);
    }
};


/**
 * Used to display the usage of a command.
 * @param {string[]} cmd - The parts of the command.
 */
TxControl._PrintUsage = function(cmd) {
    var usage = "Usage";
    for (var i in cmd) {
        usage += " " + cmd[i];
    }
    this.DebugOut(usage, "usage");
};

/**
 * Does something as described by an entered command.
 * @param {string|string[]} cmd - The entered command, or the entered command split on whitespace.
 * @returns {string} - A status message.
 */
TxControl.prototype.ProcessCommand = function(cmd) {
    if (!Array.isArray(cmd)) {
        cmd = cmd.split(' ');
    }
    var usage = ["COMMAND (e | exit | so | setone | sm | setmultiple)", "[ARGUMENTS]"];
    if (0 === cmd.length) {
        return "NONE";
    } else if (-1 !== ["e", "exit"].indexOf(cmd[0])) {
        usage = [cmd[0]];
        return "EXIT";
    } else if (-1 !== ["so", "setone"].indexOf(cmd[0])) {
        usage = [cmd[0], "CHANNEL#", "VALUE"];
        if (2 < cmd.length) {
            try {
                var channelsSo = {};
                channelsSo[parseInt(cmd[1])] = parseInt(cmd[2]);
                this.Set(channelsSo);
                return "SET ONE";
            } catch (e) {
                return "ERROR: " + e;
            }
        } else {
            TxControl._PrintUsage(usage);
            return "DID NOT SET ONE";
        }
    } else if (-1 !== ["sp", "sop", "spo", "setpercent", "setonepercent"].indexOf(cmd[0])) {
        usage = [cmd[0], "CHANNEL#", "VALUE (-100 to 100)"];
        if (2 < cmd.length) {
            try {
                var channelsSp = {};
                channelsSp[parseInt(cmd[1])] = parseFloat(cmd[2]);
                this.SetPercent(channelsSp);
                return "SET ONE USING PERCENT";
            } catch (e) {
                return "ERROR: " + e;
            }
        } else {
            this._PrintUsage(usage);
            return "DID NOT SET ONE";
        }
    } else if (-1 !== ["sm", "setmultiple"].indexOf(cmd[0])) {
        usage = [cmd[0], "[VALUE | CHANNEL#:VALUE] ..."];
        if (1 < cmd.length) {
            var channel = 0;
            var channelsWritten = [];
            var cmdSkipFirst = cmd.slice(1);
            for (var i in cmdSkipFirst) {
                var value = cmdSkipFirst[i];
                if (0 <= value.indexOf(":")) {
                    var va = value.split(":");

                    if (2 == va.length) {
                        channel = parseInt(va[0]);
                        value = parseInt(va[1]);
                    }
                } else {
                    value = parseInt(value);
                }
                if (!isNaN(channel) && !isNaN(value)) {
                    this.SetChannel(channel, value);
                    channelsWritten.append(channel);
                    ++channel;
                }
            }
            return "SET " + channelsWritten.length;
        } else {
            this._PrintUsage(usage);
            return "SET NONE";
        }
    }
    return "NOTHING";
};

/**
 * Creates a REPL for entering commands.
 * @param {txControlReplClosedCallback} onExit - Run when the REPL is exited.
 */
TxControl.prototype.SendLoop = function(onExit) {
    var ctl = this;

    var readline = require('readline');

    var stdio = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    var onLine = function(cmd) {
        cmd = cmd.split(' ');
        if (!isNaN(parseInt(cmd[0]))) {
            cmd.unshift("so");
        }

        var result = ctl.ProcessCommand(cmd);
        ctl.DebugOut(result, 'status');
        switch (result) {
            case "EXIT":
                stdio.removeListener('line', onLine);
                stdio.close();
                if (onExit) {
                    onExit();
                }
        }
    };

    stdio.on('line', onLine);
};

TxControl.prototype.SendControlLoop = function(onExit) {
    var ctl = this;
    var Mouse = require("node-mouse");
    var keypress = require("keypress");

    var mouse = new Mouse();
    keypress(process.stdin);

    mouse.on("mousemove", function(event) {
        ctl.Set({
            2: event.xDelta * 16,
            3: event.yDelta * 16
        });
        setTimeout(function() {
            ctl.Set({
                2: event.xDelta * 256,
                3: event.yDelta * 256
            });
        }, 0);
        ctl.DebugOut(event, "input");
    });
    var throttle = -1024;
    var rudder = 0;
    process.stdin.on('keypress', function(ch, key) {
        if (!key) {
            return;
        }

        if (key.name == "a") {
            rudder -= 16;
        } else if (key.name == "d") {
            rudder += 16;
        } else if (key.name == "w") {
            throttle += 16;
        } else if (key.name == "s") {
            throttle -= 16;
        } else if (key.name == "r") {
            throttle = -1024;
        } else if (key.name == "t") {
            rudder = 0;
        } else if (key.name == "c") {
            process.stdin.pause();
            process.stdin.destroy();
        }
        if (1024 < throttle) {
            throttle = 1024;
        } else if (-1024 > throttle) {
            throttle = -1024;
        }

        ctl.Set({
            1: throttle,
            4: rudder
        });
        DebugOut('key ' + key.name + ' pressed, throttle set to: ' + throttle, "input");
    });
    process.stdin.setRawMode(true);
};

module.exports = TxControl;

/**
 * Called when a TxControl connection is closed.
 * @callback txControlClosedCallback
 */

/**
 * Called when exiting a TxControl REPL.
 * @callback txControlReplClosedCallback
 */

/**
 * Called when a function is successful.
 * @callback txControlResolve
 */

/**
 * Called when a function is unsuccessful.
 * @callback txControlReject
 * @param {Error} - The Error that was thrown, if applicable.
 */

/**
 * Called when a TxControl is created and opened.
 * @callback txControlCreatedOpenedCallback
 * @param {TxControl} ctl - The created / opened TxControl.
 */

/**
 * Called when telemetry data is received.
 * @callback txControlTelemetryReceivedCallback
 * @param {TxControlTelemetry} data - The telemetry data that was received.
 */
