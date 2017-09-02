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
        this.outputs = [];
    };

    setRunningJobId(id) {
        this.runningJobId = id;
    }

    getRunningJobId() {
        return this.runningJobId;
    }

    sendSessionLog(text) {
        let t = text;
        for (let i = 0; i < this.consoleLogDepth; ++i) {
            t = '\t-' + t;
        }
        let timestamp = Date.parse(new Date());
        // this.outputs += text + '\n';
        console.log("2" + t);
        this.outputs.push({text: t, timestamp: timestamp});
        this.outputs.push({text: "--", timestamp: timestamp});
        
        if (commonJs.isUndefinedOrNull(this.session) === false) {
            this.runningJobManager.log(this.runningJobId, t, timestamp); 
        }
        console.log("1" + t);


    };

    clearOutputs() {
        this.outputs = [];
    }

    getOutputs() {
        console.log("-->%j", this.outputs);
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

    runAll(instruments, callback) {
        this.clearOutputs();
        this.sendSessionLog('------------------------------->');
        this.sendSessionLog('start job' + this.jobObj.name);
        async.eachSeries(instruments, (item, cb) => {
                item.runner = this;
                this._runInstrument(item, cb);
            },
            (err) => {
                this.sendSessionLog('<-------------------------');
                if (err == 'jump') {
                    //return callback(null);
                    this.runAll(this.newInsArray, callback);
                } else {
                    callback(err);
                }
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
            if (value !== null) {
               self.envirment.variableManager.createVariable(c2sParams.name.value, value, c2sParams.value.type);
            }
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
            case 'gg':
                if (typeof p1 === 'number' && typeof p2 === 'number') {
                    result = Number(p1 > p2);
                }
            break;
            case 'ge':
                if ((typeof p1 === 'number' && typeof p2 === 'number') ||
                    (typeof p1 === 'string' && typeof p2 === 'string')) {
                    result = Number(p1 === p2);
                }
                break;
            case 'gl':
                if (typeof p1 === 'number' && typeof p2 === 'number') {
                    result = Number(p1 < p2);
                }
                break;
            case 'gge':
                if (typeof p1 === 'number' && typeof p2 === 'number') {
                    result = Number(p1 >= p2);
                }
            break;
            case 'gle':
                if (typeof p1 === 'number' && typeof p2 === 'number') {
                    result = Number(p1 <= p2);
                }
                break;
            case 'gne':
                if ((typeof p1 === 'number' && typeof p2 === 'number') ||
                    (typeof p1 === 'string' && typeof p2 === 'string')) {
                    result = Number(p1 !== p2);
                }
                break;
            case 'gnull':
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

    _getInstrumentsByIndex(index) {
        let newInsArray = [];
        for (let i = 0; i < this.jobObj.instruments.length; i++) {
            if (i >= index) {
                newInsArray.push(this.jobObj.instruments[i]);
            }
        }
        return newInsArray;
    }

    _executeCurrentTagContent(tagName, callback) {
        // 从头搜索此标签的位置
        let index = -1;
        for (let i = 0; i < this.jobObj.instruments.length; i++) {
            if (this.jobObj.instruments[i].type == 4 && this.jobObj.instruments[i].route == 'tagItem') {
                let msg = this.jobObj.instruments[i].getC2SMsg();
                if (msg.name == tagName) {
                    index = i;
                    break;
                }
            }
        }
        this.newInsArray = this._getInstrumentsByIndex(index);
        callback('jump');
    }

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
					case 'gg':
                    case 'ge':
                    case 'gl':
                    case 'gge':
                    case 'gle':
                    case 'gne':
                    case 'gnull':
                        let compareResult = this._compareValue(ins);
                        if (compareResult.result === 1) {
                            // 条件判定成立，走标签流程
                            this._executeCurrentTagContent(compareResult.tagName, callback);
                        } else if (compareResult.result === 2) {
                            // 无条件，继续执行
                            if (compareResult.tagName === null || compareResult.tagName === undefined || compareResult.tagName === '') {
                                callback(null);
                            } else {
                                this._executeCurrentTagContent(compareResult.tagName, callback);
                            }
                        } else {
                            // 发生错误,终止执行JOB
                            callback(new Error('发生错误, result = %j', compareResult.result));
                        }
                        break;
                    case 'tagItem':
                        callback(null);
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
                    let runningJobObj = new runningJob(job, this.session, this.consoleLogDepth + 1, this.envirment);

                    let firstIns = job.getInstrument(0);
                    let msg = ins.getC2SMsg();
                    for (let key in msg) {
                        if (msg[key]) {
                            firstIns.setC2SParamValue(key, msg[key]);
                        }
                    }


                    runningJobObj.runAll(runningJobObj.jobObj.instruments, callback);

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