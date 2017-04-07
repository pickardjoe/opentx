var TxControl = require('./TxControl');


var ctl = new TxControl(process.argv[2], 115200, function(ctl1) {
    ctl1.debug = ['all'];
    ctl1.OnTelemetry(function(telemData) {
        console.log(JSON.stringify(telemData));
    });
	ctl1.channelMap = {0 : 2, 1: 3, 2: -1, 5: 4};
    ctl1.SendLoop(function() {
        ctl1.Stop();
    });
});
