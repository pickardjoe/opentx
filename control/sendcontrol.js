var TxControl = require('./TxControl');


var ctl = new TxControl(process.argv[2], 115200, function() {
    ctl.debug = ['all'];
    ctl.OnTelemetry(function(telemData) {
        console.log(JSON.stringify(telemData));
    });
    ctl.SendLoop(function() {
        ctl.Stop();
    });
});
