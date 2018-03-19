'use restrict';

var pool = require('./mySQLPool');
var userPool = require('./mySQLUserPool');
var async = require('async');

var protocolPool = require('./mySQLProtocolPool');

var exp = module.exports;


exp.saveJob = function(jobStr, callback) {
    pool.query("insert into ProtoRunnerJobs (`jobJson`) values (?)", [jobStr], (err, results, fields) => {
            if (err) {
                return callback(err);
            }

            return callback(null, results.insertId);
        });
}


exp.updateJob = function(jobId, jobStr, callback) {
    pool.query("update ProtoRunnerJobs set `jobJson` = ?, `modifyTime` = null where `jobId` = ?", [jobStr, jobId], callback);
}

exp.removeJob = function(jobId, callback) {
    let connection = null;
    async.series(
        [
            (cb) => {
                pool.getConnection((err, conn) => {
                    if (err) {
                        return cb(err);
                    }

                    connection = conn;
                    cb(null);
                });
            },
            (cb) => {
                connection.beginTransaction(cb);
            },
            (cb) => {
                connection.query("insert into ProtoRunnerJobsDel(jobId, jobJson, createTime, modifyTime)\
                 select jobId, jobJson, createTime, modifyTime from ProtoRunnerJobs where jobId=?",
                 [jobId], cb);
            },
            (cb) => {
                connection.query("delete from ProtoRunnerJobs where jobId = ?", [jobId], cb);
            },
            (cb) => {
                connection.commit(cb);
            }
        ], (err) => {
            if (err) {
                connection.rollback(() => {
                    return callback(err);
                });
            }

            callback(null);
        });    
}


exp.loadJobList = function(callback) {
    pool.query("select `jobId` from ProtoRunnerJobs order by `createTime`", (err, results, fields) => {
        if (err) {
            console.log(err);
            return callback(err);
        }

        let list = [];
        for (let i = 0; i < results.length; ++i) {
            list.push(results[i].jobId);
        }
        callback(null, list);
    })
}


exp.loadJobById = function(jobId, callback) {
    pool.query("select * from ProtoRunnerJobs where `jobId` = ?", [jobId], (err, results, fields) => {
        if (err) {
            return callback(err);
        }

        callback(null, results[0]);
    });
}


///////////////////////////// instrument prototypes(protocol and job) persistent
exp.addInstrumentPrototype = function(name, c2s, s2c, type, note, tag, callback) {
    pool.query("insert into `InstrumentPrototypes` (`name`, `c2s`, `s2c`, `type`, `note`, `tag`) VALUES (?, ?, ?, ?, ?, ?)", [name, c2s, s2c, type, note, tag ? tag : null], (err, results) => {
        if (err) {
            return callback(err);
        }

        callback(null, results.insertId);
    });
}

exp.removeInstrumentPrototype = function(id, callback) {
    pool.query("delete from `InstrumentPrototypes` where instId = ?", [id], callback);
}

exp.loadAllInstrumentsPrototype = function(callback) {
    pool.query("SELECT * FROM `InstrumentPrototypes`", (err, results, fields) => {
        callback(err, results);
    });
}

exp.updateInstumentPrototype = function(id, name, c2s, s2c, note, tag, callback) {
    pool.query("update `InstrumentPrototypes` set `name` = ?, `c2s` = ?, `s2c` = ?, `note` = ?, `tag` = ? where instId = ?", [name, c2s, s2c, note, tag ? tag : null, id], callback);
}

///////////////////////////// get userId list
exp.loadUserIdList = function(callback) {
    userPool.query("SELECT `userIndex`, `userId`, `nickname` FROM `t_roleInfo`", (err, results, fields) => {
        //console.log('----------- results = %j', results);
        callback(err, results);
    });
}


///////////////////////////// 取协议流程
exp.loadUserSessionList = function(callback) {
    protocolPool.query("select `sessionId`, `userId` FROM `t_recordProtocol_tools` where length(`userId`)> 0 group by `sessionId`, `userId` ORDER BY `beforTime`", (err, results, fields) => {
        console.log('loadUserSessionList ----------- results = %j', results);
        callback(err, results);
    });
}

exp.loadUserSessionProtocolList = function(sid, uid, callback) {
    protocolPool.query("select `messageId`, `beforeData` from `t_recordProtocol_tools` where `sessionId` = ? and `userId` = ?", [sid, uid], (err, results, fields) => {
        console.log('err = %j, results = %j, fields = %j', err, results, fields);
        if (err) {
            return callback(err);
        }
        callback(null, results);
    });
}









