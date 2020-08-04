# polaris-backend

*Polaris* is a Process Orchestration Layer application for controlling process equipment assemblies (PEA) in the context of modular production in process industries. Thus, it follows the VDI/VDE/NAMUR 2658 standards.
*polaris-backend* is a NodeJs application which can be controlled via REST. Furthermore it provides recent state changes via websockets. For testing and debugging purposes, polaris-backend provides also a testserver which behaves like a PEA.

A HTML user interface for this project is provided via the [polaris-frontend](https://github.com/p2o-lab/polaris-frontend) project.

[![Build Status](https://cloud.drone.io/api/badges/p2o-lab/polaris-backend/status.svg?ref=refs/heads/develop)](https://cloud.drone.io/p2o-lab/polaris-backend "Build status")
[![MicroBadger Size](https://images.microbadger.com/badges/version/p2olab/polaris-backend.svg)](https://microbadger.com/images/p2olab/polaris-backend "Get your own image badge on microbadger.com")
[![CodeFactor](https://www.codefactor.io/repository/github/p2o-lab/polaris-backend/badge)](https://www.codefactor.io/repository/github/p2o-lab/polaris-backend)
[![codecov](https://codecov.io/gh/p2o-lab/polaris-backend/branch/develop/graph/badge.svg)](https://codecov.io/gh/p2o-lab/polaris-backend)


## Installation and Deployment
### Dependencies
All dependencies are installed via NPM
```
npm install
npm run build
```

### Start
```bash
npm start
```
or use ready binary (which should also be installed globally and in modules)
```
./bin/polaris-backend
```

Available CLI options are provided by:
```
./bin/polaris-backend -h
```


### Docker

Note: Docker Images are outdated for the new version!
Use ready docker image, which are automatically updated during drone.io integration
```
docker pull p2olab/polaris-backend
docker run -d -p 3000:3000 p2olab/polaris-backend
```

## Usage


After starting *polaris-backend* its REST interface is available under
http://localhost:3000

*polaris-backend* has several command line parameters which are documented by calling `npm start -- -h`



Its documentation is served by the application under the path **/doc** (e.g. http://localhost:3000/doc)

## Test Process Equipment Assembly
Polaris can serve a test PEA with an OPC UA server via port 4334. It has two services with some parameters and some other variables which change over time. You can start this testserver via
```
npm run testserver
```

or

```
./bin/test-pea
```

or via docker container
```
docker run -p 4334:4334 p2olab/test-pea
```

The corresponding JSON file `assets/modules/module_testserver_1.0.0.json` can be directly loaded in Polaris.
