'use strict'
let async = require('async');

let commonJs = require('../../../CommonJS/common');
let variableManagerClass = require('./variableManager');
// let protoInstrumentClass = require('./protoInstrument');
let g_protoMgr = require('./protocolManager');
let pomeloClass = require('./pomeloClient');

const PROTO_TYPE = require('./protocolType');
let protoRunnerJobClass = require('./protoRunnerJob');

class runningJob {
    constructor(job, jobList, runningJobManager, consoleLogDepth, evn, socket) {
        // console.log('runningJob constructor: jobObj: %j', jobObj);
        this.jobObj = g_protoMgr._deserializeJob(job.jobJson);
        this.jobList = jobList;
        this.runningJobManager = runningJobManager;
        this.consoleLogDepth = consoleLogDepth;
        this.runningJobId = null;
        this.socket = socket;
        this.envirment = evn ? evn : {
            pomelo: null,
            variableManager: new variableManagerClass(),
            rootRunningJob: this
        };
        this.outputs = [];
    };

    setRunningJobId(id) {
        this.runningJobId = id;
    };

    getRunningJobId() {
        return this.runningJobId;
    };

    sendSessionLog(text) {
        this.envirment.rootRunningJob._sendSessionLog(this.consoleLogDepth, text);
    };

    _sendSessionLog(depth, text) {
        let t = text;
        for (let i = 0; i < depth; ++i) {
            t = '\t' + t;
        }
        let timestamp = Date.parse(new Date());
        this.outputs.push({text: t, timestamp: timestamp});
        //this.runningJobManager.log(this.runningJobId, t, timestamp);  
        
        let g_runningJobMgr = require('./runningJobManager');
        g_runningJobMgr.log(this.socket, this.runningJobId, t, timestamp);
    }

    clearOutputs() {
        this.outputs = [];
    };

    getOutputs() {
        return this.outputs;
    };

    runByStep(index, callback) {
        let ins = this.jobObj.getInstrument(index);
        if (ins) {
            this._runInstrument(ins, callback);
        } else {
            return callback(new Error('no instrument was found'));
        }
    };

    runAll(index, callback) {
        let self = this;
        this.clearOutputs();
        this.sendSessionLog('------------------------------->');
        this.sendSessionLog('start job' + this.jobObj.name);

        async.whilst(
            function breaker () {
                return index < self.jobObj.instruments.length;
            },
            function iterator (cb) {
                self.jobObj.instruments[index].runner = self;
                self._runInstrument(self.jobObj.instruments[index], (err, data) => {
                    index++;
                    if (err) {
                        switch(err) {
                            case 'jump':
                                if (data) {
                                    index = self.jobObj.tagList[data];
                                }
                                cb(null);
                            break;
                            case 'timer':
                                let milliSecond = data.milliSecond;
                                let count = data.count;
                                let jobId = data.jobId;

                                let recorder = 0;
                                let timerId = setInterval((err) => {
                                    if (recorder++ >= count) {
                                        clearInterval(timerId);
                                        cb(null);
                                    } else {
                                        // 执行定时job
                                        let subJobObject = self._getJobStrFromJobList(jobId);
                                        let runningJobObj = new runningJob(subJobObject, self.jobList, self.runningJobManager, self.consoleLogDepth + 1, self.envirment, self.socket);
                                        runningJobObj.runAll(0, (err) => {
                                            if (err) {
                                                clearInterval(timerId);
                                                cb(err);
                                            }
                                        });
                                    }
                                }, milliSecond);
                            break;
                            default:
                                cb(err);
                            break;
                        }
                    } else {
                        cb(null);
                    }
                }); 
            },
            function(err){
                console.log(err);
                callback(err);
            }
        );
    };

    _connectServer(ins, callback) {
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
    };

    _createVariable(ins, callback) {
        let c2sParams = ins.getParsedC2SParams();
        if (c2sParams.name.value) {
            let value = null;
            if (c2sParams.value.value !== null && c2sParams.value.value !== undefined && c2sParams.value.value !== '') {
                value = c2sParams.value.value;
            }
            this.envirment.variableManager.createVariable(c2sParams.name.value, value, c2sParams.value.type);
        }
        return callback(null);
    };
	
	// result: -1:error,0:false,1:true,2:ok
    _compareValue(ins) {
        let msg = ins.getC2SMsg();
        let p1 = msg.param1;
        let p2 = msg.param2;
        let tagName = msg.tagName;

        let result = -1;
        switch (ins.route) {
            case 'gotoGreater':
                if (typeof p1 === 'number' && typeof p2 === 'number') {
                    result = Number(p1 > p2);
                }
            break;
            case 'gotoEqual':
                if ((typeof p1 === 'number' && typeof p2 === 'number') ||
                    (typeof p1 === 'string' && typeof p2 === 'string')) {
                    result = Number(p1 === p2);
                }
                break;
            case 'gotoLess':
                if (typeof p1 === 'number' && typeof p2 === 'number') {
                    result = Number(p1 < p2);
                }
                break;
            case 'gotoGreaterOrEqual':
                if (typeof p1 === 'number' && typeof p2 === 'number') {
                    result = Number(p1 >= p2);
                }
            break;
            case 'gotoLessOrEqual':
                if (typeof p1 === 'number' && typeof p2 === 'number') {
                    result = Number(p1 <= p2);
                }
                break;
            case 'gotoNotEqual':
                if ((typeof p1 === 'number' && typeof p2 === 'number') ||
                    (typeof p1 === 'string' && typeof p2 === 'string')) {
                    result = Number(p1 !== p2);
                }
                break;
            case 'gotoNull':
                result = 2;
                break;
            default:
                break;
        }
        return {
            result:result,
            tagName:tagName
        };
    };

    _getJobStrFromJobList(jobId) {
        let subJobObject = {};
        for (let j = 1; j < this.jobList.length; j++) {
            if (JSON.parse(this.jobList[j].jobJson).id == jobId) {
                subJobObject = this.jobList[j];
                break;
            }
        }
        return subJobObject;
    };

    _runInstrument(ins, callback) {
        // 处理socket已断开的情况
        if (this.envirment.pomelo && this.envirment.pomelo.socket.readyState == 3) {
            return callback('pomelo socket is closed!');
        }
        
        switch (ins.type) {
            case PROTO_TYPE.SYSTEM:

                switch (ins.route) {
                    case 'connect':
                        this._connectServer(ins, callback);
                    break;
                    case 'createIntVariable':
                    case 'createStringVariable':
                        this._createVariable(ins, callback);
                    break;
					case 'gotoGreater':
                    case 'gotoEqual':
                    case 'gotoLess':
                    case 'gotoGreaterOrEqual':
                    case 'gotoLessOrEqual':
                    case 'gotoNotEqual':
                    case 'gotoNull':
                        let compareResult = this._compareValue(ins);
                        if (compareResult.result === 1 || compareResult.result === 2) {
                            callback('jump', compareResult.tagName);
                        } else {
                            callback(new Error('check goto cmd error !'));
                        }
                        break;
                    case 'tagItem':
                        callback(null);
                        break;
                    case 'timer':
                        let msg = ins.getC2SMsg();
                        callback('timer', {
                            milliSecond:msg.milliSecond,
                            count:msg.count ? msg.count:99999,
                            jobId:msg.jobId
                        });
                        break;
                }
                break;
            case PROTO_TYPE.REQUEST:

                this.sendSessionLog("send: " + ins.route);
                this.sendSessionLog("timestampe: " + new Date().getTime());
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
                let subJobObject = this._getJobStrFromJobList(jobId);
                let runningJobObj = new runningJob(subJobObject, this.jobList, this.runningJobManager, this.consoleLogDepth + 1, this.envirment, this.socket);

                let subJobJson = g_protoMgr._deserializeJob(subJobObject.jobJson);
                let firstIns = subJobJson.getInstrument(0);

                let msg = ins.getC2SMsg();
                for (let key in msg) {
                    if (msg[key]) {
                        firstIns.setC2SParamValue(key, msg[key]);
                    }
                }
                runningJobObj.runAll(0, callback);
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
    };

    getName() {
        return this.jobObj.name;
    };
};


module.exports = runningJob;