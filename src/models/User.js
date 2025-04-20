const pool = require("../db");
const bcrypt = require("bcryptjs");

class User {
  constructor(id, name, email, accountCreated, lastLogin, password) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.accountCreated = accountCreated;
    this.lastLogin = lastLogin;
    this.password = password;
  }

  static async findById(id) {
    const [rows] = await pool.query(
      "SELECT id, name, email, account_created, last_login FROM Users WHERE id = ?",
      [id]
    );
    if (rows.length === 0) return null;

    const user = rows[0];
    return new User(
      user.id,
      user.name,
      user.email,
      user.account_created,
      user.last_login
    );
  }

  static async findByEmail(email) {
    const [rows] = await pool.query(
      "SELECT id, name, email, password, account_created, last_login FROM Users WHERE email = ?",
      [email]
    );
    if (rows.length === 0) return null;

    const user = rows[0];
    return new User(
      user.id,
      user.name,
      user.email,
      user.account_created,
      user.last_login,
      user.password
    );
  }

  async updateLastLogin() {
    await pool.query("UPDATE Users SET last_login = NOW() WHERE id = ?", [
      this.id,
    ]);
    this.lastLogin = new Date();
  }

  static async create(name, email, password, newsletterOptIn) {
    const hashedPassword = await bcrypt.hashSync(password, 8);
    const [result] = await pool.query(
      "INSERT INTO Users (name, email, password, newsletter_opt_in) VALUES (?, ?, ?, ?)",
      [name, email, hashedPassword, newsletterOptIn ? 1 : 0]
    );

    return new User(result.insertId, name, email, new Date(), null);
  }

  static async findAll() {
    const [rows] = await pool.query(
      "SELECT id, name, email, account_created, last_login FROM Users"
    );

    return rows.map(
      (user) =>
        new User(
          user.id,
          user.name,
          user.email,
          user.account_created,
          user.last_login
        )
    );
  }

  async update(attributes) {
    const { name, email } = attributes;
    await pool.query("UPDATE Users SET name = ?, email = ? WHERE id = ?", [
      name || this.name,
      email || this.email,
      this.id,
    ]);

    if (name) this.name = name;
    if (email) this.email = email;
  }

  async delete() {
    await pool.query("DELETE FROM Users WHERE id = ?", [this.id]);
  }
}

module.exports = User;
