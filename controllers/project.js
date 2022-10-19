import mongoose from "mongoose";

// models
import Client from "../models/client.js";
import Project from "../models/project.js";
import Activity from "../models/activity.js";
import User from "../models/user.js";
import asyncHandler from "express-async-handler";

// utils
// import { uniqueFinder } from "../utils/uniqueEntry.js";
// import capitalize from "../utils/capitalize.js";
import { AccessControl } from "accesscontrol";
import { grantsObject } from "../utils/permissions.js";

const ac = new AccessControl(grantsObject);

// @desc    Create a new project
// @route   POST /project/create
// @access  Private
const createProject = asyncHandler(async (req, res) => {
  try {
    const user = req.user;
    let { name, clientId } = req.body;

    // Get client, could be null or client
    const client = await Client.findById(clientId);

    // Create project with given parameters
    const project = await new Project({
      name,
      client: client ? client._id : null,
      createdBy: user._id,
      employees: [user._id],
    });
    if (!project) throw new Error("Error creating new project");
    project.save();

    // Add project to the users projets
    user.projects.push(project._id);
    await user.save();

    // Add project to the client's projects IF client != null
    if (client) {
      client.projects.push(project._id);
      await client.save();
    }

    res.status(201).json({
      status: "Successfully Created Project",
      data: project,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// @desc    Get user's all projects by Clients
// @route   GET /project/byClients
// @access  Private
const getProjectsByClients = asyncHandler(async (req, res) => {
  try {
    const clients = await Project.aggregate([
      [
        {
          $match: {},
        },
        {
          $group: {
            _id: "$client",
            projects: {
              $push: {
                _id: "$_id",
                name: "$name",
              },
            },
          },
        },
        {
          $lookup: {
            from: "clients",
            localField: "_id",
            foreignField: "_id",
            as: "client",
          },
        },
        {
          $unwind: {
            path: "$client",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            _id: 1,
            projects: 1,
            name: "$client.name",
          },
        },
      ],
    ]);

    res.status(200).json({
      status: "Successfully fetched projects",
      data: clients ? clients : [],
    });
  } catch (error) {
    throw new Error(error);
  }
});

// @desc    Get user's all projects
// @route   GET /project
// @access  Private
const getProjects = asyncHandler(async (req, res) => {
  try {
    const user = req.user;

    // find user and look up join all the projects
    const data = await User.aggregate([
      {
        $match: {
          _id: mongoose.Types.ObjectId(user._id),
        },
      },
      {
        $lookup: {
          from: "projects",
          localField: "projects",
          foreignField: "_id",
          as: "projects",
        },
      },
      {
        $unwind: {
          path: "$projects",
          includeArrayIndex: "string",
        },
      },
      {
        $group: {
          _id: "$projects._id",
          client: {
            $first: "$projects.client",
          },
          name: {
            $first: "$projects.name",
          },
          activities: {
            $first: "$projects.activities",
          },
          budget: {
            $first: "$projects.budget",
          },
        },
      },
      {
        $lookup: {
          from: "clients",
          localField: "client",
          foreignField: "_id",
          as: "client",
        },
      },
      {
        $unwind: {
          path: "$client",
          preserveNullAndEmptyArrays: true,
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
                week: {
                  $week: "$activityOn",
                },
                month: {
                  $month: "$activityOn",
                },
                year: {
                  $year: "$activityOn",
                },
                consumeTime: {
                  $subtract: ["$endTime", "$startTime"],
                },
              },
            },
            {
              $group: {
                _id: null,
                consumeTime: {
                  $sum: "$consumeTime",
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
        $addFields: {
          consumeTime: "$time.consumeTime",
        },
      },
      {
        $project: {
          name: 1,
          _id: 1,
          budget: 1,
          consumeTime: { $ifNull: ["$consumeTime", 0] },
          client: {
            $ifNull: ["$client", null],
          },
        },
      },
    ]);

    res.status(200).json({
      status: "Successfully fetched projects",
      data: data ?? [],
    });
  } catch (error) {
    throw new Error(error);
  }
});

// @desc    Get project by id
// @route   GET /project/:id
// @access  Public
const getProjectById = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.aggregate([
      {
        $match: { _id: mongoose.Types.ObjectId(id) },
      },
      {
        $lookup: {
          from: "clients",
          localField: "client",
          foreignField: "_id",
          as: "client",
        },
      },
      {
        $unwind: {
          path: "$client",
          includeArrayIndex: "string",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "projectLeader",
          foreignField: "_id",
          as: "projectLeader",
        },
      },
      {
        $unwind: {
          path: "$projectLeader",
          includeArrayIndex: "string",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          name: 1,
          budget: 1,
          "projectLeader.name": {
            $concat: [
              "$projectLeader.firstName",
              " ",
              "$projectLeader.lastName",
            ],
          },
          "projectLeader._id": 1,
          "client.name": 1,
          "client._i": 1,
          employees: 1,
        },
      },
    ]);
    if (!project.length) {
      res.status(404);
      throw new Error(`No project found ${id}`);
    }
    res.status(200).json({
      status: "Successfully fetched project",
      data: project[0],
    });
  } catch (error) {
    throw new Error(error);
  }
});

// @desc    Edit project
// @route   PATCH /project/:id/:editType
// @access  Private
const editProjectById = asyncHandler(async (req, res) => {
  try {
    const projectId = req.params.id;
    const editType = req.params.editType;
    // needed to check what we are editing (diff for client)
    let project = await Project.find({ _id: projectId });

    if (editType == "name" || editType == "budget" || editType == "pLeader") {
      // simply replace the attributes
      project = await Project.findByIdAndUpdate({ _id: projectId }, req.body);
      if (!project) {
        res.status(404);
        throw new Error(`No project found ${projectId}`);
      }
    } else if (editType == "client") {
      let { client } = req.body;

      // if same end the request
      if (client === project.client) {
        res.status(200).json({
          status: "Successfully edited project",
          data: project,
        });
      } else {
        if (client === null) {
          // pull project from prev client if exists
          if (project.client) {
            await Client.updateOne(
              { _id: project.client },
              { $pull: { projects: mongoose.Types.ObjectId(projectId) } }
            );
          }
          // change client
          project = await Project.findByIdAndUpdate(projectId, req.body);
        } else {
          // push to the new client
          await Client.updateOne(
            { _id: client },
            { $push: { projects: mongoose.Types.ObjectId(projectId) } }
          );
          // change client
          project = await Project.findByIdAndUpdate(projectId, req.body);
        }
      }
    }

    res.status(200).json({
      status: "Successfully edited project",
      data: project,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// @desc    Delete a project
// @route   DELETE /project/:id
// @access  Private

const deleteProjectById = asyncHandler(async (req, res) => {
  try {
    const projectId = req.params.id;
    let project = await Project.findById(projectId);
    if (!project) {
      res.status(404);
      throw new Error(`No project found ${projectId}`);
    }

    // pull out project id from the client's projects
    await Client.updateOne(
      { _id: project.client },
      { $pull: { projects: mongoose.Types.ObjectId(projectId) } }
    );

    // pull out all project id from all the employees
    await User.updateMany(
      { _id: { $in: project.employees } },
      { $pull: { projects: mongoose.Types.ObjectId(projectId) } }
    );

    // delete the project
    project = await Project.findByIdAndRemove(projectId);

    res.status(202).json({
      status: "Successfully Deleted Project",
      status: project,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// @desc    Add employee to project by id
// @route   PATCH /project/members/add/:id
// @access  Private
const addMember = asyncHandler(async (req, res) => {
  try {
    const { employeeId } = req.body;
    const projectId = req.params.id;

    // check for valid project
    const project = await Project.findById(projectId);
    if (!project) {
      res.status(404);
      throw new Error("Project not found");
    }

    // check for valid employee
    const newEmployee = await User.findById(employeeId);
    if (!newEmployee) {
      res.status(404);
      throw new Error("No such employee found");
    }

    await User.updateOne(
      { _id: employeeId },
      {
        $addToSet: {
          projects: projectId,
        },
      }
    );
    await Project.updateOne(
      { _id: projectId },
      {
        $addToSet: {
          employees: employeeId,
        },
      }
    );

    res.status(201).json({
      status: "ok",
    });
  } catch (error) {
    throw new Error(error);
  }
});

// @desc    Get project time id
// @route   GET /project/getTime/:id
// @access  Private
const getProjectTimeById = asyncHandler(async (req, res) => {
  try {
    const id = req.params.id;
    // get id to perfrom aggregation on activities
    const project = await Project.findById(id);
    if (!project) {
      res.status(404);
      throw new Error("Project not found");
    }

    const projectTime = await Activity.aggregate([
      {
        $match: { _id: { $in: project.activities } },
      },
      {
        $facet: {
          employeeTime: [
            {
              $lookup: {
                from: "users",
                localField: "employee",
                foreignField: "_id",
                as: "employee",
              },
            },
            {
              $unwind: {
                path: "$employee",
                includeArrayIndex: "string",
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $group: {
                _id: {
                  employeeId: "$employee._id",
                  name: {
                    $concat: ["$employee.firstName", " ", "$employee.lastName"],
                  },
                },
                internalTime: {
                  $sum: {
                    $cond: ["$isInternal", "$consumeTime", 0],
                  },
                },
                externalTime: {
                  $sum: {
                    $cond: ["$isInternal", 0, "$consumeTime"],
                  },
                },
                totalTIme: {
                  $sum: "$consumeTime",
                },
              },
            },
            {
              $project: {
                id: "$_id.employeeId",
                name: "$_id.name",
                internalTime: 1,
                externalTime: 1,
                totalTime: 1,
              },
            },
          ],
          projectTime: [
            {
              $group: {
                _id: null,
                internalTime: {
                  $sum: {
                    $cond: ["$isInternal", "$consumeTime", 0],
                  },
                },
                externalTime: {
                  $sum: {
                    $cond: ["$isInternal", 0, "$consumeTime"],
                  },
                },
                totalTime: {
                  $sum: "$consumeTime",
                },
              },
            },
            {
              $project: {
                _id: 0,
                internalTime: 1,
                externalTime: 1,
                totalTime: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$projectTime",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    const data = {
      employeeTime: projectTime.length ? projectTime[0].employeeTime : null,
      projectTime: projectTime.length ? projectTime[0].projectTime : null,
    };

    res.status(200).json({
      status: "Success",
      data,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// @desc    Remove employee from project by id
// @route   PATCH /project//members/remove/:id
// @access  Private
const removeMember = asyncHandler(async (req, res) => {
  try {
    const { employeeId } = req.body;
    const projectId = req.params.id;
    // check for valid project
    const project = await Project.findById(projectId);
    if (!project) {
      res.status(404);
      throw new Error(`Not found project ${projectId}`);
    }
    // check for valid user
    const employee = await User.findById(employeeId);
    if (!employee) {
      res.status(404);
      throw new Error(`Not found employee ${employeeId}`);
    }

    await User.updateOne(
      { _id: employeeId },
      {
        $pull: {
          projects: projectId,
        },
      }
    );
    await Project.updateOne(
      { _id: projectId },
      {
        $pull: {
          employees: employeeId,
        },
      }
    );

    res.status(200).json({
      status: "success",
      data: project,
    });
  } catch (error) {
    throw new Error(error);
  }
});

export {
  createProject,
  getProjects, //(for app)
  getProjectsByClients, //(for website)
  deleteProjectById,
  editProjectById,
  getProjectById,
  getProjectTimeById,
  addMember,
  removeMember,
};
