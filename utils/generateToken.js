import jwt from "jsonwebtoken";

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    // TODO: needs to be changed to different value after expiry period
    { expiresIn: "30d" }
  );
};
const generateForgotToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET,
    // TODO: needs to be changed to different value after expiry period
    { expiresIn: "300s" }
  );
};

export { generateToken as default, generateForgotToken };
