const express = require("express");
const jwt = require("jsonwebtoken");
const { authMiddleware } = require("./middleware");

const app = express();
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "atlassian123123password";

let nextUserId = 3;
let nextOrganizationId = 3;
let nextBoardId = 2;
let nextIssueId = 3;

const users = [
  { id: 1, username: "vaibhav", password: "vaibhav123" },
  { id: 2, username: "harkirat", password: "harkirat123" },
];

const organizations = [
  {
    id: 1,
    title: "100xdevs",
    description: "100xdevs is a community of developers",
    admin: 1,
    members: [2],
  },
  {
    id: 2,
    title: "VaibhavXcoding",
    description: "Experimenting",
    admin: 2,
    members: [],
  },
];

const boards = [
  {
    id: 1,
    title: "100xdevs board (frontend)",
    description: "Frontend work for the 100xdevs community",
    organizationId: 1,
  },
];

const issues = [
  { id: 1, title: "add dark mode", description: "Support dark theme", boardId: 1 },
  { id: 2, title: "add light mode", description: "Support light theme", boardId: 1 },
];

function findUserByUsername(username) {
  return users.find((user) => user.username === username);
}

function findOrganization(id) {
  return organizations.find((org) => org.id === id);
}

function userBelongsToOrganization(userId, organization) {
  return organization.admin === userId || organization.members.includes(userId);
}

function requireMembership(req, res, organization) {
  if (!userBelongsToOrganization(req.userId, organization)) {
    res.status(403).json({ message: "Forbidden: you are not a member of this organization" });
    return false;
  }
  return true;
}

app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "username and password are required" });
  }

  const existingUser = findUserByUsername(username);
  if (existingUser) {
    return res.status(409).json({ message: "User exists with this username" });
  }

  const newUser = {
    id: nextUserId++,
    username,
    password,
  };

  users.push(newUser);
  res.status(201).json({ message: "User created successfully", userId: newUser.id });
});

app.post("/signin", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "username and password are required" });
  }

  const user = users.find((u) => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ message: "Invalid username or password" });
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "8h" });
  res.json({ message: "User signed in successfully", token });
});

app.get("/me", authMiddleware, (req, res) => {
  const user = users.find((u) => u.id === req.userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }
  res.json({ id: user.id, username: user.username });
});

app.post("/organization", authMiddleware, (req, res) => {
  const { title, description } = req.body;
  if (!title || !description) {
    return res.status(400).json({ message: "title and description are required" });
  }

  const newOrganization = {
    id: nextOrganizationId++,
    title,
    description,
    admin: req.userId,
    members: [],
  };

  organizations.push(newOrganization);
  res.status(201).json({ message: "Organization created successfully", organization: newOrganization });
});

app.get("/organizations", authMiddleware, (req, res) => {
  const userOrgs = organizations.filter((org) => userBelongsToOrganization(req.userId, org));
  res.json({ organizations: userOrgs });
});

app.post("/organization/:id/members", authMiddleware, (req, res) => {
  const organizationId = Number(req.params.id);
  const { memberUsername } = req.body;
  const organization = findOrganization(organizationId);

  if (!organization) {
    return res.status(404).json({ message: "Organization not found" });
  }

  if (organization.admin !== req.userId) {
    return res.status(403).json({ message: "Unauthorized: only the organization admin can add members" });
  }

  const memberUser = findUserByUsername(memberUsername);
  if (!memberUser) {
    return res.status(404).json({ message: "User not found" });
  }

  if (organization.members.includes(memberUser.id)) {
    return res.status(409).json({ message: "User is already a member of the organization" });
  }

  organization.members.push(memberUser.id);
  res.json({ message: "User added to organization successfully" });
});

app.delete("/organization/:id/members", authMiddleware, (req, res) => {
  const organizationId = Number(req.params.id);
  const { memberUsername } = req.body;
  const organization = findOrganization(organizationId);

  if (!organization) {
    return res.status(404).json({ message: "Organization not found" });
  }

  if (organization.admin !== req.userId) {
    return res.status(403).json({ message: "Unauthorized: only the organization admin can remove members" });
  }

  const memberUser = findUserByUsername(memberUsername);
  if (!memberUser) {
    return res.status(404).json({ message: "User not found" });
  }

  const beforeCount = organization.members.length;
  organization.members = organization.members.filter((id) => id !== memberUser.id);
  if (organization.members.length === beforeCount) {
    return res.status(404).json({ message: "User is not a member of the organization" });
  }

  res.json({ message: "User removed from organization successfully" });
});

app.post("/boards", authMiddleware, (req, res) => {
  const { title, description, organizationId } = req.body;
  if (!title || !description || !organizationId) {
    return res.status(400).json({ message: "title, description, and organizationId are required" });
  }

  const organization = findOrganization(Number(organizationId));
  if (!organization) {
    return res.status(404).json({ message: "Organization not found" });
  }

  if (!userBelongsToOrganization(req.userId, organization)) {
    return res.status(403).json({ message: "Forbidden: you are not a member of this organization" });
  }

  const newBoard = {
    id: nextBoardId++,
    title,
    description,
    organizationId: organization.id,
  };

  boards.push(newBoard);
  res.status(201).json({ message: "Board created successfully", board: newBoard });
});

app.get("/boards", authMiddleware, (req, res) => {
  const organizationId = Number(req.query.organizationId);
  if (!organizationId) {
    return res.status(400).json({ message: "organizationId query parameter is required" });
  }

  const organization = findOrganization(organizationId);
  if (!organization) {
    return res.status(404).json({ message: "Organization not found" });
  }

  if (!userBelongsToOrganization(req.userId, organization)) {
    return res.status(403).json({ message: "Forbidden: you are not a member of this organization" });
  }

  const organizationBoards = boards.filter((board) => board.organizationId === organizationId);
  res.json({ boards: organizationBoards });
});

app.post("/issues", authMiddleware, (req, res) => {
  const { title, description, boardId } = req.body;
  if (!title || !description || !boardId) {
    return res.status(400).json({ message: "title, description, and boardId are required" });
  }

  const board = boards.find((board) => board.id === Number(boardId));
  if (!board) {
    return res.status(404).json({ message: "Board not found" });
  }

  const organization = findOrganization(board.organizationId);
  if (!organization) {
    return res.status(404).json({ message: "Organization for this board was not found" });
  }

  if (!userBelongsToOrganization(req.userId, organization)) {
    return res.status(403).json({ message: "Forbidden: you are not a member of this organization" });
  }

  const newIssue = {
    id: nextIssueId++,
    title,
    description,
    boardId: board.id,
    status: "todo",
  };

  issues.push(newIssue);
  res.status(201).json({ message: "Issue created successfully", issue: newIssue });
});

app.get("/issues", authMiddleware, (req, res) => {
  const boardId = Number(req.query.boardId);
  if (!boardId) {
    return res.status(400).json({ message: "boardId query parameter is required" });
  }

  const board = boards.find((board) => board.id === boardId);
  if (!board) {
    return res.status(404).json({ message: "Board not found" });
  }

  const organization = findOrganization(board.organizationId);
  if (!organization) {
    return res.status(404).json({ message: "Organization for this board was not found" });
  }

  if (!userBelongsToOrganization(req.userId, organization)) {
    return res.status(403).json({ message: "Forbidden: you are not a member of this organization" });
  }

  const boardIssues = issues.filter((issue) => issue.boardId === boardId);
  res.json({ issues: boardIssues });
});

app.use((req, res) => {
  res.status(404).json({ message: "Resource not found" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Trello backend is running on http://localhost:${PORT}`);
});
