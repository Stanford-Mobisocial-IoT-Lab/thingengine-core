// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Q = require('q');
Q.longStackSupport = true;
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const Engine = require('../lib/engine');

function readOneLine(rl) {
    return Q.Promise(function(callback, errback) {
        rl.once('line', function(line) {
            if (line.trim().length === 0) {
                errback(new Error('User cancelled'));
                return;
            }

            callback(line);
        })
    });
}

class TestDelegate {
    constructor(rl) {
        this._rl = rl;
    }

    send(what) {
        console.log('>> ' + what);
    }

    sendPicture(url) {
        console.log('>> picture: ' + url);
    }

    sendRDL(rdl) {
        console.log('>> rdl: ' + rdl.displayTitle + ' ' + rdl.callback);
    }

    sendChoice(idx, what, title, text) {
        console.log('>> choice ' + idx + ': ' + title);
    }

    sendLink(title, url) {
        console.log('>> link: ' + title + ' ' + url);
    }

    sendButton(title, json) {
        console.log('>> button: ' + title + ' ' + json);
    }

    sendAskSpecial(what) {
        console.log('>> ask special ' + what);
    }
}

function interact(engine, platform, delegate, rl) {
    function quit() {
        console.log('Bye\n');
        rl.close();
        engine.close().finally(function() {
            platform.exit();
        });
    }
    function help() {
        console.log('Available commands:');
        console.log('\\q : quit');
        console.log('\\r <json> : send json to Almond');
        console.log('\\c <number> : make a choice');
        console.log('\\a list : list apps');
        console.log('\\a stop <uuid> : stop app');
        console.log('\\d list : list devices');
        console.log('\\? or \\h : show this help');
        console.log('Any other command is interpreted as an English sentence and sent to Almond');
    }

    var assistant = platform.getCapability('assistant');
    var conversation = assistant.getConversation();
    conversation.start();

    function runAppCommand(cmd, param) {
        if (cmd === 'list') {
            engine.apps.getAllApps().forEach((app) => {
                console.log('- ' + app.uniqueId + ' ' + app.name + ': ' + app.description);
            });
        } else if (cmd === 'stop') {
            var app = engine.apps.getApp(param);
            if (!app) {
                console.log('No app with ID ' + param);
            } else {
                engine.apps.removeApp(app);
            }
        }
    }
    function runDeviceCommand(cmd, param) {
        if (cmd === 'list') {
            engine.devices.getAllDevices().forEach((dev) => {
                console.log('- ' + dev.uniqueId + ' (' + dev.kind +') ' + dev.name + ': ' + dev.description);
            });
        }
    }

    rl.on('line', function(line) {
        Q.try(function() {
            if (line[0] === '\\') {
                if (line[1] === 'q')
                    return quit();
                else if (line[1] === '?' || line === 'h')
                    return help();
                else if (line[1] === 'r')
                    return conversation.handleParsedCommand(line.substr(3));
                else if (line[1] === 'c')
                    return conversation.handleParsedCommand(JSON.stringify({ answer: { type: "Choice", value: parseInt(line.substr(3)) }}));
                else if (line[1] === 'a')
                    return runAppCommand(...line.substr(3).split(' '));
                else if (line[1] === 'd')
                    return runDeviceCommand(...line.substr(3).split(' '));
                else
                    console.log('Unknown command ' + line[1]);
            } else if (line.trim()) {
                return conversation.handleCommand(line);
            }
        }).then(function() {
            rl.prompt();
        }).done();
    });
    rl.on('SIGINT', quit);

    rl.prompt();
}

class MockUser {
    constructor() {
        this.id = 1;
        this.account = 'FOO';
        this.name = 'Alice Tester';
    }
}

function main() {
    var rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.setPrompt('$ ');

    var platform = require('./test_platform');
    platform.init();

    var engine = new Engine(platform);
    if (interactive) {
        var delegate = new TestDelegate(rl);
        platform.createAssistant(engine, new MockUser(), delegate);
    }

    Q.try(function() {
        return engine.open();
    }).delay(2000).then(function() {
        if (interactive)
            interact(engine, platform, delegate, rl);
        else
            batch(engine, platform);
    }).done();
}

main();