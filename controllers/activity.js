import mongoose from "mongoose";
import Activity from "../models/activity.js";
import User from "../models/user.js";
import Project from "../models/project.js";
import Client from "../models/client.js";
import Screenshot from "../models/screenshot.js";
import asyncHandler from "express-async-handler";
import dayjs from "dayjs";

// @desc    Add a new activity
// @route   POST /activity
// @access  Private
const createActivity = asyncHandler(async (req, res) => {
  try {
    // get input
    const {
      clientId,
      projectId,
      task,
      startTime,
      consumeTime,
      endTime,
      performanceData,
      isInternal,
      activityOn,
    } = req.body;
    const employeeId = req.body.employeeId ? req.body.employeeId : req.user._id;
    let today = activityOn ? activityOn : new Date();

    const activity = await Activity.create({
      employee: employeeId,
      client: clientId,
      project: projectId,
      task,
      performanceData,
      startTime,
      endTime,
      consumeTime,
      isInternal,
      activityOn: today,
    });
    if (!activity) {
      res.status(404);
      throw new Error("No such activity found");
    } else {
      // add activity to project, client and user
      await User.updateOne(
        { _id: employeeId },
        { $push: { activities: activity._id } }
      );
      await Project.updateOne(
        { _id: projectId },
        { $push: { activities: activity._id } }
      );
      await Client.updateOne(
        { _id: clientId },
        { $push: { activities: activity._id } }
      );

      res.status(201).json({
        status: "Successfully Created activity",
        data: activity,
      });
    }
  } catch (error) {
    throw new Error(error);
  }
});

// @desc    Add a new screenshot
// @route   POST /activity/screenshot
// @access  Private
const createScreenShot = asyncHandler(async (req, res) => {
  try {
    const {
      clientId,
      projectId,
      activityId,
      consumeTime,
      task,
      image,
      activityAt,
      performanceData,
      title,
    } = req.body;

    const screenshot = await Screenshot.create({
      employee: req.user._id,
      client: clientId,
      project: projectId,
      activityId,
      task,
      consumeTime,
      image,
      activityAt,
      performanceData,
      title,
    });

    // add ss to activity
    if (screenshot) {
      const activity = await Activity.findById(activityId);
      if (!activity) {
        res
          .status(404)
          .json({ status: `No activity found with id: ${activityId}` });
      }
      activity.screenshots.push(screenshot._id);
      await activity.save();
      res.status(201).json({
        status: "Successfully added screenshot",
        screenshot,
      });
    }
  } catch (error) {
    throw new Error(error);
  }
});

// @desc    Get activities
// @route   POST /activity/getActivities
// @access  Private
const getActivities = asyncHandler(async (req, res, next) => {
  try {
    // typically for a month
    const { startTime, endTime, userId, hello } = req.body;
    let user = await User.findById(userId);

    if (!user) {
      res.status(404).json({
        message: "No user found",
      });
    }
    ``;

    // match activities from the users activities and for a full month
    const activities = await Activity.aggregate([
      {
        $match: {
          $and: [
            { employee: mongoose.Types.ObjectId(userId) },
            {
              activityOn: {
                $gte: new Date(startTime.toString()),
                $lte: new Date(endTime.toString()),
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "screenshots",
          localField: "screenshots",
          foreignField: "_id",
          as: "screenshots",
        },
      },
      {
        $lookup: {
          from: "projects",
          localField: "project",
          foreignField: "_id",
          as: "project",
        },
      },
      {
        $unwind: {
          path: "$project",
          includeArrayIndex: "string",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          "project._id": 1,
          "project.name": 1,
          screenshots: 1,
          screenshots: 1,
          startTime: 1,
          endTime: 1,
          consumeTime: { $subtract: ["$endTime", "$startTime"] },
          activityOn: 1,
          isInternal: 1,
          isAccepted: 1,
          performanceData: 1,
        },
      },
    ]);

    user = {
      firstName: user.firstName,
      lastName: user.lastName,
      _id: user._id,
    };

    res.status(201).json({
      status: "Successfully fetched Activiies",
      data: activities,
      user: user,
    });
  } catch (error) {
    next(error);
  }
});

// @desc    Update the activity
// @route   PATCH /activity/:id
// @access  Private
const updateActivity = asyncHandler(async (req, res) => {
  try {
    const activityId = req.params.id;
    const unUpdatedactivity = await Activity.findByIdAndUpdate(
      activityId,
      req.body
    );
    const activity = await Activity.findById(activityId);

    if (!unUpdatedactivity) {
      res.status(404);
      throw new Error(`No activity found ${activityId}`);
    }

    res.status(202).json({
      message: "Succesfully edited activity",
      data: activity,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// @desc    Delete the activity
// @route   DELETE /activity
// @access  Private
const deleteActivity = asyncHandler(async (req, res) => {
  try {
    const { activityId } = req.body;
    console.log(activityId);
    // check for activity
    let activity = await Activity.findById(activityId);
    if (!activity) {
      res.status(404);
      throw new Error("No such activity found");
    }

    // delete from user, project and client and del all screenshots
    await User.updateOne(
      { _id: req.user._id },
      {
        $pull: {
          activities: activityId,
        },
      }
    );
    await Project.updateOne(
      { _id: activity.project },
      {
        $pull: {
          activities: activityId,
        },
      }
    );
    await Client.updateOne(
      { _id: activity.client },
      {
        $pull: {
          activities: activityId,
        },
      }
    );
    await Screenshot.deleteMany({ _id: { $in: activity.screenshots } });
    activity = await Activity.findByIdAndDelete(activityId);

    res.status(200).json({
      status: "Successfully deleted activity",
    });
  } catch (error) {
    throw new Error(error);
  }
});

// @desc    Delete the screenshot
// @route   DELETE /activity/screenshot
// @access  Private
const deleteScreenshot = asyncHandler(async (req, res) => {
  try {
    const { screenshotId } = req.body;
    // screenshots.forEach(async (screenshotId) => {
    //   const screenshot = await Screenshot.findById(screenshotId);
    //   if (screenshot) {
    //     // get del time and subtract from endTime and pull ss form act
    //     const delTime = screenshot.consumeTime ?? 0;

    //     const activity = await Activity.findById(screenshot.activityId);
    //     activity.consumeTime = activity.consumeTime - delTime;

    //     await Activity.updateOne(
    //       { _id: screenshot.activityId },
    //       {
    //         $pull: {
    //           screenshots: screenshotId,
    //         },
    //       },
    //       {
    //         $set: {
    //           endTime: { $subtract: ["$endTime", delTime] },
    //         },
    //       }
    //     );
    //     await activity.save();

    //     // del ss
    //     await Screenshot.findByIdAndDelete(screenshotId);
    //   }
    // });

    const screenshot = await Screenshot.findById(screenshotId);
    if (!screenshot) throw new Error('Screenshot not found', 404);

    await Activity.updateOne(
      { _id: screenshot.activityId },
      {
        $pull: {
          screenshots: screenshotId,
        },
      },
      {
        $set: {
          endTime: { $subtract: ["$endTime", delTime] },
        },
      }
    );

    // del ss
    await Screenshot.findByIdAndDelete(screenshotId);

    res.status(200).json({
      status: "Successfully deleted screenshots",
    });
  } catch (error) {
    throw new Error(error);
  }
});

// @desc    Split a  activity
// @route   POST /activity
// @access  Private
const splitActivity = asyncHandler(async (req, res) => {
  const {
    activityId,
    clientId,
    projectId,
    task,
    // startTime,
    splitTime,
    // endTime,
    performanceData,
    isInternal,
  } = req.body;

  const intialActivity = await Activity.findById(activityId).populate(
    "screenshots"
  );

  const intitialActivityTime = parseInt(intialActivity.startTime);
  const finalActivityTime = intialActivity.endTime;
  const screenShots = intialActivity.screenshots;

  const activity1 = await Activity.create({
    employee: req.user._id,
    client: clientId,
    project: projectId,
    task,
    performanceData,
    startTime: intitialActivityTime,
    endTime: splitTime,
    isInternal,
  });
  const activity2 = await Activity.create({
    employee: req.user._id,
    client: clientId,
    project: projectId,
    task,
    performanceData,
    startTime: splitTime,
    endTime: finalActivityTime,
    isInternal,
  });

  if (activity1) {
    const user = await User.findById(req.user._id);

    let today = dayjs(intitialActivityTime).format("DD/MM/YYYY");

    let found = false;
    for (let i = 0; i < user.days.length; i++) {
      const day = user.days[i];
      if (day.date == today) {
        found = true;
        day.activities.push(activity1);
        break;
      }
    }
    if (found == false) {
      const day = {
        date: today,
        activities: [activity1],
      };
      user.days.push(day);
    }
    await user.save();
  } else {
    throw new Error("Internal server error");
  }
  if (activity2) {
    const user = await User.findById(req.user._id);

    let today = dayjs(intitialActivityTime).format("DD/MM/YYYY");

    let found = false;
    for (let i = 0; i < user.days.length; i++) {
      const day = user.days[i];

      if (day.date == today) {
        found = true;
        day.activities.push(activity2);
        break;
      }
    }
    if (found == false) {
      const day = {
        date: today,
        activities: [activity2],
      };
      user.days.push(day);
    }
    await user.save();
  } else {
    throw new Error("Internal server error");
  }
  screenShots.forEach((screenShot) => {
    const time = parseInt(screenShot.activityAt);
    let screenShotTime = new Date(time);
    let EndTime = parseInt(activity1.endTime);
    let endTime = new Date(EndTime);
    if (screenShotTime <= endTime) {
      activity1.screenshots.push(screenShot._id);
    } else {
      activity2.screenshots.push(screenShot._id);
    }
  });
  try {
    await activity1.save();
    await activity2.save();
    await Activity.findByIdAndRemove(activityId);
  } catch (error) {
    throw new Error("Sorry DataBase is Down");
  }

  res.status(200).json({
    status: "Activity Splitted Successfully",
  });
});

// @desc    Update the last active
// @route   POST /activity/lastActive
// @access  Private
const updateLastActive = asyncHandler(async (req, res) => {
  try {
    const { _id } = req.user;
    const { lastActive } = req.body;

    const user = await User.findByIdAndUpdate(
      { _id },
      { lastActive: lastActive }
    );

    if (!user) {
      res.status(404);
      throw new Error("No such user found");
    }

    await user.save();

    res.status(202).json({
      message: "Succesfully edited last active",
      data: user.lastActive,
    });
  } catch (error) {
    throw new Error(error);
  }
});

export {
  createActivity,
  createScreenShot,
  getActivities,
  updateActivity,
  splitActivity,
  deleteScreenshot,
  deleteActivity,
  updateLastActive,
  // del ss, update last and split left
};
