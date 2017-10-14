"use strict";

let async = require('async');

let protoInstrumentClass = require('./protoInstrument');
let protoRunnerJobClass = require('./protoRunnerJob');
let g_common = require('../../../CommonJS/common');
let g_protocolRunnerPersistent = require('../../../models/protocolRunnerPersistent');
const PROTO_TYPE = require('./protocolType');

const JOB_TAG = 'job';

// TODO: 此类应该定位应该是协议和Job等所有数据的统一出入口，可以改名成XXXDataProvider
class UserManager {
    constructor() {
        this.userIdList = [];
    }

    loadUserIdList(cb) {
        g_protocolRunnerPersistent.loadUserIdList((err, datas) => {
            this.userIdList = datas;
            return cb(err);
        });
    }

    getRandomUserId() {
        let listLength = this.userIdList.length;
        let randomCode = Math.floor(Math.random() * listLength);
        let userId = this.userIdList[randomCode].userId;
        return userId;
    }
}



module.exports = new UserManager();