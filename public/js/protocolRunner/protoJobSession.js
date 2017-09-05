'use strict'

let g_protoMgr = require('./protocolManager');
let commonJs = require('../../../CommonJS/common');
let g_runningJobMgr = require('./runningJobManager');

class protoJobSession {
    constructor(userObj) {
        this.isActive = true;
        this.userObj = userObj;
        this.uid = userObj.uid;
        this.curJob = null;
        this.socket = null;
        
        this.runningJobIDs = [];
        g_runningJobMgr.registerSession(this.uid, this);
    }

    setActive(active) {
        this.isActive = active === false ? false : true;
    }

    isActive() {
        return this.isActive;
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

    runJob(callback) {
        console.log('protoJobSession runJob: curJob: %j', this.curJob);
        g_runningJobMgr.runJob(this.uid, this.curJob, (err, runningJobId) => {
            if (!err) {
                this.runningJobIDs.push(runningJobId);
            }
            callback(err);
        });
    }

    // close() {
    //     g_runningJobMgr.unRegisterSession(this.uid);
    // }
}

module.exports = protoJobSession;