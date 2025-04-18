const pool = require("../db");

class Pokemon {
  constructor(id, name, weight, height) {
    this.id = id;
    this.name = name;
    this.weight = weight;
    this.height = height;
  }

  static async findById(id) {
    const [rows] = await pool.query("SELECT * FROM Pokemons WHERE id = ?", [
      id,
    ]);
    if (rows.length === 0) return null;

    const pokemon = rows[0];
    return new Pokemon(
      pokemon.id,
      pokemon.name,
      pokemon.weight,
      pokemon.height
    );
  }

  static async create(name, weight, height) {
    const [result] = await pool.query(
      "INSERT INTO Pokemons (name, weight, height) VALUES (?, ?, ?)",
      [name, weight, height]
    );

    return new Pokemon(result.insertId, name, weight, height);
  }

  static async findAll() {
    try {
      const [rows] = await pool.query("SELECT id, name FROM Pokemons");

      return rows.map((pokemon) => new Pokemon(pokemon.id, pokemon.name));
    } catch (err) {
      console.error("Error fetching all Pokemons:", err);
      throw new Error("Database error");
    }
  }

  async update(attributes) {
    const { name, weight, height } = attributes;
    await pool.query(
      "UPDATE Pokemons SET name = ?, weight = ?, height = ? WHERE id = ?",
      [name || this.name, weight || this.weight, height || this.height, this.id]
    );

    if (name) this.name = name;
    if (weight) this.weight = weight;
    if (height) this.height = height;
  }

  async delete() {
    await pool.query("DELETE FROM Pokemons WHERE id = ?", [this.id]);
  }
}

module.exports = Pokemon;
