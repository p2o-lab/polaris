# Docker Parent Image with Node and Typescript
FROM node:alpine

# Create Directory for the Container
WORKDIR /app

# Copy the ready files we need to our new Directory
ADD build /app/build
ADD apidoc /app/apidoc
ADD assets /app/assets
ADD package.json /app/
ADD package-lock.json /app/

# Grab dependencies
RUN npm install --prod

# Expose the port outside of the container
EXPOSE 3000

# Start the server
ENTRYPOINT ["node", "build/"]
CMD [""]
