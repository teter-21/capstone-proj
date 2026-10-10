// bcrypt ignores bytes beyond 72; reject rather than silently truncating passwords.
const passwordError = (password) => {
  if (typeof password !== 'string' || password.length < 12)
    return 'Use a password or passphrase with at least 12 characters.';
  if (Buffer.byteLength(password, 'utf8') > 72)
    return 'Password must not exceed 72 UTF-8 bytes.';
  if (/^(.)\1+$/.test(password) || /^(password|admin|123456|qwerty)/i.test(password))
    return 'Choose a less predictable password or passphrase.';
  return null;
};
module.exports = { passwordError };
