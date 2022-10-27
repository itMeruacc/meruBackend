import User from "../models/user.js";
import Client from "../models/client.js";
import Project from "../models/project.js";
import Team from "../models/team.js";
import mongoose from "mongoose";
import asyncHandler from "express-async-handler";

import { AccessControl } from "accesscontrol";
import { grantsObject } from "../utils/permissions.js";
// var weekday = require("dayjs/plugin/weekday");
import weekday from "dayjs/plugin/weekday.js";

const ac = new AccessControl(grantsObject);

// @desc    Get employee details by ID
// @route   GET /employee/:id
// @access  Private

const getEmployeeById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await User.findById(id);
    if (!employee) {
      res.status(404);
      throw new Error(`Employee not found `);
    }
    res.status(200).json({
      status: "Ok",
      data: employee,
    });
  } catch (error) {
    throw new Error(error);
  }
});
import dayjs from "dayjs";

const getEmployeeDetails = asyncHandler(async (req, res) => {
  // const permission = ac.can(req.user.role).readOwn("members");
  if (true) {
    var todayHours = 0;
    var yesterday;
    var yesterdayHours;
    var tomorrow;
    var tomorrowHours;
    try {
      const { id } = req.params;
      const employee = await User.findById(id);
      if (!employee) {
        res.status(404);
        throw new Error(`Employee not found `);
      }
      const { userArr } = req.body;
      const arrData = [];
      for (var i = 0; i < userArr.length; i++) {
        const userId = userArr[i];
        const employee = await User.findById(userId);
        if (!employee) {
          res.status(404);
          throw new Error(`Employee not found `);
        }
        const day = dayjs();
        const dayArr = employee.days;

        var j;
        for (j = 0; j < dayArr.length; j++) {
          const dayObj = dayArr[j];
          let today = dayjs().format("DD/MM/YYYY").toString();
          // let today = dayjs().format("DD/MM/YYYY");
          if (dayObj.date == today) {
            todayHours = dayObj.dailyHours;

            yesterday = dayArr[j - 1];
            yesterdayHours = yesterday.dailyHours;

            // tomorrow = dayArr[j + 1];
            // tomorrowHours = tomorrow.dailyHours;
          }
        }
        let today = dayjs().format("DD/MM/YYYY").toString();
        let thisMonth = dayjs().month();
        let thisYear = dayjs().year();
        const firstDate = dayjs()
          .date(1)
          .month(thisMonth)
          .year(thisYear)
          .format("DD/MM/YYYY");
        let lastDate = dayjs()
          .date(25)
          .month(thisMonth)
          .year(thisYear)
          .format("DD/MM/YYYY");

        dayjs.extend(weekday);

        // when Sunday is the first day of the week

        const weekStart = dayjs().weekday(-7).format("DD/MM/YYYY");
        const weekEnd = dayjs().weekday(7).format("DD/MM/YYYY"); // next Sunday

        const totalMonth = await User.aggregate([
          {
            $match: {
              _id: { $eq: employee._id },
            },
          },
          { $unwind: "$days" },
          {
            $match: {
              // "days.dailyHours": { $eq: 0 },
              $and: [
                {
                  "days.date": {
                    $gte: firstDate,
                    $lte: lastDate,
                  },
                },
                // { "days.dailyHours": { $eq: 0 } },
              ],
            },
          },
          {
            $group: {
              _id: employee._id,
              totalHours: { $sum: "$days.dailyHours" },
              // avgPerformanceData: { $avg: "$performanceData" },
              docCount: { $sum: 1 },
            },
          },
        ]);

        const totalWeek = await User.aggregate([
          {
            $match: {
              _id: { $eq: employee._id },
            },
          },
          { $unwind: "$days" },
          {
            $match: {
              // "days.dailyHours": { $eq: 0 },
              $and: [
                {
                  "days.date": {
                    $gte: weekStart,
                    $lte: weekEnd,
                  },
                },
                // { "days.dailyHours": { $eq: 0 } },
              ],
            },
          },
          {
            $group: {
              _id: employee._id,
              totalHours: { $sum: "$days.dailyHours" },
              // avgPerformanceData: { $avg: "$performanceData" },
              docCount: { $sum: 1 },
            },
          },
        ]);

        const totalMonthHours = totalMonth.totalHours;
        const totalWeekTime = totalWeek.totalHours;
        const obj = {
          employee,
          todayHours,
          yesterdayHours,
          tomorrowHours,
          totalMonthHours,
          totalWeekTime,
        };
        arrData.push(obj);
      }
      res.status(200).json({
        status: "Ok",
        data: employee,
        arrData,
      });
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  } else {
    // resource is forbidden for this user/role
    res.status(403).end("UnAuthorized");
  }
});

// @desc    Get employee details
// @route   GET /employee/employeeList
// @access  Private

const getEmployeeList = asyncHandler(async (req, res) => {
  const permission = ac.can(req.user.role).readOwn("members");
  if (permission.granted) {
    try {
      const { teams } = await User.findById(req.user._id).populate({
        path: "teams",
        model: "Team",
        populate: {
          path: "members",
          model: "User",
          select: ["firstName", "lastName", "email"],
        },
      });

      res.status(200).json({
        messsage: "Success",
        data: teams,
      });
    } catch (error) {
      throw new Error(error);
    }
  } else {
    // resource is forbidden for this user/role
    res.status(403).end("UnAuthorized");
  }
});

// @desc    Delete a employee
// @route   DELETE /employee/:id
// @access  Private

const deleteEmployee = asyncHandler(async (req, res) => {
  const id = req.params.id;
  const permission = ac.can(req.user.role).deleteOwn("members");
  if (permission.granted) {
    try {
      /* ---------------------------- finding employee ---------------------------- */

      const employee = await User.findById(id);

      if (employee) {
        res.status(404);
        throw new Error("Employee to be deleted not found");
      }

      /* ------ finding employee clients and removing createdBy field ----- */

      for (let i = 0; i < employee.clients.length; i++) {
        const clientId = employee.clients[i];
        const client = await Client.findById(clientId);
        client.createdBy = undefined;
        await client.save();
      }

      /* ------ removing project reference field of employee that is deleted ------ */
      for (let i = 0; i < employee.projects.length; i++) {
        const projectId = employee.projects[i];
        const project = await Project.findById(projectId);

        project.employees.forEach((employee, index) => {
          if (employee.toHexString() == id.toHexString()) {
            project.employees.splice(index, 1);
          }
        });
        if (project.projectLeader.toHexString() == id.toHexString()) {
          project.projectLeader = undefined;
        }
        if (project.createdBy.toHexString() == id.toHexString()) {
          project.createdBy = undefined;
        }
        await project.save();
      }

      /* ------ removing team reference field of employee that is deleted ------ */
      for (let i = 0; i < employee.teams.length; i++) {
        const teamId = employee.teams[i];
        const team = await Team.findById(teamId);

        team.members.forEach((employee, index) => {
          if (employee.toHexString() == id.toHexString()) {
            team.members.splice(index, 1);
          }
        });

        await team.save();
      }
      await User.findByIdAndRemove(id);

      res.json({
        status: "Employee Deleted",
        data: employee,
      });
    } catch (error) {
      res.status(500);
      throw new Error(error);
    }
  } else {
    // resource is forbidden for this user/role
    res.status(403).end("UnAuthorized");
  }
});

// @desc    Edit a employee
// @route   PATCH /edit/:id
// @access  Private
const editEmployee = asyncHandler(async (req, res) => {
  const employeeId = req.params.id;
  try {
    const user = await User.findByIdAndUpdate(employeeId, req.body);

    user.save();
    res.json({
      message: "User Updated",
      data: user,
    });
  } catch (error) {
    console.log(error);
    throw new Error(error);
  }
});

// @desc    Get dashboard data
// @route   GET /dashboard
// @access  Private
const getDashboardData = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const date = new Date(new Date().setHours(0, 0, 0, 0)).toString();

    let userIds = [];
    if (user.role === "employee")
      userIds = [mongoose.Types.ObjectId(req.user.id)];
    if (user.role === "admin") {
      userIds = await User.aggregate([
        {
          $match: {},
        },
        {
          $project: { _id: 1 },
        },
      ]);
      userIds = userIds.map((user) => user._id);
    }

    console.log(userIds);

    const users = await User.aggregate([
      {
        $match: {
          _id: { $in: userIds },
        },
      },
      {
        $lookup: {
          from: "activities",
          let: {
            actIds: "$activities",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    {
                      $in: ["$_id", "$$actIds"],
                    },
                  ],
                },
              },
            },
            {
              $addFields: {
                consumeTime: {
                  $subtract: ["$endTime", "$startTime"],
                },
                week: {
                  $week: "$activityOn",
                },
                month: {
                  $month: "$activityOn",
                },
                year: {
                  $year: "$activityOn",
                },
                day: {
                  $dayOfYear: "$activityOn",
                },
              },
            },
            {
              $group: {
                _id: null,
                monthly: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          {
                            $eq: [
                              "$month",
                              {
                                $month: new Date(date),
                              },
                            ],
                          },
                          {
                            $eq: [
                              "$year",
                              {
                                $year: new Date(date),
                              },
                            ],
                          },
                        ],
                      },
                      "$consumeTime",
                      0,
                    ],
                  },
                },
                weekly: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          {
                            $eq: [
                              "$week",
                              {
                                $week: new Date(date),
                              },
                            ],
                          },
                          {
                            $eq: [
                              "$month",
                              {
                                $month: new Date(date),
                              },
                            ],
                          },
                          {
                            $eq: [
                              "$year",
                              {
                                $year: new Date(date),
                              },
                            ],
                          },
                        ],
                      },
                      "$consumeTime",
                      0,
                    ],
                  },
                },
                today: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          {
                            $gte: ["$activityOn", new Date(date)],
                          },
                          {
                            $lte: [
                              "$activityOn",
                              {
                                $dateAdd: {
                                  startDate: new Date(date),
                                  unit: "day",
                                  amount: 1,
                                },
                              },
                            ],
                          },
                        ],
                      },
                      "$consumeTime",
                      0,
                    ],
                  },
                },
                yesterday: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          {
                            $gte: [
                              "$activityOn",
                              {
                                $dateSubtract: {
                                  startDate: new Date(date),
                                  unit: "day",
                                  amount: 1,
                                },
                              },
                            ],
                          },
                          {
                            $lte: ["$activityOn", new Date(date)],
                          },
                        ],
                      },
                      "$consumeTime",
                      0,
                    ],
                  },
                },
              },
            },
          ],
          as: "time",
        },
      },
      {
        $unwind: {
          path: "$time",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          name: {
            $concat: ["$firstName", " ", "$lastName"],
          },
          time: {
            $ifNull: ["$time", {}],
          },
          lastActive: 1,
          role: 1,
          avatar: 1,
        },
      },
    ]);
    res.json({
      message: "Success",
      data: users,
    });
  } catch (e) {
    next(e);
  }
});

// @desc    Get all employees
// @route   GET /all
// @access  Private
const getAllEmployees = asyncHandler(async (req, res, next) => {
  try {
    const users = await User.aggregate([
      {
        $match: {},
      },
      {
        $project: {
          name: {
            $concat: ["$firstName", " ", "$lastName"],
          },
        },
      },
    ]);
    res.json({
      message: "Success",
      data: users,
    });
  } catch (e) {
    next(e);
  }
});

export {
  getEmployeeList,
  getEmployeeById,
  deleteEmployee,
  editEmployee,
  getEmployeeDetails,
  getDashboardData,
  getAllEmployees,
};
