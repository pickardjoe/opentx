const initial = {
    1: -400,
    2: 0,
    3: 0,
    4: 400,
    5: 0,
    6: 0,
    7: 200,
    8: 0,
    9: 0,
    10: -400,
    11: 120,
    12: -300,
};

const servoMap = {
    ne: {
        1: 7,
        2: 8,
        3: 9
    },
    se: {
        1: 10,
        2: 11,
        3: 12
    },
    nw: {
        1: 1,
        2: 2,
        3: 3
    },
    sw: {
        1: 4,
        2: 5,
        3: 6
    }
};

import {
    TxControl
} from './TxControl';


const ttyPort = process.argv[2];
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const ctl = new TxControl(ttyPort, 115200);
ctl.start().subscribe(function () {
    ctl.debug = ['all'];
    ctl.telemetry().subscribe(function (telemData) {
        console.log(JSON.stringify(telemData));
    });
    ctl.set(initial);
    app.get('/', function (req, res) {
        res.sendStatus(404);
    });
    app.use(bodyParser.json());
    app.get('/wave', function (req, res) {
        setTimeout(() => ctl.set({
            2: 1024,
            3: -1024
        }), 0);
        setTimeout(() => ctl.set({
            1: -1024
        }), 800);
        setTimeout(() => ctl.set({
            1: 1024
        }), 1000);
        setTimeout(() => ctl.set({
            1: -1024
        }), 1200);
        setTimeout(() => ctl.set({
            1: 1024
        }), 1400);
        setTimeout(() => ctl.set({
            1: -1024
        }), 1600);
        setTimeout(() => ctl.set({
            1: 1024
        }), 1800);
        setTimeout(() => ctl.set({
            1: -1024
        }), 2000);
        setTimeout(() => ctl.set({
            1: -400,
            2: 0,
            3: 0
        }), 2800);
        res.sendStatus(200);
    });

    app.put('/joint/:leg/:section', function (req, res) {
        const legName = req.params.leg;
        const legNameNormalized = legName && legName.toLowerCase();
        const sectionNumber = parseInt(req.params.section);
        const leg = legNameNormalized && servoMap[legNameNormalized];
        const section = leg && sectionNumber && leg[sectionNumber];
        const value = parseInt(req.query.value);

        if (NaN === value) {
            res.sendStatus(400);
            return;
        }

        if (!leg) {
            res.status(404).send({
                error: 'The leg could not be found.'
            });
            return;
        }
        if (!section) {
            res.status(404).send({
                error: 'The leg section could not be found.'
            });
            return;
        }
        ctl.set({
            [section]: value
        }).subscribe(() => {
            res.sendStatus(200);
        });
    });

    app.put('/reset', function (req, res) {
        ctl.set(initial).subscribe(() => {
            res.sendStatus(200);
        });
    });

    app.listen(8089);
});
