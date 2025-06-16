const bcrypt = require('bcryptjs');
const password = 'password123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
    if (err) {
        console.error("Eroare la hashing:", err);
    } else {
        console.log("Parola in clar:", password);
        console.log("Hash Bcrypt:", hash);
    }
});