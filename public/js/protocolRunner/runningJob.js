'use strict'
let async = require('async');

let commonJs = require('../../../CommonJS/common');
let variableManagerClass = require('./variableManager');
// let protoInstrumentClass = require('./protoInstrument');
let g_protoMgr = require('./protocolManager');
let pomeloClass = require('./pomeloClient');


const PROTO_TYPE = require('./protocolType');

class runningJob {
    constructor(jobObj, sess, sessionDepth, evn) {
        this.jobObj = jobObj;
        this.session = sess;
        this.sessionDepth = sessionDepth;
        this.envirment = evn ? evn : {
            pomelo: null,
            variableManager: new variableManagerClass()
        };
    };

    sendSessionLog(text) {
        for (let i = 0; i < this.sessionDepth; ++i) {
            text = '\t' + text;
        }
        if (commonJs.isUndefinedOrNull(this.session) == false) {
            this.session.Console(text); 
        }
        console.log(text);
    };

    runByStep(index, callback) {
        let ins = this.jobObj.getInstrument(index);
        if (ins) {
            this._runInstrument(ins, callback);
        } else {
            return callback(new Error('no instrument was found'));
        }
    };

    runAll(callback) {
        this.sendSessionLog('------------------------------->');
        this.sendSessionLog('start job' + this.jobObj.name);
        async.eachSeries(this.jobObj.instruments, (item, cb) => {
                item.runner = this;
                this._runInstrument(item, cb);
            },
            (err) => {
                this.sendSessionLog('<-------------------------');
                callback(err);
            });
    };

    _runInstrument(ins, callback) {
        let self = this;

        switch (ins.type) {
            case PROTO_TYPE.CONNECT:
                if (this.envirment.pomelo) {
                    this.envirment.pomelo.removeAllListeners('io-error');
                    this.envirment.pomelo.removeAllListeners('close');

                    this.envirment.pomelo.disconnect();
                    this.envirment.pomelo = null;
                }

                this.envirment.pomelo = new pomeloClass();

                let params = ins.getC2SMsg();
                this.envirment.pomelo.init({
                    host: params['host'],
                    port: params['port'],
                    log: true
                }, (socketObj) => {
                    if (commonJs.isUndefinedOrNull(socketObj)) {
                        return callback(new Error('pomelo init failed!'));
                    }

                    this.envirment.pomelo.on('io-error', () => {
                        return callback(new Error('io-error'));
                    });
                    this.envirment.pomelo.on('close', () => {
                        return callback(new Error('network closed'));
                    });
                    return callback(null);
                });
                break;
            case PROTO_TYPE.REQUEST:

                this.sendSessionLog("send: " + ins.route);
                this.sendSessionLog("with params: " + JSON.stringify(ins.getC2SMsg()));
                this.envirment.pomelo.request(ins.route, ins.getC2SMsg(), (data) => {
                    // TODO: 这里要移到真正整个任务做完的地方
                    // this.envirment.pomelo.removeAllListeners('io-error');
                    // this.envirment.pomelo.removeAllListeners('close');

                    ins.onS2CMsg(data, callback);
                    // return callback(null);
                });
                break;
            case PROTO_TYPE.JOB:
                let jobId = ins.route;
                g_protoMgr.loadJobById(jobId, (err, job) => {
                    if (err) {
                        return callback(err);
                    }
                    let runningJobObj = new runningJob(job, this.session, this.sessionDepth + 1, this.envirment);

                    let firstIns = job.getInstrument(0);
                    let msg = ins.getC2SMsg();
                    for (let key in msg) {
                        if (msg[key]) {
                            firstIns.setC2SParamValue(key, msg[key]);
                        }
                    }


                    runningJobObj.runAll(callback);

                });
                break;
            case PROTO_TYPE.PUSH:
                this.sendSessionLog("listening to onPush message: " + ins.route);
                this.envirment.pomelo.removeAllListeners(ins.route);
                this.envirment.pomelo.on(ins.route, (data) => {
                    this.sendSessionLog("onPush: " + ins.route);
                    ins.onS2CMsg(data, (err)=>{});
                });
                callback(null);
                break;
            case PROTO_TYPE.NOTIFY:
                this.sendSessionLog("send notify: " + ins.route);
                this.sendSessionLog("with params: " + JSON.stringify(ins.getC2SMsg()));
                this.envirment.pomelo.notify(ins.route, ins.getC2SMsg());
                callback(null);
                break;
        }
    };

    stop(callback) {
        this.envirment.pomelo.removeAllListeners('io-error');
        this.envirment.pomelo.removeAllListeners('close');
                    
        this.envirment.pomelo.disconnect();
        this.envirment.pomelo = null;
        callback(null);
    }
};


module.exports = runningJob;