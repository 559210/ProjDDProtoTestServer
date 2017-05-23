"use strict";

var mysql = require('mysql');

var pool = mysql.createPool({
    connectionLimit: 10,
    host: 'localhost',
    user: 'feathers',
    password: 'xy_mi_ma',
    database: 'DDProjServTest'
});


module.exports = pool;