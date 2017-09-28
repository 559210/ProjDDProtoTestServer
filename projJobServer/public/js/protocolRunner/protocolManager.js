"use strict";

let async = require('async');

let protoInstrumentClass = require('./protoInstrument');
let protoRunnerJobClass = require('./protoRunnerJob');
let g_common = require('../../../CommonJS/common');
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

    setBriefListObject(ins) {
        for (let id in ins) {
            this.protocolBriefMap[id] = ins[id];
        }
    }

    getProtocolBriefList() {
        return this.protocolBriefList;
    }

    getBriefProtocolById(id) {
        return this.protocolBriefMap[id];
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
            if (param.isVar === true) {
                // 是变量 忽略类型
            } else if ( (value !== null) && (value !== undefined) ) {
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

    getCacheJobById(jobId, callback) {
        if (g_common.isUndefinedOrNull(this.jobCache[jobId]) == false) {
            return callback(null, this.jobCache[jobId]);
        }

        return callback(new Error('job not found'));
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
}

module.exports = new ProtocolManager();