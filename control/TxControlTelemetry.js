/**
 * A telemetry data point from the radio.
 * @constructor 
 * @param {Buffer} rawData - The buffer of raw data received from the radio.
 */
function TxControlTelemetry(line) {
    let matches;
    if (line && (matches = /tlm: ([0-9, -]+)/.exec(line))) {
        let raw = matches[1].replace(' ', '').split(',').map(v => parseInt(v));
        this.id = raw[0] + 1;
        this.value = raw[1];
    } else {
        return null;
    }
}

module.exports = TxControlTelemetry;
