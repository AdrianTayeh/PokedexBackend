require("dotenv").config();
const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const pool = require("./db");
const jwt = require("jsonwebtoken");
const authMiddleWare = require("./middlewares/authMiddleware");
const timeMiddleware = require("./middlewares/timeMiddleware");

const User = require("./models/User");
const Pokemon = require("./models/Pokemon");

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(cors());
app.use(timeMiddleware);

app.post("/users", async (req, res) => {
  const { email, name, password, newsletter_opt_in } = req.body;

  if (!email || !name || !password) {
    return res
      .status(400)
      .json({ error: "Email, name, and password are required" });
  }

  try {
    const user = await User.create(name, email, password, newsletter_opt_in);
    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        account_created: user.accountCreated,
      },
    });
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/users", authMiddleWare, async (req, res) => {
  try {
    const users = await User.findAll();
    res.status(200).json({ users });
  } catch (err) {
    console.error("Error executing query: ", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/users/:id", authMiddleWare, async (req, res) => {
  const id = req.params.id;
  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ user });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.patch("/profile", authMiddleWare, async (req, res) => {
  const { name, email } = req.body;

  try {
    const user = req.user;
    await user.update({ name, email });

    res.status(200).json({ message: "Profile updated successfully", user });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/profile", authMiddleWare, async (req, res) => {
  try {
    const user = req.user;

    res.status(200).json({
      name: user.name,
      email: user.email,
      account_created: user.accountCreated,
      last_login: user.lastLogin,
    });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: "User not found " });
    }
    const isPasswordValid = await bcrypt.compareSync(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    await user.updateLastLogin();

    const token = jwt.sign(
      {
        userId: user.id,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "5h",
      }
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        account_created: user.accountCreated,
        last_login: user.lastLogin,
      },
    });
  } catch (err) {
    console.error("Error executing query:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/pokemon", authMiddleWare, async (req, res) => {
  const { name, weight, height } = req.body;

  if (!name || !weight || !height) {
    return res
      .status(400)
      .json({ error: "Name, weight, and height are required" });
  }

  try {
    const pokemon = await Pokemon.create(name, weight, height);

    const userId = req.user.id;

    await pool.query(
      "INSERT INTO UsersPokemons (pokemon_id, user_id) VALUES (?, ?)",
      [pokemon.id, userId]
    );

    res.status(201).json({
      message: "Pokemon created and assigned successfully",
      pokemon,
    });
  } catch (err) {
    console.error("Error creating Pokemon:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/pokemon", async (req, res) => {
  try {
    const pokemons = await Pokemon.findAll();
    res.status(200).json({ pokemons });
  } catch (err) {
    console.error("Error creating Pokemon:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/pokemon/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const pokemon = await Pokemon.findById(id);
    if (!pokemon) return res.status(404).json({ error: "Pokemon not found" });

    res.status(200).json({ pokemon });
  } catch (err) {
    console.error("Error fetching Pokemon:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.patch("/pokemon/:id", authMiddleWare, async (req, res) => {
  const id = req.params.id;
  const { name, weight, height } = req.body;

  try {
    const pokemon = await Pokemon.findById(id);
    if (!pokemon) return res.status(404).json({ error: "Pokemon not found" });
    await pokemon.update({ name, weight, height });
    res.status(200).json({ message: "Pokemon updated successfully", pokemon });
  } catch (err) {
    console.error("Error updating Pokemon:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete("/pokemon/:id", authMiddleWare, async (req, res) => {
  const id = req.params.id;
  try {
    const pokemon = await Pokemon.findById(id);
    if (!pokemon) return res.status(404).json({ error: "Pokemon not found" });
    await pokemon.delete();
    res.status(200).json({ message: "Pokemon deleted successfully" });
  } catch (err) {
    console.error("Error deleting Pokemon", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.delete("/users/:id", authMiddleWare, async (req, res) => {
  const id = req.params.id;

  try {
    if (req.user.id === parseInt(id)) {
      return res.status(403).json({ error: "You cannot delete yourself" });
    }

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });
    await user.delete();
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/assign-pokemon", authMiddleWare, async (req, res) => {
  const pokemonId = req.body.id;

  if (!pokemonId)
    return res.status(400).json({ error: "Pokemon ID is required" });

  try {
    const pokemon = await Pokemon.findById(pokemonId);
    if (!pokemon) return res.status(404).json({ error: "Pokemon not found" });

    const userId = req.user.id;

    const [rows] = await pool.query(
      "SELECT * FROM UsersPokemon WHERE pokemon_id = ? AND user_id = ?",
      [pokemonId, userId]
    );

    if (rows.length > 0)
      return res
        .status(400)
        .json({ error: "Pokemon is already assigned to you" });

    await pool.query(
      "INSERT INTO UsersPokemon (pokemon_id, user_id) VALUES (?, ?)",
      [pokemonId, userId]
    );

    res.status(201).json({
      message: "Pokemon assigned to user successfully",
      pokemon,
    });
  } catch (err) {
    console.error("Error assigning Pokemon:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/user-pokemons", authMiddleWare, async (req, res) => {
  try {
    const userId = req.user.id;

    const [assignedPokemon] = await pool.query(
      `SELECT p.id, p.name, p.weight, p.height
            FROM Pokemons p
            INNER JOIN UsersPokemons up ON p.id = up.pokemon_id
            WHERE up.user_id = ?`,
      [userId]
    );

    const [unassignedPokemons] = await pool.query(
      `SELECT p.id, p.name, p.weight, p.height
        FROM Pokemons p
        WHERE p.id NOT IN (
        SELECT pokemon_id
        FROM UsersPokemons
        WHERE user_id = ?
        )`,
      [userId]
    );

    res.status(200).json({
        assignedPokemon,
        unassignedPokemons,
    });
  } catch (err) {
    console.error("Error fetching user Pokemon:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
