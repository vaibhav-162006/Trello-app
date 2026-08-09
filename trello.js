const express = require("express");
const jwt = require("jsonwebtoken");

const { authMiddleware } = require("./middleware");

const app = express();

app.use(express.json());


// ==================================================
// DATABASE
// ==================================================

let userId = 1;
let organizationId = 1;
let boardId = 1;
let issueId = 1;

const users = [];

const organizations = [];

const boards = [];

const issues = [];


// ==================================================
// SIGNUP
// ==================================================

app.post("/signup", function (req, res) {

    const username = req.body.username;
    const password = req.body.password;

    // Check if user already exists
    const existingUser = users.find(
        user => user.username === username
    );

    if (existingUser) {

        return res.status(400).json({
            message: "User already exists with this username"
        });
    }

    // Create new user
    const newUser = {
        id: userId++,
        username: username,
        password: password
    };

    users.push(newUser);

    res.json({
        message: "User created successfully",
        userId: newUser.id
    });
});


// ==================================================
// SIGNIN
// ==================================================

app.post("/signin", function (req, res) {

    const username = req.body.username;
    const password = req.body.password;

    // Find user
    const existingUser = users.find(
        user =>
            user.username === username &&
            user.password === password
    );

    // User doesn't exist / wrong password
    if (!existingUser) {

        return res.status(401).json({
            message: "Invalid username or password"
        });
    }

    // Create JWT
    const token = jwt.sign(
        {
            userId: existingUser.id
        },
        process.env.JWT_SECRET ||
        "atlassian123123password"
    );

    res.json({
        message: "User signed in successfully",
        token: token
    });
});


// ==================================================
// CREATE ORGANIZATION
// ==================================================

app.post(
    "/organisation",
    authMiddleware,
    function (req, res) {

        // User who is currently logged in
        const user = req.userId;

        // Create organization
        const newOrganization = {

            id: organizationId++,

            title: req.body.title,

            description: req.body.description,

            // Logged-in user becomes admin
            admin: user,

            members: []
        };

        organizations.push(newOrganization);

        res.json({
            message: "Organization created successfully",
            id: newOrganization.id
        });
    }
);


// ==================================================
// ADD USER TO ORGANIZATION
// ==================================================

app.post(
    "/add-user-to-organisation",
    authMiddleware,
    function (req, res) {

        const user = req.userId;

        const orgId = Number(
            req.body.organizationId
        );

        const memberUsername =
            req.body.memberUsername;


        // Find organization
        const organization = organizations.find(
            org => org.id === orgId
        );


        // Organization doesn't exist
        if (!organization) {

            return res.status(404).json({
                message: "Organization not found"
            });
        }


        // Only admin can add members
        if (organization.admin !== user) {

            return res.status(401).json({
                message: "Unauthorized"
            });
        }


        // Find user who should be added
        const memberUser = users.find(
            user => user.username === memberUsername
        );


        if (!memberUser) {

            return res.status(404).json({
                message: "User not found"
            });
        }


        // Check if already member
        if (
            organization.members.includes(
                memberUser.id
            )
        ) {

            return res.status(400).json({
                message: "User is already a member"
            });
        }


        // Add user
        organization.members.push(
            memberUser.id
        );


        res.json({
            message:
                "User added to organization successfully"
        });
    }
);


// ==================================================
// CREATE BOARD
// ==================================================

app.post(
    "/boards",
    authMiddleware,
    function (req, res) {

        const user = req.userId;

        const orgId = Number(
            req.body.organizationId
        );


        // Find organization
        const organization = organizations.find(
            org => org.id === orgId
        );


        if (!organization) {

            return res.status(404).json({
                message: "Organization not found"
            });
        }


        // Only admin can create board
        if (organization.admin !== user) {

            return res.status(401).json({
                message: "Unauthorized"
            });
        }


        // Create board
        const newBoard = {

            id: boardId++,

            title: req.body.title,

            description: req.body.description,

            organizationId: orgId
        };


        boards.push(newBoard);


        res.json({
            message: "Board created successfully",
            id: newBoard.id
        });
    }
);


// ==================================================
// CREATE ISSUE
// ==================================================

app.post(
    "/issues",
    authMiddleware,
    function (req, res) {

        const user = req.userId;

        const boardIdFromBody = Number(
            req.body.boardId
        );


        // Find board
        const board = boards.find(
            board => board.id === boardIdFromBody
        );


        if (!board) {

            return res.status(404).json({
                message: "Board not found"
            });
        }


        // Find organization of this board
        const organization = organizations.find(
            org =>
                org.id === board.organizationId
        );


        if (!organization) {

            return res.status(404).json({
                message: "Organization not found"
            });
        }


        // Only organization admin can create issue
        if (organization.admin !== user) {

            return res.status(401).json({
                message: "Unauthorized"
            });
        }


        // Create issue
        const newIssue = {

            id: issueId++,

            title: req.body.title,

            description: req.body.description,

            boardId: boardIdFromBody,

            status: "TODO"
        };


        issues.push(newIssue);


        res.json({
            message: "Issue created successfully",
            id: newIssue.id
        });
    }
);


// ==================================================
// GET ISSUES OF A BOARD
// ==================================================

app.get(
    "/issues",
    authMiddleware,
    function (req, res) {

        const user = req.userId;

        const boardIdFromQuery = Number(
            req.query.boardId
        );


        // Find board
        const board = boards.find(
            board => board.id === boardIdFromQuery
        );


        if (!board) {

            return res.status(404).json({
                message: "Board not found"
            });
        }


        // Find organization
        const organization = organizations.find(
            org =>
                org.id === board.organizationId
        );


        if (!organization) {

            return res.status(404).json({
                message: "Organization not found"
            });
        }


        // Admin OR member can see issues
        const isMember =
            organization.admin === user ||
            organization.members.includes(user);


        if (!isMember) {

            return res.status(401).json({
                message: "Unauthorized"
            });
        }


        // Get issues belonging to board
        const boardIssues = issues.filter(
            issue =>
                issue.boardId === boardIdFromQuery
        );


        res.json({
            issues: boardIssues
        });
    }
);


// ==================================================
// GET BOARDS OF AN ORGANIZATION
// ==================================================

app.get(
    "/boards",
    authMiddleware,
    function (req, res) {

        const user = req.userId;

        const orgId = Number(
            req.query.organizationId
        );


        // Find organization
        const organization = organizations.find(
            org => org.id === orgId
        );


        if (!organization) {

            return res.status(404).json({
                message: "Organization not found"
            });
        }


        // Admin OR member can see boards
        const isMember =
            organization.admin === user ||
            organization.members.includes(user);


        if (!isMember) {

            return res.status(401).json({
                message: "Unauthorized"
            });
        }


        // Get boards belonging to organization
        const organizationBoards =
            boards.filter(
                board =>
                    board.organizationId === orgId
            );


        res.json({
            boards: organizationBoards
        });
    }
);


// ==================================================
// DELETE USER FROM ORGANIZATION
// ==================================================

app.post(
    "/delete-user-from-organisation",
    authMiddleware,
    function (req, res) {

        const user = req.userId;

        const orgId = Number(
            req.body.organizationId
        );

        const memberUsername =
            req.body.memberUsername;


        // Find organization
        const organization = organizations.find(
            org => org.id === orgId
        );


        if (!organization) {

            return res.status(404).json({
                message: "Organization not found"
            });
        }


        // Only admin can remove members
        if (organization.admin !== user) {

            return res.status(401).json({
                message: "Unauthorized"
            });
        }


        // Find member
        const memberUser = users.find(
            user =>
                user.username === memberUsername
        );


        if (!memberUser) {

            return res.status(404).json({
                message: "User not found"
            });
        }


        // Remove member
        organization.members =
            organization.members.filter(
                id => id !== memberUser.id
            );


        res.json({
            message:
                "User removed from organization successfully"
        });
    }
);


// ==================================================
// GET USER'S ORGANIZATIONS
// ==================================================

app.get(
    "/organisation",
    authMiddleware,
    function (req, res) {

        const user = req.userId;


        // Find organizations where:
        // user is admin OR user is member
        const userOrganizations =
            organizations.filter(
                organization =>
                    organization.admin === user ||
                    organization.members.includes(user)
            );


        res.json({
            organizations: userOrganizations
        });
    }
);


// ==================================================
// START SERVER
// ==================================================

app.listen(3002, function () {

    console.log(
        "Server started on port 3002"
    );
});