'use strict';
let async = require('async');

let commonJs = require('../../../CommonJS/common');
let runningJobClass = require('./runningJob');
let g_protoMgr = require('./protocolManager');
let runProtoClass = require('./runProtocol');


class runningJobManager{
    constructor() {
        this.sessionMap = {};           // uid -> session
        this.runningJobMap = {};        // uid -> job map( runningJobId -> runningJobObject)
        this.runningJobSubscribeMap = {};  // runningJobId --> uid map(uid -> color)

        this.maxRunningJobId = 0;
    }

    registerSession(uid, sessionObj) {
        this.sessionMap[uid] = sessionObj;
    }

    // unRegisterSession(uid) {
    //     delete this.sessionMap[uid];
    //     // for (let jobId in this.runningJobSubscribeMap) {
    //     //     let sessions = this.runningJobSubscribeMap[jobId];
    //     //     let idx = sessions.indexOf(sessionId);
    //     //     if (idx >= 0) {
    //     //         sessions.splice(idx, 1);
    //     //     }
    //     // }
    // }

    runJob(socket, data, cb) {
        let self = this;
        let uid = data.uid;
        let jobList = data.jobList;
        let idList = data.idList;
        let runningJobId = data.runningJobId;
        let userList = data.userList;

        g_protoMgr.setBriefListObject(idList);
        if (commonJs.isUndefinedOrNull(this.runningJobMap[uid])) {
            this.runningJobMap[uid] = {};
        }

        async.eachSeries(userList, function(gameUserId, callback) {
            setTimeout(function() {
                let runningJobObj = new runningJobClass(jobList[0], jobList, self, 0, null, socket, gameUserId);
                runningJobObj.setRunningJobId(runningJobId);
                self.runningJobMap[uid][runningJobId] = runningJobObj;
                runningJobObj.runAll(0, function(err) {});
                callback(null);
            }, 500);   // 每个测试账号每隔500毫秒跑一个job
        }, function(err) {
            return cb(err);
        });
    }

    // 参数color可以省略，用于控制前端显示的颜色用的，省略的话用默认颜色
    subscribeToJobConsole(socket, data) {
        let uid = data.uid;
        let jobId = data.runningJobId;
        let color = data.color;
        if (commonJs.isUndefinedOrNull(this.runningJobSubscribeMap[jobId])) {
            this.runningJobSubscribeMap[jobId] = {};
        }

        let jobSubscribeMap = this.runningJobSubscribeMap[jobId];
        if (commonJs.isUndefinedOrNull(jobSubscribeMap[uid])) {

            jobSubscribeMap[uid] = {uid: uid, color: color};

            // subscribe之后要把之前所有log都发送过去
            let jobObj = this.runningJobMap[uid][jobId];
            if (commonJs.isUndefinedOrNull(jobObj)) {
                return;
            }

            let historyOutputs = jobObj.getOutputs();
            //console.log('1发送历史日志 条数：%j', historyOutputs.length);
            for (let i in historyOutputs) {
                socket.emit('jobLog', {runningJobId:jobId, text:historyOutputs[i].text, timestamp:historyOutputs[i].timestamp});
            }
        }
        else {
            let jobObj = this.runningJobMap[uid][jobId];
            let historyOutputs = jobObj.getOutputs();
            //console.log('2发送历史日志 条数：%j', historyOutputs.length);
            for (let i in historyOutputs) {
                socket.emit('jobLog', {runningJobId:jobId, text:historyOutputs[i].text, timestamp:historyOutputs[i].timestamp});
            }
        }
    }

    unSubscribeToJobConsole(socket, data) {
        let uid = data.uid;
        let jobId = data.runningJobId;
        if (commonJs.isUndefinedOrNull(this.runningJobSubscribeMap[jobId]) || commonJs.isUndefinedOrNull(this.runningJobSubscribeMap[jobId][uid])) {
            //console.log('不用 取消订阅');
            return;
        }
        console.log('取消订阅 成功');
        delete this.runningJobSubscribeMap[jobId][uid];
    }

    // setSubscribedConsoleColor(socket, data) {
    //     let uid = data.uid;
    //     let jobId = data.runningJobId;
    //     let color = data.color;
    //     if (commonJs.isUndefinedOrNull(this.runningJobSubscribeMap[jobId]) || commonJs.isUndefinedOrNull(this.runningJobSubscribeMap[jobId][uid])) {
    //         //console.log('不用 设置颜色');
    //         return;
    //     }
    //     console.log('设置颜色 成功');
    //     this.runningJobSubscribeMap[jobId][uid].color = color;
    // }

    log(socket, runningJobId, text, timestamp) {
        let jobSubscribeMap = this.runningJobSubscribeMap[runningJobId];
        if (commonJs.isUndefinedOrNull(jobSubscribeMap)) {
            //console.log('不用 emit log到主服');
            return;
        }
        //console.log('emit log 成功');
        socket.emit('jobLog', {runningJobId:runningJobId, text:text, timestamp:timestamp});
    }

    runProtocol(data) {
        setTimeout(function() {
            let runProto = new runProtoClass();
            runProto.run(data);
        }, 1000);
    }
}

module.exports = new runningJobManager();

