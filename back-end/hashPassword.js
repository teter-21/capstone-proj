const bcrypt = require("bcrypt");

async function hashPassword() {
    const hash = await bcrypt.hash("admin123", 10);
    console.log(hash);
}

hashPassword();