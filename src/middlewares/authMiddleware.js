const jwt = require("jsonwebtoken");
const pool = require("../db");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token)
    return res.status(401).json({
      message: "Token is missing",
    });

  jwt.verify(token, process.env.JWT_SECRET, async (err, payload) => {
    if (err)
      return res.status(403).json({
        message: "Invalid token",
      });

    try {
      const [rows] = await pool.query("SELECT * FROM Users WHERE id = ?", [
        payload.userId,
      ]);
      if (rows.length === 0) {
        return res.status(404).json({
          message: "User not found",
        });
      }
      const user = rows[0];
      req.user = user;
      next();
    } catch (dbError) {
      return res.status(500).json({
        message: "Database error",
        error: dbError.message,
      });
    }
  });
}

module.exports = authenticateToken;
