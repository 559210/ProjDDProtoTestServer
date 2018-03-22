"use strict";

var mysql = require('mysql');

var pool = mysql.createPool({
    connectionLimit: 100,
    host: '123.59.150.142',
    user: 'root',
    password: 'xy_mi_ma',
    database: 'DDProjServTest'
});


module.exports = pool;