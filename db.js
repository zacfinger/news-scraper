// Load config settings
const config = require('./config');

// Instantiate dependency objects
// Later load conditionally based on config
let mysql = null; // mysql object
let admin = null; // Firestore objects
let serviceAccount = null;
let db = null;

// Conditionally load dependencies
if (config.useSQL) {
    mysql = require('./dbcon.js');

} 
else {
    // Get Firestore values if needed
    admin = require('firebase-admin');
    serviceAccount = require(config.jsonPath);

    // Check if app already initialized
    // https://stackoverflow.com/questions/57763991/initializeapp-when-adding-firebase-to-app-and-to-server
    if (!admin.apps.length){
        admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
        });
    }

    db = admin.firestore();
}

const update = async (tableName, setColumns, whereCondition) => {
    if (config.useSQL) {

        try {

            var sqlCommand = 'update ' + tableName + ' set ';
            var valuesArray = []
            var columnCount = 0;

            for (const [key, value] of Object.entries(setColumns)){
                sqlCommand += `${key} = ?`;

                valuesArray.push(value);

                columnCount += 1;

                if(columnCount < Object.keys(setColumns).length) {
                    sqlCommand += ', ';
                }

            }

            sqlCommand += ' where ';
            columnCount = 0;

            for(const [key, value] of Object.entries(whereCondition)){
                sqlCommand += `${key} = ?`;

                valuesArray.push(value);

                columnCount += 1;

                if(columnCount < Object.keys(whereCondition).length){
                    sqlCommand += ' and ';
                }

            }

            await mysql.conn.query( sqlCommand, valuesArray );

        } catch (ex) {
            console.log(ex);
        }
	// TODO: Move to separate function
        /*finally {
            if(config.useSQL && mysql.conn && mysql.conn.end) {
                mysql.conn.end(); }
        }*/
    } 
    else {

        // TODO: Not sure if this is the best
        // If whereCondition object has multiple keys
        // Multiple documents in Firestore updated ?
        // https://stackoverflow.com/questions/48947499/can-firestore-update-multiple-documents-matching-a-condition-using-one-query
        for (const [key, value] of Object.entries(whereCondition)){
            // https://stackoverflow.com/questions/49682327/how-to-update-a-single-firebase-firestore-document
            // TODO: Perhaps move this to a function 'update where primary key is foo'
            db.collection(tableName).doc(`${value}`).update(setColumns);
        }
        
    }
}

module.exports.update = update;
