'use strict'

let g_protoMgr = require('./protocolManager');
let commonJs = require('../../../CommonJS/common');
let g_runningJobMgr = require('./runningJobManager');
let g_userMgr = require('./userManager');

class protoJobSession {
    constructor(userObj) {
        this.active = true;
        this.userObj = userObj;
        this.uid = userObj.uid;
        this.curJob = null;
        this.socket = null;
        
        this.runningJobIDs = [];
        g_runningJobMgr.registerSession(this.uid, this);
    }

    setActive(active) {
        this.active = active === false ? false : true;
    }

    isActive() {
        return this.active;
    }

    getSessionIdInRunningJobMgr() {
        return this.uid;
    }

    setSocket(skt) {
        this.socket = skt;
    }

    Console(text, runningJobId, color, timestamp) {
        if (commonJs.isUndefinedOrNull(this.socket) === false) {
            this.socket.emit("Console", {text: text, runningJobId: runningJobId, color: color, timestamp: timestamp});
        }
    }

    subscribeToJobConsole(runningJobId) {
        g_runningJobMgr.subscribeToJobConsole(this.uid, runningJobId);
    }


    unSubscribeToJobConsole(runningJobId) {
        g_runningJobMgr.unSubscribeToJobConsole(this.uid, runningJobId);
    }

    getCurrentJobDetail() {
        if (this.curJob) {
            return this.curJob.getJobDetail();
        }

        return false;
    }

    loadJobById(jobId, callback) {
        let self = this;
        g_protoMgr.loadJobById(jobId, (err, jobObj) => {
            if (err) {
                return callback(err);
            }
            self.curJob = jobObj;
            return callback(null);
        });
    }

    saveCurrentJob(callback) {

        if (this.curJob) {
            g_protoMgr.saveJob(this.curJob, callback);
        } else {
            callback(null);
        }
    }

    createJob(jobName, callback) {
        g_protoMgr.createJob(jobName, (err, jobObj) => {
            if (err) {
                return callback(err);
            }

            this.curJob = jobObj;
            callback(null);
        });
    }

    renameJob(newName, callback) {
        this.curJob.name = newName;
        this.saveCurrentJob(callback);
    }

    clearCurrentJob(callback) {
        this.curJob = null;
        callback(null);
    }

    _getGameUserIdList(data) {
        let selectType = data.selectType;
        let selectValue= data.selectValue;

        let value1 = selectValue.value1;
        let value2 = selectValue.value2;

        let gameUserIdList = [];
        switch(selectType) {
            case 1: // 指定userId
                let find = g_userMgr.checkUserId(value1);
                if (find) {
                    gameUserIdList.push(value1);
                }
            break;

            case 2: // 随机userId
                gameUserIdList = g_userMgr.getRandomUserId(1);
            break;

            case 3: // userindex范围
                gameUserIdList = g_userMgr.getUserIndexScope(parseInt(value1), parseInt(value2));
            break;

            case 4: // 随机userId数量
                gameUserIdList = g_userMgr.getRandomUserId(parseInt(value1));
            break;

            case 5: // 多个指定userId
                let userIdArray = value1.toString().split(';');
                for (let i = 0; i < userIdArray.length; i++) {
                    if (userIdArray[i].length > 0 && g_userMgr.checkUserId(userIdArray[i])) {
                        gameUserIdList.push(userIdArray[i]);
                    } 
                }
            break;
        }
        return gameUserIdList;
        //return ['z123', 'ccss005'];
    }

    runJob(data, callback) {
        console.log('protoJobSession runJob: curJob: %j', this.curJob);
        let gameUserIdList = this._getGameUserIdList(data);
        if (gameUserIdList.length === 0) {
            return callback('没有可用的userId');
        }
        g_runningJobMgr.runJob(this.uid, this.curJob, gameUserIdList, (err, curRunningJobIdList) => {
            if (!err) {
                this.runningJobIDs.push.apply(this.runningJobIDs, curRunningJobIdList);
            }
            callback(err);
        });
    }

    // close() {
    //     g_runningJobMgr.unRegisterSession(this.uid);
    // }
}

module.exports = protoJobSession;