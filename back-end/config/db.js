const mysql = require("mysql2");

const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,

  dateStrings: true,

  ssl: {
    rejectUnauthorized: false,
  },
});

// Test database connection
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database Connection Failed");
    console.error("Code:", err.code);
    console.error("Message:", err.message);
    return;
  }

  console.log("✅ MySQL Connected Successfully");

  connection.release();
});

module.exports = db;
