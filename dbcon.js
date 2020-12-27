// Require dependencies
var config = require('./config');
var util = require('util');
var mysql = require('mysql');

// Define database from config
var dbConfig = {
        host            : config.sql_host,
        user            : config.sql_user,
        password        : config.sql_pw,
        database        : config.sql_db
}

// For single-use connections (i.e., scripts etc)
var conn = mysql.createConnection(dbConfig);

// Node native promisify for async/await
// https://stackoverflow.com/questions/44004418/node-js-async-await-using-with-mysql
// https://mhagemann.medium.com/create-a-mysql-database-middleware-with-node-js-8-and-async-await-6984a09d49f4
conn.query = util.promisify(conn.query).bind(conn);

// Add connection limit for connection pools
dbConfig.connectionLimit = 10;

// For indefinite-length connections (i.e., APIs)
var pool = mysql.createPool(dbConfig);

// Export both
exports.conn = conn;
exports.pool = pool;


