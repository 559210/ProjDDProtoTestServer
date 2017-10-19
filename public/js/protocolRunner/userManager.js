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

    getRandomUserId(count) {
        let listLength = this.userIdList.length;
        let userIdObj = {};
        while(Object.keys(userIdObj).length < count) {
            let randomCode = Math.floor(Math.random() * listLength);
            let userId = this.userIdList[randomCode].userId;
            if (!userIdObj[userId]) {
                userIdObj[userId] = 1;
            }
        }

        let userIdList = [];
        for (let id in userIdObj) {
            userIdList.push(id);
        }
        return userIdList;
    }

    checkUserId(userId) {
        let find = false;
        for (let i = 0; i < this.userIdList.length; i++) {
            if (this.userIdList[i].userId == userId) {
                find = true;
                break;
            }
        }
        return find;
    }

    getUserIndexScope(from, to) {
        let userIdList = [];
        for (let i = 0; i < this.userIdList.length; i++) {
            if (this.userIdList[i].userIndex >= from && this.userIdList[i].userIndex <= to) {
                userIdList.push(this.userIdList[i].userId);
            }
        }
        return userIdList;
    }
}



module.exports = new UserManager();