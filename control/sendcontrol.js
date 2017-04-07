var TxControl = require('./TxControl');


var ctl = new TxControl(process.argv[2], 115200, function(ctl1) {
    ctl1.debug = ['all'];
    ctl1.OnTelemetry(function(telemData) {
        console.log(JSON.stringify(telemData));
    });
    ctl1.SendLoop(function() {
        ctl1.Stop();
    });
});
