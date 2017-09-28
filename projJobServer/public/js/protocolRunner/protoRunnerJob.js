'use strict'
let async = require('async');

let commonJs = require('../../../CommonJS/common');
let variableManagerClass = require('./variableManager');
let protoInstrumentClass = require('./protoInstrument');
let g_protoMgr = require('./protocolManager');
let pomeloClass = require('./pomeloClient');


const PROTO_TYPE = require('./protocolType');

class protoRunnerJob {
    constructor(jobName, evn) {
        g_protoMgr = require('./protocolManager');  // protoMgr和protoRunnerJob存在互相require的问题，所以在构造instrument时再require一次
        this.instruments = [];
        this.name = jobName;
        this.id = -1;

        this.tagList = {};

        // this.envirment = evn ? evn : {
        //     pomelo: null,
        //     variableManager: new variableManagerClass()
        // };

        // this.session = null;
        // this.sessionDepth = 0;
    }

    // setSession(sess, depth) {
    //     this.session = sess;
    //     if (depth) {
    //         this.sessionDepth = depth;
    //     }
    // }

    // sendSessionLog(text) {
    //     for (let i = 0; i < this.sessionDepth; ++i) {
    //         text = '\t' + text;
    //     }
    //     if (commonJs.isUndefinedOrNull(this.session) == false) {
    //         this.session.Console(text); 
    //     }
    //     console.log(text);
    // }

    addInstrument(ins) {
        this.instruments.push(ins);
    }

    removeInstrument(index) {
        if (index < 0 || index >= this.instruments.length) {
            return false;
        }

        this.instruments.splice(index, 1);
        return true;
    }

    getAllInstruments() {
        return this.instruments;
    }

    getInstrument(index) {
        return this.instruments[index];
    }

    // runByStep(index, callback) {
    //     let ins = this.getInstrument(index);
    //     if (ins) {
    //         this._runInstrument(ins, callback);
    //     } else {
    //         return callback(new Error('no instrument was found'));
    //     }
    // }

    // runAll(callback) {
    //     this.sendSessionLog('------------------------------->');
    //     this.sendSessionLog('start job' + this.name);
    //     async.eachSeries(this.instruments, (item, cb) => {
    //             this._runInstrument(item, cb);
    //         },
    //         (err) => {
    //             this.sendSessionLog('<-------------------------');
    //             callback(err);
    //         });
    // }

    // _runInstrument(ins, callback) {
    //     let self = this;

    //     switch (ins.type) {
    //         case PROTO_TYPE.CONNECT:
    //             if (this.envirment.pomelo) {
    //                 self.envirment.pomelo.removeAllListeners('io-error');
    //                 self.envirment.pomelo.removeAllListeners('close');

    //                 this.envirment.pomelo.disconnect();
    //                 this.envirment.pomelo = null;
    //             }

    //             this.envirment.pomelo = new pomeloClass();

    //             let params = ins.getC2SMsg();
    //             this.envirment.pomelo.init({
    //                 host: params['host'],
    //                 port: params['port'],
    //                 log: true
    //             }, (socketObj) => {
    //                 if (commonJs.isUndefinedOrNull(socketObj)) {
    //                     return callback(new Error('pomelo init failed!'));
    //                 }

    //                 self.envirment.pomelo.on('io-error', () => {
    //                     return callback(new Error('io-error'));
    //                 });
    //                 self.envirment.pomelo.on('close', () => {
    //                     return callback(new Error('network closed'));
    //                 });
    //                 return callback(null);
    //             });
    //             break;
    //         case PROTO_TYPE.REQUEST:

    //             self.sendSessionLog("send: " + ins.route);
    //             self.sendSessionLog("with params: " + JSON.stringify(ins.getC2SMsg()));
    //             this.envirment.pomelo.request(ins.route, ins.getC2SMsg(), (data) => {
    //                 // TODO: 这里要移到真正整个任务做完的地方
    //                 // self.envirment.pomelo.removeAllListeners('io-error');
    //                 // self.envirment.pomelo.removeAllListeners('close');

    //                 ins.onS2CMsg(data, callback);
    //                 // return callback(null);
    //             });
    //             break;
    //         case PROTO_TYPE.JOB:
    //             let jobId = ins.route;
    //             g_protoMgr.loadJobById(jobId, (err, job) => {
    //                 if (err) {
    //                     return callback(err);
    //                 }

    //                 job.setSession(self.session, self.sessionDepth + 1);
    //                 job.envirment = self.envirment;
    //                 let firstIns = job.getInstrument(0);
    //                 let msg = ins.getC2SMsg();
    //                 for (let key in msg) {
    //                     if (msg[key]) {
    //                         firstIns.setC2SParamValue(key, msg[key]);
    //                     }
    //                 }


    //                 job.runAll(callback);

    //             });
    //             break;
    //         case PROTO_TYPE.PUSH:
    //             self.sendSessionLog("listening to onPush message: " + ins.route);
    //             self.envirment.pomelo.removeAllListeners(ins.route);
    //             this.envirment.pomelo.on(ins.route, (data) => {
    //                 self.sendSessionLog("onPush: " + ins.route);
    //                 ins.onS2CMsg(data, (err)=>{});
    //             });
    //             callback(null);
    //             break;
    //         case PROTO_TYPE.NOTIFY:
    //             self.sendSessionLog("send notify: " + ins.route);
    //             self.sendSessionLog("with params: " + JSON.stringify(ins.getC2SMsg()));
    //             this.envirment.pomelo.notify(ins.route, ins.getC2SMsg());
    //             callback(null);
    //             break;
    //     }
    // }

    // serialize() {
    //     let obj = {
    //         name: this.name,
    //         instruments: []
    //     };

    //     for (let i = 0; i < this.instruments.length; ++i) {
    //         obj.instruments.push(this.instruments[i].serialize());
    //     }
    //     return JSON.stringify(obj);
    // }

    // deserialize(jsonStr) {
    //     // TODO: 需要处理协议内容变动的情况
    //     try {
    //         let obj = JSON.parse(jsonStr);
    //         this.name = obj.name;
    //         for (let i = 0; i < obj.instruments.length; ++i) {
    //             let instObj = JSON.parse(obj.instruments[i]);
    //             let instrument = new protoInstrumentClass(instObj.route);

    //             if (instObj.pluginFunc) {
    //                 instrument.setPluginFunc(instObj.pluginFunc);
    //             }

    //             for (let j = 0; j < instObj.params.length; ++j) {
    //                 let param = instObj.params[j];
    //                 // TODO: 需要考虑此name的参数已经不存在的情况，另外要考虑新的协议参数未被设置的情况
    //                 instrument.setC2SParamValue(param.name, param.value, param.isVar);
    //             }

    //             this.addInstrument(instrument);

    //         }
    //     } catch (e) {
    //         console.error(e);
    //         return false;
    //     }
    //     return true;
    // }

    getJobDetail() {
        // {
        //     route: '',
        //     type: '',
        //     c2s: [],
        //     s2c: []
        // }

        console.log('getJobDetail------------> %j, %j, %j', this.name, this.id, typeof this.id);

        let detail = [];

        for (let i = 0; i < this.instruments.length; ++i) {
            let ins = this.instruments[i];
            let det = {
                route: ins.route,
                type: ins.type,
                note: ins.note,
                c2s: [],
                s2c: [],
                hasScript: ins.getPluginFunc() != null ? true : false
            };

            let c2s = ins.getParsedC2SParams();

            for (let key in c2s) {
                let prot = c2s[key];
                det.c2s.push(prot);
            }

            let s2c = ins.getParsedS2CParams();
            for (let key in s2c) {
                let prot = s2c[key];
                det.s2c.push(prot);
            }
            detail.push(det);
        }

        return {
            jobName: this.name,
            jobId: this.id,
            instruments: detail
        };
    }

    // getJobProtocol() {
    //     // 将此job转换成消息协议格式，以便可以被封成instrument被别的job使用
    //     let proto = {};
    //     proto.route = this.name;
    //     proto.note = this.name;

    //     for (let i = 0; i < this.instruments.length; ++i) {
    //         let ins = this.instruments[i];
    //         let breifProto = g_protoMgr.getBriefProtocolByRoute(ins.route);

    //         if (commonJs.isUndefinedOrNull(breifProto)) {
    //             return null;
    //         }

    //         if (i == 0) {
    //             proto.type = PROTO_TYPE.JOB;
    //             proto.c2s = breifProto.c2s;
    //         }

    //         if (i == this.instruments.length - 1) {
    //             proto.s2c = breifProto.s2c;
    //         }
    //     }
    //     return proto;
    // }

    moveInstrumentUp(index) {
        if (index <= 0 || index >= this.instruments.length) {
            return false;
        }

        let swapIndex = index - 1;

        this.instruments[index] = this.instruments.splice(swapIndex, 1, this.instruments[index])[0];

        this.instruments[index].clearC2SParams();
        this.instruments[swapIndex].clearC2SParams();

        return true;
    }

    moveInstrumentDown(index) {
        if (index < 0 || index >= this.instruments.length - 1) {
            return false;
        }

        let swapIndex = index + 1;

        this.instruments[index] = this.instruments.splice(swapIndex, 1, this.instruments[index])[0];

        this.instruments[index].clearC2SParams();
        this.instruments[swapIndex].clearC2SParams();

        return true;
    }
}


module.exports = protoRunnerJob;