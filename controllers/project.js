import mongoose from "mongoose";

// models
import Client from "../models/client.js";
import Project from "../models/project.js";
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
    const [data] = await User.aggregate([
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
    ]);

    res.status(200).json({
      status: "Successfully fetched projects",
      projects: data ? data.projects : [],
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
    let project = await Project.find(projectId);
    // needed to check what we are editing (diff for client)
    const editType = req.params.editType;

    if (
      editType === "name" ||
      editType === "budget" ||
      editType === "pLeader"
    ) {
      // simply replace the attributes
      project = await Project.findByIdAndUpdate(projectId, req.body);
      if (!project) {
        res.status(404);
        throw new Error(`No project found ${projectId}`);
      }
    } else if (editType === "client") {
      let { client } = req.body;
      // if new pLeader is sent then only run.
      if (client != project.client) {
        // pull the project from the client
        await Client.updateOne(
          { _id: project.client },
          { $pull: { projects: mongoose.Types.ObjectId(projectId) } }
        );
        // add project to the new client if client is not null
        if (client) {
          await Client.updateOne(
            { _id: client },
            { $push: { projects: mongoose.Types.ObjectId(projectId) } }
          );
        }
        // replace client in project
        project = await Project.findByIdAndUpdate(projectId, req.body);
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

//////////////////////////////////////////////////////////////////////////////////
// @desc    Add employee to project by id
// @route   PATCH /project/addMember/:id
// @access  Private
const addMember = asyncHandler(async (req, res) => {
  const { employeeId } = req.body;
  const projectId = req.params.id;
  let alreadyMember = false;
  let alreadyProjectAdded = false;
  try {
    const project = await Project.findById(projectId);
    if (!project) {
      res.status(404);
      throw new Error("Project not found");
    }

    const newEmployee = await User.findById(employeeId);
    if (!newEmployee) {
      res.status(404);
      throw new Error("No such employee found");
    }

    if (project.employees.includes(employeeId)) alreadyMember = true;

    // project.employees.forEach((employee) => {
    //   if (employee.equals(employeeId)) {
    //     alreadyMember = true;
    //   }
    // });

    if (alreadyMember) {
      return res.status(200).json({
        status: "Already A Member",
        data: project,
      });
    }

    if (newEmployee.projects.includes(project._id)) alreadyProjectAdded = true;
    // newEmployee.projects.forEach((id) => {
    //   if (id.equals(project._id)) {
    //     alreadyProjectAdded = true;
    //   }
    // });

    if (!alreadyProjectAdded) {
      newEmployee.projects.push(projectId);
      await newEmployee.save();
    }

    //notification for the employee
    const notification = {
      title: "New Project",
      description: `Added to the team ${project.name}`,
      avatar: "if there is some avatar",
      type: "projects",
    };
    newEmployee.notifications = [notification, ...newEmployee.notifications];
    await newEmployee.save();
    project.employees.push(employeeId);
    await project.save();
    res.status(201).json({
      status: "ok",
      data: project,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// @desc    Remove employee from project by id
// @route   PATCH /project/removeMember/:id
// @access  Private
const removeMember = asyncHandler(async (req, res) => {
  const permission = ac.can(req.user.role).updateOwn("project");
  if (permission.granted) {
    try {
      const { employeeId } = req.body;
      const projectId = req.params.id;
      const project = await Project.findById(projectId);
      if (!project) {
        res.status(404);
        throw new Error(`Not found project ${projectId}`);
      }
      const employee = await User.findById(employeeId);
      if (!employee) {
        res.status(404);
        throw new Error(`Not found employee ${employeeId}`);
      }

      if (project.projectLeader?._id.toHexString() === employeeId) {
        project.projectLeader = undefined;
      }

      project.employees = project.employees.filter(
        (id) => id.toHexString() !== employeeId
      );

      employee.projects = employee.projects.filter(
        (id) => id.toHexString() !== projectId
      );

      await employee.save();
      await project.save();
      res.status(200).json({
        status: "success",
        data: project,
      });
    } catch (error) {
      throw new Error(error);
    }
  } else {
    res.status(403).end("UnAuthorized");
  }
});
//////////////////////////////////////////////////////////////////////////////////

export {
  createProject,
  getProjects, //(for app)
  getProjectsByClients, //(for website)
  deleteProjectById,
  editProjectById,
  getProjectById,
  addMember,
  removeMember,
};
