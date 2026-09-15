const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  dateStrings: true,
});

db.connect((err) => {
  if (err) {
    console.error("Database Connection Failed");
    console.error(err);
    return;
  }

  console.log("MySQL Connected");
});

module.exports = db;
