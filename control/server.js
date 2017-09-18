const initial = {
    1: -384,
    2: 256,
    3: 512,
    4: 128,
    5: 0,
    6: -512,
    7: 512,
    8: 0,
    9: -100,
    10: -512,
    11: 0,
    12: 400
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

const TxControl = require('./TxControl');

const ttyPort = process.argv[2];
const express = require('express');
const app = express();
const bodyParser = require('body-parser');

const ctl = new TxControl(ttyPort, 115200, function() {
    ctl.debug = ['all'];
    ctl.OnTelemetry(function(telemData) {
        console.log(JSON.stringify(telemData));
    });
    ctl.Set(initial);
    app.get('/', function(req, res) {
        res.sendStatus(404);
    });
    app.use(bodyParser.json());
    app.get('/wave', function(req, res) {
        setTimeout(() => ctl.Set({
            2: 768,
            3: -512
        }), 0);
        setTimeout(() => ctl.Set({
            1: -512
        }), 800);
        setTimeout(() => ctl.Set({
            1: 512
        }), 1000);
        setTimeout(() => ctl.Set({
            1: -512
        }), 1200);
        setTimeout(() => ctl.Set({
            1: 512
        }), 1400);
        setTimeout(() => ctl.Set({
            1: -512
        }), 1600);
        setTimeout(() => ctl.Set({
            1: 512
        }), 1800);
        setTimeout(() => ctl.Set({
            1: -512
        }), 2000);
        setTimeout(() => ctl.Set({
            1: -384,
            2: 256,
            3: 512
        }), 2800);
        res.sendStatus(200);
    });

    app.put('/joint/:leg/:section', function(req, res) {
        const legName = req.params.leg;
        const legNameNormalized = legName && legName.toLowerCase();
        const sectionNumber = parseInt(req.params.section);
        const leg = legNameNormalized && servoMap[legNameNormalized];
        const section = leg && sectionNumber && leg[sectionNumber];
        const value = parseInt(req.body.value);

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
        ctl.Set({
            section: value
        });
        res.sendStatus(200);
    });

    app.put('/reset', function(req, res) {
        ctl.Set(initial);
        res.sendStatus(200);
    });

    app.listen(8089);
});
