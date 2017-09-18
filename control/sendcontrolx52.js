var TxControl = require('./TxControl');


var ctl = new TxControl(process.argv[2], 115200, function(ctl) {
    ctl.debug = ['all'];
    ctl.OnTelemetry(function(telemData) {
        console.log(JSON.stringify(telemData));
    });
	ctl.channelMap = {0 : 2, 1: 3, 2: -1, 5: 4};
    ctl.SendLoop(function() {
        ctl.Stop();
    });
});
