# Use Ubuntu 20.04 as the base image
FROM ubuntu:20.04

# Install Node.js
RUN apt-get update && apt-get install -y \
  curl \
  && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
  && apt-get install -y nodejs

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package.json ./

# Install the Node.js dependencies
RUN npm install --no-package-lock

# Copy the rest of the code
COPY . .

# Set the environment variables (if any)
# ENV SOME_ENV_VAR=value

# Expose port 8080 (or whatever port your app runs on)
EXPOSE 8080

# Start the Node.js application
CMD [ "npm", "start" ]
