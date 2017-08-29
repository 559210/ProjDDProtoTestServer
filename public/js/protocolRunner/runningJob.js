'use strict'
let async = require('async');

let commonJs = require('../../../CommonJS/common');
let variableManagerClass = require('./variableManager');
// let protoInstrumentClass = require('./protoInstrument');
let g_protoMgr = require('./protocolManager');
let pomeloClass = require('./pomeloClient');


const PROTO_TYPE = require('./protocolType');

class runningJob {
    constructor(jobObj, runningJobManager, consoleLogDepth, evn) {
        console.log('runningJob constructor: jobObj: %j', jobObj);
        this.jobObj = jobObj;
        this.runningJobId = -1;
        this.runningJobManager = runningJobManager;
        this.consoleLogDepth = consoleLogDepth;
        this.runningJobId = null;
        this.envirment = evn ? evn : {
            pomelo: null,
            variableManager: new variableManagerClass()
        };
        this.outputs = '';
    };

    setRunningJobId(id) {
        this.runningJobId = id;
    }

    getRunningJobId() {
        return this.runningJobId;
    }

    sendSessionLog(text) {
        for (let i = 0; i < this.sessionDepth; ++i) {
            text = '\t' + text;
        }
        this.outputs += text + '\n';
        
        if (commonJs.isUndefinedOrNull(this.session) == false) {
            this.runningJobManager.log(this.runningJobId, text); 
        }
        console.log(text);
    };

    clearOutputs() {
        this.outputs = '';
    }

    getOutputs() {
        return this.outputs;
    }

    runByStep(index, callback) {
        let ins = this.jobObj.getInstrument(index);
        if (ins) {
            this._runInstrument(ins, callback);
        } else {
            return callback(new Error('no instrument was found'));
        }
    };

    runAll(callback) {
        this.clearOutputs();
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

    _connectServer(self, ins, callback) {
        if (self.envirment.pomelo) {
            self.envirment.pomelo.removeAllListeners('io-error');
            self.envirment.pomelo.removeAllListeners('close');

            self.envirment.pomelo.disconnect();
            self.envirment.pomelo = null;
        }

        self.envirment.pomelo = new pomeloClass();

        let params = ins.getC2SMsg();
        self.envirment.pomelo.init({
            host: params['host'],
            port: params['port'],
            log: true
        }, (socketObj) => {
            if (commonJs.isUndefinedOrNull(socketObj)) {
                return callback(new Error('pomelo init failed!'));
            }

            self.envirment.pomelo.on('io-error', () => {
                return callback(new Error('io-error'));
            });
            self.envirment.pomelo.on('close', () => {
                return callback(new Error('network closed'));
            });
            return callback(null);
        });
    };

    _createVariable(self, ins, callback) {
        let c2sParams = ins.getParsedC2SParams();
        if (c2sParams.name.value) {
            let value = null;
            if (c2sParams.value.value !== null && c2sParams.value.value !== undefined && c2sParams.value.value !== '') {
                value = c2sParams.value.value;
            }
            self.envirment.variableManager.createVariable(c2sParams.name.value, value, c2sParams.value.type);
        }
        return callback(null);
    };

    _runInstrument(ins, callback) {
        let self = this;

        switch (ins.type) {
            case PROTO_TYPE.SYSTEM:

                switch (ins.route) {
                    case 'connect':
                        this._connectServer(this, ins, callback);
                    break;
                    case 'createIntVariable':
                    case 'createStringVariable':
                        this._createVariable(this, ins, callback);
                    break;
                }
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

    getName() {
        return this.jobObj.name;
    }

    getRunningJobId() {
        return this.runningJobId;
    }
};


module.exports = runningJob;