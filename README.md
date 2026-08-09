# Trello Backend

A simple Trello-style backend using Express and JWT authentication.

## Setup

1. Install dependencies:

   npm install

2. Start the server:

   npm start

3. The server runs on `http://localhost:3000`.

## Endpoints

- `POST /signup` - create a new user
  - Request body: `{ "username": string, "password": string }`

- `POST /signin` - sign in and receive a JWT token
  - Request body: `{ "username": string, "password": string }`
  - Response includes `{ "token": string }`

- `GET /me` - returns the authenticated user
  - Requires `Authorization: Bearer <token>`

- `POST /organization` - create a new organization
  - Request body: `{ "title": string, "description": string }`

- `GET /organizations` - list organizations for the signed-in user

- `POST /organization/:id/members` - add a member to an organization
  - Requires admin access
  - Request body: `{ "memberUsername": string }`

- `DELETE /organization/:id/members` - remove a member from an organization
  - Requires admin access
  - Request body: `{ "memberUsername": string }`

- `POST /boards` - create a board inside an organization
  - Request body: `{ "title": string, "description": string, "organizationId": number }`

- `GET /boards?organizationId=...` - list boards in an organization

- `POST /issues` - create an issue inside a board
  - Request body: `{ "title": string, "description": string, "boardId": number }`

- `GET /issues?boardId=...` - list issues for a board
