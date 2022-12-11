import dotenv from "dotenv";
import colors from "colors";
import asyncHandler from "express-async-handler";
import connectDB from "./config/db.js";

// import data
import users from "./data/users.js";

import User from "./models/user.js";
import Team from "./models/team.js";
import Client from "./models/client.js";
import Project from "./models/project.js";
import Activity from "./models/activity.js";
import Screenshot from "./models/screenshot.js";
import AdminConfig from "./models/adminConfig.js";

dotenv.config({ path: "./config/config.env" });

connectDB();

const updateUsers = asyncHandler(async () => {
  try {
    await User.updateMany({ "accountInfo.timeZone": "Asia/Kolkata" });

    console.log(`Users updated`.red.inverse);
    process.exit(0);
  } catch (error) {
    console.log(`${error}`.red.inverse);
    process.exit(1);
  }
});

updateUsers();
