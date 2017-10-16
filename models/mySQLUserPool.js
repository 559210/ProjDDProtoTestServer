"use strict";

var mysql = require('mysql');

var userPool = mysql.createPool({
    connectionLimit: 100,
    host: '123.59.150.142',
    user: 'root',
    password: 'xy_mi_ma',
    database: 'DD_UserCenter'
});


module.exports = userPool;