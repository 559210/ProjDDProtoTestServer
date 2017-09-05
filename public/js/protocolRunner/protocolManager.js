"use strict";

let async = require('async');

let protoInstrumentClass = require('./protoInstrument');
let protoRunnerJobClass = require('./protoRunnerJob');
let g_common = require('../../../CommonJS/common');
let g_protocolRunnerPersistent = require('../../../models/protocolRunnerPersistent');
const PROTO_TYPE = require('./protocolType');

const JOB_TAG = 'job';

// TODO: 此类应该定位应该是协议和Job等所有数据的统一出入口，可以改名成XXXDataProvider
class ProtocolManager {
    constructor() {
        this.protocolBriefList = {}; // key是协议的分类，字符串类型，对于数据库中InstrumentPrototypes表的tag字段，value是数组，保存此分组下的所有协议
        this.protocolBriefList[JOB_TAG] = [];
        this.protocolBriefMap = {}; // key是协议的id，value是对应协议
        this.jobCache = {}; // key是job的id，value是{jobJson: }
    }

    init(callback) {
        let self = this;
        async.series([
            (cb) => {
                self._loadProtocolBriefList(cb);
            },
            (cb) => {
                self._loadAllJobToCache(cb);
            }
        ], (err) => {
            callback(err);
        });
    }

    // addJobProtoToBriefList(jobProto) {
    //     this.protocolBriefList.job.push(jobProto);

    //     this.protocolBriefMap = this.makeBriefMap(this.protocolBriefList);
    // }

    // removeJobProtoFromBriefList(jobName) {
    //     for (let i = 0; i < this.protocolBriefList.job.length; ++i) {
    //         if (this.protocolBriefList.job[i].routeName == jobName) {
    //             this.protocolBriefList.job.splice(i, 1);
    //             this.protocolBriefMap = this.makeBriefMap(this.protocolBriefList);
    //             break;
    //         }
    //     }
    // }

    // clearJobProto() {
    //     this.protocolBriefList.job = [];
    //     this.protocolBriefMap = this.makeBriefMap(this.protocolBriefList);
    // }

    _makeBriefList(protocols) {
        let breifProto = {};
        for (let key in protocols) {
            breifProto[key] = [];
            let protoArr = protocols[key];
            debugger;
            for (let i = 0; i < protoArr.length; ++i) {
                debugger;
                let proto = protoArr[i];
                let bp = {};
                bp.route = proto.route;
                bp.note = proto.note;
                bp.type = PROTO_TYPE.UNKNOWN;
                bp.c2s = null;
                bp.s2c = null;
                if (!g_common.isUndefinedOrNull(proto.ack)) {
                    bp.type = PROTO_TYPE.REQUEST;
                    bp.c2s = proto.request;
                    bp.s2c = proto.ack;
                } else if (!g_common.isUndefinedOrNull(proto.push)) {
                    bp.type = PROTO_TYPE.PUSH;
                    bp.c2s = null;
                    bp.s2c = proto.push;
                } else if (!g_common.isUndefinedOrNull(proto.notify)) {
                    bp.type = PROTO_TYPE.NOTIFY;
                    bp.c2s = proto.notify;
                    bp.s2c = null;
                }

                if (bp.route == 'connect') { // TODO: 暂时特殊处理,将来需要一个统一解决方案
                    bp.type = PROTO_TYPE.SYSTEM;
                }

                breifProto[key].push(bp);
            }
        }

        return breifProto;
    }

    // makeBriefMap(protocolBriefList) {
    //     let map = {};
    //     for (let key in protocolBriefList) {
    //         let protoGroup = protocolBriefList[key];
    //         for (let i = 0; i < protoGroup.length; ++i) {
    //             map[protoGroup[i].route] = protoGroup[i];
    //         }
    //     }

    //     return map;
    // }

    getProtocolBriefList() {
        return this.protocolBriefList;
    }

    getBriefProtocolById(id) {
        return this.protocolBriefMap[id];
    }

    // 此函数只有在需要导入服务器协议时候调用，一般不会调用
    saveBriefList(callback) {
        let protocols = require('../../../models/protocol');
        let briefList = this._makeBriefList(protocols);

        let keys = [];
        for (let key in briefList) {
            keys.push(key);
        }

        async.forEach(keys, (k, _cb) => {
            let protoGroup = briefList[k];
            async.eachSeries(protoGroup, (bp, cb) => {
                    g_protocolRunnerPersistent.addInstrumentPrototype(bp.route, JSON.stringify(bp.c2s), JSON.stringify(bp.s2c), bp.type, bp.note, k, cb);
                },
                (_err) => {
                    _cb(_err);
                });
        }, (err) => {
            console.log(err);
            callback(err);
        });
    }

    _saveJobToBreifList(jobObj, callback) {
        let bp = this._getJobProtocol(jobObj);
        let self = this;

        g_protocolRunnerPersistent.addInstrumentPrototype(bp.route, JSON.stringify(bp.c2s), JSON.stringify(bp.s2c), bp.type, bp.note, JOB_TAG, (err, id) => {
            if (err) {
                return callback(err);
            }

            bp.id = id;
            bp.tag = JOB_TAG;
            self.protocolBriefList[JOB_TAG].push(bp);
            self.protocolBriefMap[bp.id] = bp;
            callback(null);
        });
    }

    _findBreifListIdByJobId(jobId, callback) {
        let jobIdStr = jobId.toString();
        let jobBreifList = this.protocolBriefList[JOB_TAG];
        for (let i = 0; i < jobBreifList.length; ++i) {
            if (jobBreifList[i].route == jobIdStr) {
                return callback(null, jobBreifList[i].id);
            }
        }

        callback(new Error('Cannot find breif list id'));
    }

    _updateJobInBreifList(jobObj, callback) {
        let bp = this._getJobProtocol(jobObj);
        let self = this;
        async.waterfall([
            (cb) => {
                self._findBreifListIdByJobId(jobObj.id, cb);
            },
            (instId, cb) => {
                let proto = self.protocolBriefMap[instId];
                proto.note = bp.note;
                proto.c2s = bp.c2s;
                proto.s2c = bp.s2c;

                g_protocolRunnerPersistent.updateInstumentPrototype(proto.id, proto.route, JSON.stringify(proto.c2s), JSON.stringify(proto.s2c), proto.note, JOB_TAG, (err) => {
                    cb(err);
                });
            }
        ], (err) => {
            callback(err);
        });
    }

    _removeJobFromBreifList(instId, callback) {
        let self = this;

        g_protocolRunnerPersistent.removeInstrumentPrototype(instId, (err) => {
            if (err) {
                return callback(err);
            }

            let jobProtos = self.protocolBriefList[JOB_TAG];
            for (let i = 0; i < jobProtos.length; ++i) {
                if (jobProtos[i].id == instId) {
                    jobProtos.splice(i, 1);
                    break;
                }
            }

            delete self.protocolBriefMap[instId];
            callback(null);
        });
    }

    // 加在所有数据库中的协议数据到内存，这些协议数据应该包括静态协议和job对应的伪协议
    _loadProtocolBriefList(callback) {
        let self = this;

        g_protocolRunnerPersistent.loadAllInstrumentsPrototype((err, datas) => {
            if (err) {
                return callback(err);
            }

            self.protocolBriefList = {};
            self.protocolBriefList[JOB_TAG] = [];
            self.protocolBriefMap = {};

            for (let i = 0; i < datas.length; ++i) {
                let dt = datas[i];
                let bp = {};
                bp.id = dt.instId;
                bp.route = dt.name;
                bp.note = dt.note;
                bp.type = dt.type;
                bp.c2s = JSON.parse(dt.c2s);
                bp.s2c = JSON.parse(dt.s2c);
                bp.tag = dt.tag;

                if (g_common.isUndefinedOrNull(self.protocolBriefList[dt.tag])) {
                    self.protocolBriefList[dt.tag] = [];
                }
                self.protocolBriefList[dt.tag].push(bp);
                self.protocolBriefMap[bp.id] = bp;
            }

            callback(null);

        });
    }

    addNewProtocol(proto, callback) {
        let self = this;
        // 查找是否有同名的proto
        let foundProtoId = -1;
        for (let protoId in this.protocolBriefMap) {
            if (this.protocolBriefMap[protoId].route === proto.route) {
                foundProtoId = protoId;
            }
        }

        console.log(1, proto.type);
        switch (proto.type) {
            case 'request':
                proto.type = PROTO_TYPE.REQUEST;
                break;
            case 'push':
                proto.type = PROTO_TYPE.PUSH;
                break;
            case 'notify':
                proto.type = PROTO_TYPE.NOTIFY;
                break;
            case 'system':
                proto.type = PROTO_TYPE.SYSTEM;
                break;
        }
        console.log(2, proto.type);
        if (foundProtoId == -1) {
            g_protocolRunnerPersistent.addInstrumentPrototype(proto.route, JSON.stringify(proto.c2s), JSON.stringify(proto.s2c), proto.type, proto.note, proto.tag, (err, protoId) => {
                if (err) {
                    return callback(err);
                }

                proto.id = protoId;
                if (g_common.isUndefinedOrNull(self.protocolBriefList[proto.tag])) {
                    self.protocolBriefList[proto.tag] = [];
                }
                self.protocolBriefList[proto.tag].push(proto);
                self.protocolBriefMap[proto.id] = proto;

                return callback(null);
            });
        } else {
            return callback(new Error('duplicated route name'));
        }
    }

    updateProtocol(proto, callback) {
        let self = this;

        let foundProtoId = -1;
        for (let protoId in this.protocolBriefMap) {
            if (this.protocolBriefMap[protoId].route === proto.route && this.protocolBriefMap[protoId].id != proto.id) {
                return callback(new Error('duplicated route name'));
            }
        }

        let targetProto = this.protocolBriefMap[proto.id];
        if (targetProto) {
            g_protocolRunnerPersistent.updateInstumentPrototype(proto.id, proto.route, JSON.stringify(proto.c2s), JSON.stringify(proto.s2c), proto.note, proto.tag, (err) => {
                if (err) {
                    return callback(err);
                }

                switch (proto.type) {
                    case 'request':
                        targetProto.type = PROTO_TYPE.REQUEST;
                        break;
                    case 'push':
                        targetProto.type = PROTO_TYPE.PUSH;
                        break;
                    case 'notify':
                        targetProto.type = PROTO_TYPE.NOTIFY;
                        break;
                    case 'system':
                        targetProto.type = PROTO_TYPE.SYSTEM;
                        break;
                }

                targetProto.route = proto.route;
                targetProto.note = proto.note;
                if (proto.c2s) {
                    targetProto.c2s = proto.c2s;
                } else {
                    delete targetProto.c2s;
                }

                if (proto.s2c) {
                    targetProto.s2c = proto.s2c;
                } else {
                    delete targetProto.s2c;
                }

                let oldTag = targetProto.tag;
                targetProto.tag = proto.tag;

                if (oldTag !== targetProto.tag) {
                    let oldTagCate = self.protocolBriefList[oldTag];
                    for (let i = 0; i < oldTagCate.length; ++i) {
                        if (oldTagCate[i].id === targetProto.id) {
                            oldTagCate.splice(i, 1);

                            if (oldTagCate.length == 0) {
                                delete self.protocolBriefList[oldTag];
                            }
                            break;
                        }
                    }

                    if (self.protocolBriefList[targetProto.tag] === undefined) {
                        self.protocolBriefList[targetProto.tag] = [];
                    }

                    self.protocolBriefList[targetProto.tag].push(targetProto);

                    callback(null);
                }
            });

        } else {
            callback(new Error('can not find the protocol'));
        }
    }

    // 获取job所对应的伪协议的id
    getJobInstId(jobId) {
        let jobProtos = this.protocolBriefList[JOB_TAG];
        for (let i = 0; i < jobProtos.length; ++i) {
            let proto = jobProtos[i];
            if (proto.route == jobId.toString()) {
                return proto.id;
            }
        }

        return -1;
    }

    // 将数据库中所有job都加在到内存中缓存（注意，这里并不构建job对象，只存数据库中原始数据）
    _loadAllJobToCache(callback) {
        let self = this;
        async.waterfall([
            (cb) => {
                // 加载job列表
                g_protocolRunnerPersistent.loadJobList(cb);
            },
            (list, cb) => {
                // 逐个加载所有job

                async.map(list, (item, _cb) => {
                    g_protocolRunnerPersistent.loadJobById(item, _cb);
                }, (err, results) => {
                    if (err) {
                        return cb(err);
                    }

                    for (let i = 0; i < results.length; ++i) {
                        let res = results[i];

                        self.jobCache[res.jobId] = {
                            jobJson: res.jobJson
                        };
                    }

                    cb(null);
                });
            }
        ], (err) => {
            callback(err);
        });
    }

    // 检查确保protocol brief list中包含所有job伪协议，一个不多一个不少
    // _checkJobAndProtocolBreifList(callback) {
    //     let addList = [];
    //     let removeList = [];
    //     for (let i = 0; i < this.jobCache.length; ++i) {
    //         let job = this.jobCache[i];
    //         let found = false;
    //         for (let j = 0; j < this.protocolBriefList.length; ++j) {
    //             let proto = this.protocolBriefList[j];

    //             if (proto.type == PROTO_TYPE.JOB) {
    //                 if (proto.route == job.name) {
    //                     found = true;
    //                     // TODO: 是否要检查定义的参数发生了变化？
    //                     break;
    //                 }
    //             }
    //         }

    //         if (found == false) {
    //             addList.push(job.name);
    //         }
    //     }

    //     for (let i = 0; i < this.protocolBriefList.length; ++i) {
    //         let proto = this.protocolBriefList[i];

    //         if (proto.type == PROTO_TYPE.JOB) {
    //             for (let j = 0; j < this.jobCache.length; ++i) {
    //                 let job = this.jobCache[j];
    //                 let found = false;

    //                 if (proto.route == job.name) {
    //                     found = true;
    //                 }

    //                 break;
    //             }

    //             if (found == false) {
    //                 removeList.push(proto.route);
    //             }
    //         }
    //     }

    //     for (let i = 0; i < addList.length; ++i) {
    //         // TODO: 把job添加到伪协议中，并入库
    //     }

    //     for (let i = 0; i < removeList.length; ++i) {
    //         // TODO: 把伪协议删除，并存盘
    //     }
    // }

    _addJobToCache(jobObj, callback) {
        let self = this;
        let jobJson = this._serializeJob(jobObj);

        // 先存盘，才能得到id，然后放入jobCache中去
        g_protocolRunnerPersistent.saveJob(jobJson, (err, jobId) => {
            if (err) {
                return callback(err);
            }

            jobObj.id = jobId;

            self.jobCache[jobId] = {
                jobJson: jobJson
            };


            callback(null);
        });
    }

    _updateJobInCache(jobObj, callback) {
        let self = this;
        this.getCacheJobById(jobObj.id, (err, cachedJob) => {
            if (err) {
                return callback(err);
            }
            let jobJson = self._serializeJob(jobObj);

            g_protocolRunnerPersistent.updateJob(jobObj.id, jobJson, (err) => {
                if (err) {
                    return callback(err);
                }

                cachedJob.jobJson = jobJson;
                callback(null);
            });
        });
    }

    _removeJobFromCache(jobId, callback) {
        let self = this;
        this.getCacheJobById(jobId, (err, cachedJob) => {
            if (err) {
                return callback(err);
            }

            g_protocolRunnerPersistent.removeJob(jobId, (err) => {
                if (err) {
                    return callback(err);
                }

                delete self.jobCache[jobId];
                callback(null);
            });
        });
    }

    _serializeInstrument(instrument) {
        let obj = {
            id: instrument.id,
            route: instrument.route,
            pluginFunc: instrument.pluginFunc,
            params: []
        };

        for (let key in instrument.c2sParsedParams) {
            let param = instrument.c2sParsedParams[key];
            let value = param.value;
            if ( (value !== null) && (value !== undefined) ) {
                if (param.type == 'int') {
                    value = parseInt(value);
                } else if (param.type == 'string') {
                    value = value.toString();
                }
            }
            obj.params.push({
                name: param.name, 
                value: value,
                isVar: param.isVar
            });
        }

        return JSON.stringify(obj);
    }

    _serializeJob(jobObj) {
        let obj = {
            name: jobObj.name,
            id: jobObj.id,
            tag: jobObj.tag,
            instruments: []
        };

        for (let i = 0; i < jobObj.instruments.length; ++i) {
            obj.instruments.push(this._serializeInstrument(jobObj.instruments[i]));
        }
        return JSON.stringify(obj);
    }

    _deserializeJob(jsonStr) {
        // TODO: 需要处理协议内容变动的情况

        let jobObj = new protoRunnerJobClass();
        try {
            let obj = JSON.parse(jsonStr);
            jobObj.name = obj.name;
            jobObj.id = obj.id;
            jobObj.tag = obj.tag;
            for (let i = 0; i < obj.instruments.length; ++i) {
                let instObj = JSON.parse(obj.instruments[i]);
                let instrument = new protoInstrumentClass(instObj.id);

                if (instObj.pluginFunc) {
                    instrument.setPluginFunc(instObj.pluginFunc);
                }

                for (let j = 0; j < instObj.params.length; ++j) {
                    let param = instObj.params[j];
                    // TODO: 需要考虑此name的参数已经不存在的情况，另外要考虑新的协议参数未被设置的情况
                    instrument.setC2SParamValue(param.name, param.value, param.isVar);

                    // 加入标签对应的索引
                    if (instObj.route == 'tagItem') {
                        jobObj.tagList[param.value] = i;
                    }
                }
                jobObj.addInstrument(instrument);
            }
        } catch (e) {
            console.error(e);
            return null;
        }
        return jobObj;
    }

    _getJobProtocol(jobObj) {
        let proto = {};
        proto.id = -1;
        proto.route = jobObj.id.toString();
        proto.note = jobObj.name;
        proto.type = PROTO_TYPE.JOB;
        proto.c2s = null;
        proto.s2c = null;

        if (jobObj.instruments) {
            for (let i = 0; i < jobObj.instruments.length; ++i) {
                let instObj = jobObj.getInstrument(i);
                let breifProto = this.getBriefProtocolById(instObj.id);

                if (g_common.isUndefinedOrNull(breifProto)) {
                    return null;
                }

                if (i == 0) {
                    proto.c2s = breifProto.c2s;
                }

                if (i == jobObj.instruments.length - 1) {
                    proto.s2c = breifProto.s2c;
                }
            }
        }
        return proto;
    }

    // _getJobProtocol(jobStr) {
    //     // 将此job转换成消息协议格式，以便可以被封成instrument被别的job使用
    //     let obj = JSON.parse(jsonStr);

    // let proto = {};
    // proto.route = obj.name;
    // proto.note = obj.name;

    // for (let i = 0; i < obj.instruments.length; ++i) {
    //     let instObj = JSON.parse(obj.instruments[i]);
    //     let breifProto = this.getBriefProtocolByRoute(instObj.route);

    //     if (g_common.isUndefinedOrNull(breifProto)) {
    //         return null;
    //     }

    //     if (i == 0) {
    //         proto.type = PROTO_TYPE.JOB;
    //         proto.c2s = breifProto.c2s;
    //     }

    //     if (i == this.instruments.length - 1) {
    //         proto.s2c = breifProto.s2c;
    //     }
    // }
    // return proto;
    // }


    getJobIdAndJobJsonByName(jobName, callback) {
        for (let key in this.jobCache) {
            let jobJson = this.jobCache[key].jobJson;
            let job = JSON.parse(jobJson);
            if (job.name == jobName) {
                return callback(null, key, jobJson);
            }
        }

        return callback(new Error('jobId not found'));
    }

    getCacheJobById(jobId, callback) {
        if (g_common.isUndefinedOrNull(this.jobCache[jobId]) == false) {
            return callback(null, this.jobCache[jobId]);
        }

        return callback(new Error('job not found'));
    }

    // job的增删改
    createJob(jobName, callback) {
        let self = this;
        async.waterfall([
            (cb) => {
                self.getJobIdAndJobJsonByName(jobName, (err) => {
                    if (!err) {
                        return cb(new Error('duplicated job name!'));
                    }

                    cb(null);
                });
            },
            (cb) => {
                let jobObj = new protoRunnerJobClass(jobName);
                self._addJobToCache(jobObj, (err) => {
                    cb(err, jobObj);
                });
            },
            (jobObj, cb) => {
                self._saveJobToBreifList(jobObj, (err) => {
                    cb(err, jobObj);
                })
            },
            (jobObj, cb) => {
                // _addJobToCache 时会insert到数据库中，但是必须insert以后才能得到id，所以得到id以后再次存盘，可以把id记录进jobJson中
                this.saveJob(jobObj, (err) => {
                    cb(err, jobObj);
                });
            }
        ], (err, jobObj) => {
            callback(err, jobObj);
        });
    }

    loadJobByName(jobName, callback) {
        let self = this;
        this.getJobIdAndJobJsonByName(jobName, (err, jobId, jobJson) => {
            if (err) {
                return callback(err);
            }

            let jobObj = self._deserializeJob(jobJson);
            if (g_common.isUndefinedOrNull(jobObj)) {
                return callback(new Error('Cannot deserializeJob'));
            }

            callback(null, jobObj);
        });
    }

    loadJobById(jobId, callback) {
        let self = this;
        this.getCacheJobById(jobId, (err, cacheJob) => {
            if (err) {
                return callback(err);
            }

            let jobJson = cacheJob.jobJson;
            let jobObj = self._deserializeJob(jobJson);
            if (g_common.isUndefinedOrNull(jobObj)) {
                return callback(new Error('Cannot deserializeJob'));
            }

            callback(null, jobObj);
        });
    }

    saveJob(jobObj, callback) {
        let self = this;
        async.series([
            (cb) => {
                self._updateJobInCache(jobObj, cb);
            },
            (cb) => {
                self._updateJobInBreifList(jobObj, cb);
            }
        ], (err) => {
            callback(err);
        })
    }

    removeJob(jobId, callback) {
        let self = this;
        async.series(
            [
                (cb) => {
                    self._removeJobFromCache(jobId, cb);
                },
                (cb) => {
                    console.log('-----------', self.getJobInstId(jobId));
                    self._removeJobFromBreifList(self.getJobInstId(jobId), cb);
                }
            ], (err) => {
                callback(err);
            });
    }

    getAllJobList() {
        let ret = [];
        // {"name":"xxx","id":1,"instruments":[]}
        let reg = /\"name\":\"(.*?)\"/;
        let regTag = /\"tag\":\"(.*?)\"/;
        for (let key in this.jobCache) {
            let jobJson = this.jobCache[key].jobJson;

            let res = reg.exec(jobJson);
            let jobName = res[1];

            res = regTag.exec(jobJson);
            let jobTag = (res && res.length >= 2) ? res[1] : '';

            // for test
            // jobTag = 'AAA';

            ret.push({
                id: parseInt(key),
                name: jobName,
                tag: jobTag
            });
        }

        return ret;
    }

    updateJobTag(jobId, newTag, callback) {
        let self = this;
        async.waterfall([
            (cb) => {
                self.loadJobById(jobId, cb);
            },
            (jobObj, cb) => {
                jobObj.tag = newTag;
                self.saveJob(jobObj, cb);
            }
        ], (err) => {
            console.log('-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-> ', err);
            callback(err);
        });
    }
}



module.exports = new ProtocolManager();