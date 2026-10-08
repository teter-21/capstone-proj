const mysql = require("mysql2");
const fs = require("node:fs");
const production = process.env.NODE_ENV === "production" || Boolean(process.env.RENDER);
const port = Number(process.env.DB_PORT || (production ? NaN : 3306));
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("Set DB_PORT to the MySQL port shown in Aiven; PORT is the HTTP port.");
}
const ca = process.env.DB_SSL_CA
  ? process.env.DB_SSL_CA.replace(/\\n/g, "\n")
  : process.env.DB_SSL_CA_PATH ? fs.readFileSync(process.env.DB_SSL_CA_PATH, "utf8") : undefined;
const ssl = process.env.DB_SSL === "false" && !production
  ? undefined : { rejectUnauthorized: true, ...(ca ? { ca } : {}) };
const db = mysql.createPool({
  host: process.env.DB_HOST, port, user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
  waitForConnections: true, connectionLimit: 5, queueLimit: 50,
  connectTimeout: 10000, dateStrings: true, ssl,
});
// Business dates (CURDATE/NOW) follow the clinic's timezone, not the host's UTC clock.
db.on("connection", (connection) => {
  connection.query("SET time_zone = '+08:00'", (error) => {
    if (error) console.error("Database timezone initialization failed:", error.code);
  });
});
module.exports = db;
