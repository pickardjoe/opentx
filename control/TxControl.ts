import { Observable, Subscriber } from 'rxjs/Rx';
import * as readline from 'readline';
import * as _ from 'lodash';
import * as  serialport from 'serialport';
const SerialPort = serialport.SerialPort;

import { TxControlTelemetry } from './TxControlTelemetry';

interface ChannelValueMap {
    [channel: number]: number;
}

interface ChannelMap {
    [channel: number]: number;
}

export class TxControl {
    private readonly _channelCount: number = 16;
    private _serialPort: string;
    private debug: string[] = [];
    private _baudRate: number = 115200;
    private _useRead: boolean = false;
    private _useTelemetry: boolean = false;

    private _channelValues: ChannelValueMap = {};
    private _serialData: Observable<string> = null;
    private _port: any = null;
    private _channelMap: ChannelMap = null;

	/**
     * Creates a new TxControl instance for controlling an OpenTX radio.
     * @constructor 
     * @param {string} serialPort - The name of the serial port the OpenTX radio is plugged into.
     * @param {number} baudRate - The baud rate of the OpenTX radio connection.
     * @param {txControlCreatedOpenedCallback} onOpened - Run when the  serial port to the OpenTX radio is opened.
     * @param {boolean|undefined|txControlTelemetryReceivedCallback} onOpened - True, if telemetry should be enabled. A telemetry data callback can also be used.
     */
    constructor(serialPort: string, baudRate: number = 115200, useTelemetry: boolean = true) {
        this._serialPort = serialPort;
        if (baudRate) {
            this._baudRate = baudRate;
        }

        this._useTelemetry = useTelemetry;

        if (this._useTelemetry) { // Check other read data types here.
            this._useRead = true;
        }
    }

    public static create(serialPort: string, baudRate: number = 115200, useTelemetry: boolean = true): Observable<void> {
        const txc = new TxControl(serialPort, baudRate, useTelemetry);
        return txc.start();
    }

    public start(): Observable<void> {
        const ctl = this;
        const startObs: Observable<void> = new Observable<void>(function (observer) {
            ctl._port = new SerialPort(ctl._serialPort, {
                baudRate: ctl._baudRate,
                dataBits: 8,
                parity: 'none',
                stopBits: 1,
                parser: serialport.parsers.readline('\n')
            }, function (err) {
                if (err) {
                    observer.error({ error: err });
                }
            });
        });

        if (ctl._useRead) {
            startObs.subscribe(() => {
                ctl._serialData = new Observable<string>(observer => {
                    ctl._port.on("data", function (line) {
                        observer.next(line);
                    });
                });
                this.initializeSerialLogging();
            });
        }
        return startObs;
    }

    private initializeSerialLogging(): void {
        this._serialData.subscribe(line => {
            this.debugOut(line, 'serial');
        });
    }

    public serialData(): Observable<string> {
        return this._serialData;
    };

    public telemetry(): Observable<TxControlTelemetry> {
        return this.serialData()
            .filter(line => !!/^tlm:/.exec(line))
            .map(line => new TxControlTelemetry(line));
    };

    private telemetryIdValid(id: number): boolean {
        if (id <= 0) {
            return false;
        }
        return true;
    }

    private sendTelemetryRequest(id: number): Observable<void> {
        const txc = this;
        if (!this.telemetryIdValid(id)) {
            return Observable.throw({ error: "Invalid telemetry id." });
        }
        return new Observable<void>(function (observer) {
            txc._port.write(['gt', id - 1].join(' ') + '\n', function (err) {
                if (err) {
                    observer.error({ error: err });
                    return;
                }
                observer.next();
            });
        });
    }

    public getTelemetry(id: number): Observable<TxControlTelemetry> {
        let txc = this;
        if (!this.telemetryIdValid(id)) {
            return Observable.throw({ error: "Invalid telemetry id." });
        }
        let tmlDataObs = this.telemetry().filter(tlmData => tlmData.id === id).first();
    };

    /**
     * Closes an open connection to the radio.
     * @param {txControlClosedCallback} onClosed - Run after the connection is closed.
     */
    public stop(): Observable<boolean> {
        return new Observable<boolean>(observer => {
            if (this._port) {
                this._port.close(err => {
                    if (err) {
                        observer.error({ error: err });
                        return;
                    }
                    observer.next(true);
                });
            }
            observer.next(false);
        });
    }

    /**
     * Displays a message if the message type is one of types that should be displayed.
     * @param {string} msg - The message to display.
     * @param {string | string[]} type - The type or array of types of this message.
     * @returns {boolean} - True if the message was displayed, otherwise false.
     */
    private debugOut(msg: string, msgType: string[]) {
        if (Array.isArray(msgType)) {
            for (var i in msgType) {
                if (-1 !== this.debug.indexOf(msgType[i])) {
                    console.log(msg);
                    return true;
                }
            }
        } else {
            if (-1 !== this.debug.indexOf("all") || -1 !== this.debug.indexOf(msgType)) {
                console.log(msg);
                return true;
            }
        }
        return false;
    };

    /**
     * Tells the radio to update the position of a channel.
     * @param {number} channel - The 1 - based index of the channel.
     * @param {number} value - The position of the channel update (from -1024 to 1024).
     * @param {resolve} txControlResolve - Run if the channel is set sucessfully.
     * @param {reject} txControlReject - Run if the channel is not set sucessfully.
     * @returns {boolean} - True if we were able to successfully write to the port, false if writing failed, and undefined if we don't know yet.
     */
    private sendChannel(channel: number, value: number): Observable<void> {
        const ctl = this;
        if (value < -1024 || value > 1024) {
            return Observable.throw({ error: "sendChannel: value must be between -1024 and 1024" });
        }

        let send = ['sc', channel, value].join(' ');
        this.debugOut(send, ['send']);
        return new Observable<void>(observer => {
            try {
                this._port.write(send + '\n',
                    function (err) {
                        if (err) {
                            observer.error({ error: err });
                            return;
                        }
                        ctl._channelValues[channel] = value;
                        ctl.debugOut("Sent " + value + " to channel " + channel, "status");
                        observer.next();
                    });
            } catch (err) {
                observer.error({ error: err });
            }
        });
    };

    getChannelMap(channelIn: number): number {
        if (this._channelMap) {
            var channelOut = this._channelMap[channelIn];
            if (channelOut) {
                this.debugOut("Mapped: " + channelIn + " -> " + channelOut, ["input", "channel map"]);
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
    public SetChannel(channel: number, value: number): Observable<void> {
        var channelMapped = this.getChannelMap(channel);

        if (!channelMapped) {
            return Observable.throw({ error: `Channel ${channel} not mapped.` });
        }
        if (0 > channelMapped) {
            channelMapped = -channelMapped;
            value = -value;
        }
        if (this._channelCount < channelMapped) {
            return Observable.throw({ error: "SetChannel: Mapped channel must be between 1 and " + this._channelCount });
        }
        if (value != this._channelValues[channelMapped]) {
            return this.sendChannel(channelMapped, value);
        }
    };

    /**
     * Sets some channel positions on the radio.
     * @param {object} values - A dictionary of channel values
     * @param {resolve} txControlResolve - Run for each channel channel that is set sucessfully.
     * @param {reject} txControlReject - Run for each channel that is not set sucessfully.
     */
    public Set(values: ChannelValueMap): Observable<void[]> {
        const ps = [];
        for (let channel in values) {
            ps.push(this.SetChannel(parseInt(channel), parseInt(values[channel.toString()], 10)));
        }
        return Observable.forkJoin(ps);
    };

    /**
     * Sets some channel positions on the radio.
     * @param {object} values - A dictionary of channel values in percent format ( -100 to 100).
     * @param {resolve} txControlResolve - Run for each channel channel that is set sucessfully.
     * @param {reject} txControlReject - Run for each channel that is not set sucessfully.
     */
    public SetPercent(values: ChannelValueMap) {
        const ps = [];
        for (let channel in values) {
            const channelStr = channel.toString();
            const channelInt = parseInt(channelStr);
            const channelValuePercentStr = values[channelStr];
            const channelValuePercentFloat = parseFloat(channelValuePercentStr);
            const channelValueFloat = channelValuePercentFloat * 1024 / 100;
            const channelValueStr = channelValueFloat.toString();
            const channelValueInt = parseInt(channelValueStr);

            const p = this.SetChannel(channelInt, channelValueInt);
            ps.push(p);
        }
        return Observable.forkJoin(ps);
    };


    /**
     * Used to display the usage of a command.
     * @param {string[]} cmd - The parts of the command.
     */
    private printUsage(cmd: string[]) {
        const usage = "Usage: " + cmd.join(" ");
        this.debugOut(usage, ["usage"]);
    };

    /**
     * Does something as described by an entered command.
     * @param {string|string[]} cmd - The entered command, or the entered command split on whitespace.
     * @returns {string} - A status message.
     */
    processCommand(cmd: string[]) {
        let usage = ["COMMAND (e | exit | so | setone | sm | setmultiple)", "[ARGUMENTS]"];
        if (0 === cmd.length) {
            return "NONE";
        } else if (-1 !== ["e", "exit"].indexOf(cmd[0])) {
            usage = [cmd[0]];
            return "EXIT";
        } else if (-1 !== ["so", "setone"].indexOf(cmd[0])) {
            usage = [cmd[0], "CHANNEL#", "VALUE"];
            if (2 < cmd.length) {
                try {
                    let channelsSo = {};
                    channelsSo[parseInt(cmd[1])] = parseInt(cmd[2]);
                    this.Set(channelsSo);
                    return "SET ONE";
                } catch (e) {
                    return "ERROR: " + e;
                }
            } else {
                this.printUsage(usage);
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
                this.printUsage(usage);
                return "DID NOT SET ONE";
            }
        } else if (-1 !== ["sm", "setmultiple"].indexOf(cmd[0])) {
            usage = [cmd[0], "[VALUE | CHANNEL#:VALUE] ..."];
            if (1 < cmd.length) {
                let channel: number = 0;
                let channelsWritten: number[] = [];
                let cmdSkipFirst = cmd.slice(1);
                for (const i in cmdSkipFirst) {
                    const valueStr = cmdSkipFirst[i];
                    let value: number;
                    if (0 <= valueStr.indexOf(":")) {
                        const valueArray = valueStr.split(":");

                        if (2 == valueArray.length) {
                            channel = parseInt(valueArray[0]);
                            value = parseInt(valueArray[1]);
                        }
                    } else {
                        value = parseInt(valueStr);
                    }
                    if (!isNaN(channel) && !isNaN(value)) {
                        this.SetChannel(channel, value);
                        channelsWritten.push(channel);
                        ++channel;
                    }
                }
                return "SET " + channelsWritten.length;
            } else {
                this.printUsage(usage);
                return "SET NONE";
            }
        }
        return "NOTHING";
    };

    /**
     * Creates a REPL for entering commands.
     * @param {txControlReplClosedCallback} onExit - Run when the REPL is exited.
     */
    public SendLoop(onExit) {
        const ctl = this;

        var stdio = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        var onLine = function (cmd) {
            cmd = cmd.split(' ');
            if (!isNaN(parseInt(cmd[0]))) {
                cmd.unshift("so");
            }

            var result = ctl.processCommand(cmd);
            ctl.debugOut(result, ['status']);
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

    public SendControlLoop(onExit) {
        const ctl = this;
        const Mouse = require("node-mouse");
        const keypress = require("keypress");

        const mouse = new Mouse();
        keypress(process.stdin);

        mouse.on("mousemove", function (event) {
            ctl.Set({
                2: event.xDelta * 16,
                3: event.yDelta * 16
            });
            setTimeout(function () {
                ctl.Set({
                    2: event.xDelta * 256,
                    3: event.yDelta * 256
                });
            }, 0);
            ctl.debugOut(event, "input");
        });
        var throttle = -1024;
        var rudder = 0;
        process.stdin.on('keypress', function (ch, key) {
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
            debugOut('key ' + key.name + ' pressed, throttle set to: ' + throttle, "input");
        });
        process.stdin.setRawMode(true);
    };
}

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
