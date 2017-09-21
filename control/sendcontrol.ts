import { TxControl } from './TxControl';


const ctl = new TxControl(process.argv[2], 115200);
ctl.start().subscribe(function () {
    ctl.debug = ['all'];
    ctl.telemetry().subscribe(function (telemData) {
        console.log(JSON.stringify(telemData));
    });
    ctl.sendLoop(function () {
        ctl.stop();
    });
}, console.error);
