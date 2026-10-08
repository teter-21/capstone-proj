require("dotenv").config();
// Read-only authentication check; does not send a message.
require("../services/emailTransport")
  .verifyEmailConnection()
  .catch((error) => {
    console.error(error.code || error.message);
    process.exitCode = 1;
  });
