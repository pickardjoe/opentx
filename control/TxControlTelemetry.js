/**
 * A telemetry data point from the radio.
 * @constructor 
 * @param {Buffer} rawData - The buffer of raw data received from the radio.
 */
function TxControlTelemetry(rawData) {
    if (rawData) {
        // this.type = rawData.readUInt8(0); // We already know it's telemetry.
        if (rawData.length < 3) {
            return;
        }
        this.id = rawData.readUInt16LE(1);
        if (rawData.length < 4) {
            return;
        }
        this.subid = rawData.readUInt8(3);
        if (rawData.length < 8) {
            return;
        }
        this.value = rawData.readInt32LE(4);
        if (rawData.length < 12) {
            return;
        }
        this.unit = rawData.readUInt32LE(8);
        if (rawData.length < 16) {
            return;
        }
        this.precision = rawData.readUInt32LE(12);
        if (rawData.length < 17) {
            return;
        }
        this.instance = rawData.readUInt8(13);
    }
}

module.exports = TxControlTelemetry;
