"use strict";

var mysql = require('mysql');

var pool = mysql.createPool({
    connectionLimit: 100,
    host: 'localhost',
    user: 'root',
    password: 'abcd1234',
    database: 'DDProjServTest'
});


module.exports = pool;