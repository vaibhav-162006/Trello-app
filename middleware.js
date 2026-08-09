const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "atlassian123123password";

function authMiddleware(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authorization header missing or invalid" });
  }

  const token = authorization.slice("Bearer ".length).trim();
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
        next();
        
    } catch (err) {
        res.status(401).json({
            message: "Unauthorized"
        })
    }
}
module.exports = {
    authMiddleware : authMiddleware
};