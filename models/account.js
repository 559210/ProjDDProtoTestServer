// sample model
"use strict";

var async = require('async');
var pool = require('./mySQLPool');
var session = require('express-session');
var MySQLStore = require('express-mysql-session')(session);

var crypto = require('crypto');
const commonJs = require('../CommonJS/common');

var sessionStore = new MySQLStore({}/* session store options */, pool);

var makePaasword = function(password) {
    var secret = 'askjfDDDni0-=787ldj?y`1';
    var cipher = crypto.createCipher('aes192', secret);
    var enc = cipher.update(password, 'utf8', 'hex');
    enc += cipher.final('hex');
    console.log('make password: ' + enc);
    return enc;
}

class UserAccount {
    constructor(uid, userName, cryptedPwd) {
        this.uid = uid;
        this.userName = userName;
        this.cryptedPwd = cryptedPwd;
    }

    verifyPassword(password, callback) {
        return makePaasword(password) === this.cryptedPwd;
    }
}


class UserManager {
    constructor() {
        this.users = {};
    }

    addUser(user) {
        this.users[user.uid] = user;
    }

    getUserByUid(uid) {
        if (commonJs.isUndefinedOrNull(this.users[uid])) {
            return null;
        }

        return this.users[uid];
    }
}


var g_UserManager = new UserManager();

var exp = module.exports;

exp.getSessionStore = () => {
    return sessionStore;
}


exp.authenticate = (userName, password, callback) => {
    // console.log('authenticate =================');
    pool.query("select * from `Account` where `userName` = ? ", [userName], (err, results, fields) => {
        if (err) {
            return callback(err);
        }

        // console.log(results);
        // console.log(fields);

        if (results && results.length == 1) {
            let r0 = results[0];
            let user = new UserAccount(r0.uid, r0.userName, r0.cryptedPwd);
            if (user.verifyPassword(password)) {
                // success
                g_UserManager.addUser(user);
                callback(null, user);
            } else {
                callback(new Error('password error'));
            }
        } else {
            callback(new Error('user is not exists'));
        }
    });
}

exp.serializeUser = (user, callback) => {
    callback(null, user.uid);
}

exp.deserializeUser = (uid, callback) => {
    let user = g_UserManager.getUserByUid(uid);
    callback(null, user);
}

// var checkUsername = (userName, callback) => {
//     pool.query("select 1 from `Account` where `userName` = ? ", [userName], (err, results, fields) => {
//         if (err) {
//             return callback(err);
//         }

//         console.log(results);
//         console.log(fields);
//         callback(null); // true: exists, false: not exists
//     });
// }

exp.createUser = (info, callback) => {
    console.log(info);
    if (info.password !== info.confirm) {
        return callback(new Error('两次输入密码不一致'));
    }

    var cryptedPwd = makePaasword(info.password);
    pool.query("insert into Account (`userName`, `cryptedPwd`, `email`) values (?, ?, ?)", [info.username, cryptedPwd, info.email], (err, results, fields) => {
        if (err) {
            console.log(err);
            if (commonJs.isUndefinedOrNull(err.errno)) {
                return callback(err);
            }

            let errorMsg = {
                '1062' : '用户名或者邮箱已被注册'
            }

            return callback(new Error(errorMsg[err.errno.toString()]));
        }

        // results:
        // {
        //     OkPacket {
        //       fieldCount: 0,
        //       affectedRows: 1,
        //       insertId: 0,
        //       serverStatus: 2,
        //       warningCount: 0,
        //       message: '',
        //       protocol41: true,
        //       changedRows: 0 }
        //   }
        // }

        callback(null);
    });
}