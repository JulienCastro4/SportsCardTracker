# Sports Card Tracker

A web application for tracking your sports card collection. Built with React, Vite, TypeScript, Bootstrap, Auth0, and PostgreSQL.

## Features

- Track your sports card collection
- Add, edit, and delete cards
- Organize cards into collections
- Track card prices and sales
- View statistics and analytics
- User authentication with Auth0
- Responsive design with Bootstrap
- Premium subscription features

## Tech Stack

- Frontend:
  - React
  - Vite
  - TypeScript
  - Bootstrap
  - Auth0
  - Axios

- Backend:
  - Node.js
  - Express
  - PostgreSQL
  - Auth0

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- Auth0 account and configuration

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/sports-card-tracker.git
cd sports-card-tracker
```

2. Install dependencies:
```bash
npm install
cd server
npm install
```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in both root and server directories
   - Update the variables with your values

4. Set up the database:
```bash
cd server
npm run migrate
```

5. Start the development servers:
```bash
# In the server directory
npm run dev

# In the root directory
npm run dev
```

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001
VITE_AUTH0_DOMAIN=your-auth0-domain
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
```

### Backend (.env)
```
PORT=3001
DATABASE_URL=postgres://user:password@localhost:5432/mycardcollectiondb
AUTH0_DOMAIN=your-auth0-domain
AUTH0_AUDIENCE=your-auth0-audience
```

## Database Structure

The application uses PostgreSQL with the following main tables:
- `collections`: Stores user collections
- `cards`: Stores card information
- `categories`: Stores card categories
- `subscription_types`: Stores subscription plan types
- `user_subscriptions`: Stores user subscription information

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
