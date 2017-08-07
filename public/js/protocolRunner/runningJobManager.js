'use strict'
let async = require('async');

let commonJs = require('../../../CommonJS/common');
let runningJobClass = require('./runningJob');


class runningJobManager{
    constructor() {
        this.sessionMap = {};           // uid -> session
        this.runningJobMap = {};        // uid -> job map( runningJobId -> runningJobObject)
        this.runningJobSubscribeMap = {};  // runningJobId --> uid

        this.maxRunningJobId = 0;
    };

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

    runJob(uid, jobObj) {
        let session = this.sessionMap[uid];
        if (commonJs.isUndefinedOrNull(session)) {
            return -1;
        }
        if (commonJs.isUndefinedOrNull(this.runningJobMap[uid])) {
            this.runningJobMap[uid] = [];
        }

        let runningJobObj = new runningJobClass(jobObj, session, 0, null);
        let runningJobId = this.maxRunningJobId;
        this.maxRunningJobId++;

        runningJobObj.setRunningJobId(runningJobId);
        this.runningJobMap[uid][runningJobId] = runningJobObj;
        runningJobObj.runAll((err) => {});

        return runningJobId;
    }

    stopJob(uid, runningJobId) {
        let runningJobs = this.runningJobMap[uid]
        if (commonJs.isUndefinedOrNull(runningJobs)) {
            return false;
        }

        if (runningJobId < 0 || runningJobId >= runningJobs.length) {
            return false;
        }

        let runningJob = runningJobs[runningJobId];
        runningJob.stop((err)=>{});
        delete runningJobs[runningJobId];
        
        return true;
    }

    getAllRunningJobs(uid) {
        if (commonJs.isUndefinedOrNull(uid)) {
            return this.runningJobMap;
        }
        else {
            return this.runningJobMap[uid];
        }
    }

    subscribeToJobConsole(uid, jobId) {
        if (commonJs.isUndefinedOrNull(this.runningJobSubscribeMap[jobId])) {
            this.runningJobSubscribeMap[jobId] = [];
        }

        let found = false;
        for (let i = 0; i < this.runningJobSubscribeMap[jobId].length; ++i) {
            if (this.runningJobSubscribeMap[jobId][i] === uid) {
                found = true;
                break;
            }
        }

        if (found === false) {
            this.runningJobSubscribeMap[jobId].push(uid);

            // subscribe之后要把之前所有log都发送过去
            let jobObj = this.runningJobMap[jobId];
            let sessionObj = this.sessionMap[uid];

            if (commonJs.isUndefinedOrNull(jobObj) || commonJs.isUndefinedOrNull(sessionObj)) {
                return;
            }

            sessionObj.Console(jobObj.getOutputs(), jobId);
        }
    }

    unSubscribeToJobConsole(uid, jobId) {
        if (commonJs.isUndefinedOrNull(this.runningJobSubscribeMap[jobId])) {
            return;
        }

        let index = this.runningJobSubscribeMap[jobId].indexOf(uid);
        if (index >= 0) {
            this.runningJobSubscribeMap[jobId].splice(index, 1);
        }
    }

    log(runningJobId, text) {
        let uids = this.runningJobSubscribeMap[runningJobId];
        if (commonJs.isUndefinedOrNull(uids)) {
            return;
        }

        for (let i = 0; i < uids.length; ++i) {
            let session = this.sessionMap[uids[i]];
            if (commonJs.isUndefinedOrNull(session) === false && session.isActive() === true) {
                session.Console(text, runningJobId);
            }
        }
    }
};


module.exports = new runningJobManager();

