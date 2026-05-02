# Use an official Node.js runtime as the base image
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the container (and yarn.lock)
COPY package*.json yarn.lock ./

# Copy the entire db/ folder and its contents to the container
COPY db/ ./db/

# Install application dependencies
# RUN npm install # TODO/NOTE yarn is better, yarn is used by default since the beginning
# RUN yarn install --production # NOTE: this is not working
RUN yarn install

# Generate Prisma Client
RUN npx prisma generate

# Install Blitz CLI
RUN npm install -g blitz

# Copy the rest of the application code to the container
COPY . .

# Build the BlitzJS app
RUN blitz build

# Copy the 2 images used in the email templates, their URLs would be:
# http://localhost:3000/_next/static/media/sheep-dreamingsheep.png
# http://localhost:3000/_next/static/media/title-dreamingsheep.png
COPY public/assets/title-dreamingsheep.png public/assets/sheep-dreamingsheep.png ./.next/static/media/

# Expose the port your app listens on
EXPOSE 3000

# Set hostname to 0.0.0.0 to allow external connections
ENV HOSTNAME=0.0.0.0

# Start the BlitzJS app
CMD ["blitz", "start", "--hostname", "0.0.0.0"]
