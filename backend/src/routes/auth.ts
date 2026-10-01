import { Router } from "express";
import { loginSchema } from "../schemas/auth";
import { authenticateUser, generateToken } from "../services/authService";
import { asyncHandler, httpError } from "../utils/http";

export const authRouter = Router();

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);

    const user = await authenticateUser(data.email, data.password);
    if (!user) {
      throw httpError(401, "Incorrect email or password", {
        "WWW-Authenticate": "Bearer",
      });
    }

    const token = generateToken(user.id);
    res.json({ access_token: token, token_type: "bearer" });
  })
);
