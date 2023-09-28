# Stage 1: Build the app
FROM node:20-alpine as build

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json into the working directory
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy the rest of the app source code
COPY . .

RUN npm run build

# Stage 2: Create the final runtime image
FROM node:20-alpine

# Set the working directory
WORKDIR /app

# Copy the built app from the previous stage
COPY --from=build /app ./

# Start the app
ENTRYPOINT ["node", "/app/scripts/main.js"]
