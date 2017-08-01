'use strict'
let async = require('async');

let commonJs = require('../../../CommonJS/common');
let runningJobClass = require('./runningJob');


class runningJobManager{
    constructor() {
        this.globalIndex = 0;
        this.sessionMap = {};           // sessionId -> session
        this.runningJobMap = {};        // runningJobId -> job array
        this.runningJobSubscribeMap = {};  // runningJobId --> sessoinId
    };

    getSessionID(session) {
        let id = this.globalIndex;
        this.globalIndex++;
        this.sessionMap[id] = session;
        return id;
    }

    removeSession(sessionId) {
        delete this.sessionMap[sessionId];
        for (let jobId in this.runningJobSubscribeMap) {
            let sessions = this.runningJobSubscribeMap[jobId];
            let idx = sessions.indexOf(sessionId);
            if (idx >= 0) {
                sessions.splice(idx, 1);
            }
        }
    }

    runJob(id, jobObj) {
        let session = this.sessionMap[id];
        if (commonJs.isUndefinedOrNull(session)) {
            return -1;
        }
        if (commonJs.isUndefinedOrNull(this.runningJobMap[id])) {
            this.runningJobMap[id] = [];
        }

        let runningJobObj = new runningJobClass(jobObj, session, 0, null);
        let runningJobId = this.runningJobMap[id].length;
        runningJobObj.setRunningJobId(runningJobId);
        this.runningJobMap[id].push(runningJobObj);
        runningJobObj.runningJobId = runningJobId;
        runningJobObj.runAll((err) => {});

        return runningJobId;
    }

    stopJob(id, runningJobId) {
        let runningJobs = this.runningJobMap[id]
        if (commonJs.isUndefinedOrNull(runningJobs)) {
            return false;
        }

        if (runningJobId < 0 || runningJobId >= runningJobs.length) {
            return false;
        }

        let runningJob = runningJobs[runningJobId];
        runningJobs[runningJobId] = null;
        runningJob.stop();
        return true;
    }

    getAllRunningJobs(sessionId) {
        if (sessionId === undefined || sessionId === null) {
            return this.runningJobMap;
        }
        else {
            return this.runningJobsMap[sessionId];
        }
    }

    subscribeToJobConsole(sessionId, jobId) {
        if (common.isUndefinedOrNull(this.runningJobSubscribeMap[jobId])) {
            this.runningJobSubscribeMap[jobId] = [];
        }

        let found = false;
        for (let i = 0; i < this.runningJobSubscribeMap[jobId].length; ++i) {
            if (this.runningJobSubscribeMap[jobId][i] === sessionId) {
                found = true;
                break;
            }
        }

        if (found === false) {
            this.runningJobSubscribeMap[jobId].push(sessionId);

            // subscribe之后要把之前所有log都发送过去
            let jobObj = this.runningJobMap[jobId];
            let sessionObj = this.sessionMap[sessionId];

            if (common.isUndefinedOrNull(jobObj) || common.isUndefinedOrNull(sessionObj)) {
                return;
            }

            sessionObj.Console.log(jobObj.getOutputs(), jobId);
        }
    }

    unSubscribeToJobConsole(seesionId, jobId) {
        if (common.isUndefinedOrNull(this.runningJobSubscribeMap[jobId])) {
            return;
        }

        let index = this.runningJobSubscribeMap[jobId].indexOf(sessionId);
        if (index >= 0) {
            this.runningJobSubscribeMap[jobId].splice(index, 1);
        }
    }

    log(runningJobId, text) {
        let sessions = this.runningJobSubscribeMap[runningJobId];
        if (common.isUndefinedOrNull(sessions)) {
            return;
        }

        for (let i = 0; i < sessions.length; ++i) {
            sessions[i].Console(text, runningJobId);
        }
    }
};


module.exports = new runningJobManager();

