// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

var express = require('express');
var router = express.Router();
const user = require('../util/user');
const db = require('../util/db');
const fs = require('fs');
const path = require('path');

var router = express.Router();

function render(res, what) {
    res.render('doc_' + what, { page_title: "ThingEngine - Documentation" });
}

router.get('/', function(req, res) {
    render(res, 'main');
});

router.get('/:what', function(req, res) {
    if (!/^[a-z0-9\-.]+$/.test(req.params.what) ||
        !req.params.what.endsWith('.md')) {
        res.status(400).render('error', { page_title: "ThingEngine - Error",
                                          message: "Malformed request" });
        return;
    }

    var what = req.params.what.substr(0, req.params.what.length - 3);
    if (fs.existsSync(path.resolve(path.dirname(module.filename),
                                   '../views/doc_' + what + '.jade'))) {
        render(res, what);
    } else {
        res.status(404).render('error', { page_title: "ThingEngine - Error",
                                          message: "Not Found" });
    }
});

module.exports = router;