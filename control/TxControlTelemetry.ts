/**
 * A telemetry data point from the radio.
 * @constructor 
 * @param {Buffer} rawData - The buffer of raw data received from the radio.
 */
export class TxControlTelemetry {
    public id: number;
    public value: number;

    constructor(line: string) {
        let matches;
        if (line && (matches = /tlm: ([0-9, -]+)/.exec(line))) {
            let raw = matches[1].replace(' ', '').split(',').map(v => parseInt(v));
            this.id = raw[0] + 1;
            this.value = raw[1];
        } else {
            throw new Error(`'${line}' is does not contain valid telemetry data`);
        }
    }
}
