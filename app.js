const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const dbPath = path.join(__dirname, "userData.db");
const app = express();
app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

//CREATE user

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const getUser = `SELECT * FROM user WHERE username='${username}'`;
  const userData = await db.get(getUser);

  if (userData === undefined) {
    const createUserQuery = `
      INSERT INTO 
      user(username,name,password,gender,location)
      VALUES('${username}','${name}','${hashedPassword}','${gender}','${location}');
      `;
    const dbResponse = await db.run(createUserQuery);
    const newUserId = dbResponse.lastID;
    const passwordLength = password.length;
    if (passwordLength < 5) {
      response.status(400);
      response.send("Password is too short");
    } else {
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// LOGIN user

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const getUser = `SELECT * FROM user WHERE username='${username}'`;
  const userData = await db.get(getUser);

  if (userData === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatch = bcrypt.compare(password, userData.password);
    if (isPasswordMatch === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//CHANGE-PASSWORD

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const getUser = `SELECT * FROM user WHERE username='${username}'`;
  const userData = await db.get(getUser);

  if (userData === undefined) {
    response.status(400);
    response.send("User not registered");
  } else {
    const isValidPassword = bcrypt.compare(oldPassword, userData.password);
    if (isValidPassword === true) {
      const lengthNewPassword = newPassword.length;
      if (lengthNewPassword < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        const encryptedPassword = bcrypt.hash(newPassword, 10);
        const updatePassword = `UPDATE user
            SET password='${encryptedPassword}'
            WHERE username='${username}';`;
        await db.run(updatePassword);
        response.send("Password updated");
      }
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  }
});

module.exports = app;
